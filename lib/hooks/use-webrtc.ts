"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import {
  useSocket,
  OfferData,
  AnswerData,
  IceCandidateData,
  MediaStateData,
  SessionEndedData,
  ChatMessageData,
} from "./use-socket";

/**
 * WebRTC Hook for Video Calls
 * 
 * This hook handles the complete WebRTC flow:
 * 1. Get user media (camera/microphone)
 * 2. Create RTCPeerConnection
 * 3. Handle SDP offer/answer exchange via Socket.io signaling
 * 4. Handle ICE candidate exchange
 * 5. Establish peer-to-peer video/audio connection
 * 
 * Architecture:
 * - Frontend handles all WebRTC media logic
 * - Backend only relays signaling messages (SDP offers/answers, ICE candidates)
 * - NO video/audio data passes through the server
 * 
 * WebRTC Flow:
 * ┌─────────────┐                    ┌─────────────┐                    ┌─────────────┐
 * │   User A    │                    │   Server    │                    │   User B    │
 * │ (Initiator) │                    │ (Signaling) │                    │ (Receiver)  │
 * └─────────────┘                    └─────────────┘                    └─────────────┘
 *       │                                  │                                  │
 *       │──── join-session ───────────────>│                                  │
 *       │                                  │<───── join-session ──────────────│
 *       │<─── ready-to-connect ────────────│─── ready-to-connect ────────────>│
 *       │                                  │                                  │
 *       │ createOffer()                    │                                  │
 *       │ setLocalDescription(offer)       │                                  │
 *       │──── offer ──────────────────────>│──── offer ──────────────────────>│
 *       │                                  │        setRemoteDescription(offer)
 *       │                                  │        createAnswer()
 *       │                                  │        setLocalDescription(answer)
 *       │<─── answer ─────────────────────│<─── answer ──────────────────────│
 *       │ setRemoteDescription(answer)     │                                  │
 *       │                                  │                                  │
 *       │──── ice-candidate ──────────────>│──── ice-candidate ──────────────>│
 *       │<─── ice-candidate ──────────────│<─── ice-candidate ───────────────│
 *       │                                  │                                  │
 *       │<════════════ P2P Video/Audio Connection Established ══════════════>│
 */

// ICE servers configuration for NAT traversal
const ICE_SERVERS: RTCConfiguration = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
    { urls: "stun:stun2.l.google.com:19302" },
    { urls: "stun:stun3.l.google.com:19302" },
    { urls: "stun:stun4.l.google.com:19302" },
  ],
};

export interface WebRTCState {
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  isAudioEnabled: boolean;
  isVideoEnabled: boolean;
  isScreenSharing: boolean;
  connectionState: RTCPeerConnectionState | "new";
  isInitiator: boolean;
  peerDisplayName: string | null;
  peerMediaState: { audio: boolean; video: boolean } | null;
}

export interface UseWebRTCOptions {
  sessionId: string;
  onConnectionStateChange?: (state: RTCPeerConnectionState) => void;
  onError?: (error: string) => void;
  onSessionEnded?: (endedBy: string) => void; // Called when the other party ends the session
  selfDisplayName?: string;
}

export interface ChatMessage {
  id: string;
  message: string;
  from: string;
  timestamp: string;
  isSelf: boolean;
}

export function useWebRTC({ sessionId, onConnectionStateChange, onError, onSessionEnded, selfDisplayName }: UseWebRTCOptions) {
  // State
  const [state, setState] = useState<WebRTCState>({
    localStream: null,
    remoteStream: null,
    isAudioEnabled: true,
    isVideoEnabled: true,
    isScreenSharing: false,
    connectionState: "new",
    isInitiator: false,
    peerDisplayName: null,
    peerMediaState: null,
  });

  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);

  // Refs
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const cameraStreamRef = useRef<MediaStream | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const isInitiatorRef = useRef(false);
  const iceCandidatesQueueRef = useRef<RTCIceCandidateInit[]>([]);
  const hasRemoteDescriptionRef = useRef(false);
  const socketRef = useRef<ReturnType<typeof useSocket> | null>(null);

  const mediaEnabledRef = useRef({ audio: true, video: true });
  useEffect(() => {
    mediaEnabledRef.current = { audio: state.isAudioEnabled, video: state.isVideoEnabled };
  }, [state.isAudioEnabled, state.isVideoEnabled]);
  
  // Store sessionId in ref for use in callbacks
  const sessionIdRef = useRef(sessionId);
  useEffect(() => {
    sessionIdRef.current = sessionId;
  }, [sessionId]);

  // Socket handlers for WebRTC signaling
  const handleOffer = useCallback(async (data: OfferData) => {
    console.log("🎬 Handling incoming offer");
    
    try {
      const pc = peerConnectionRef.current;
      if (!pc) {
        console.error("No peer connection available");
        return;
      }

      // Set remote description (the offer)
      await pc.setRemoteDescription(new RTCSessionDescription(data.offer));
      hasRemoteDescriptionRef.current = true;
      
      // Process queued ICE candidates
      console.log(`Processing ${iceCandidatesQueueRef.current.length} queued ICE candidates`);
      for (const candidate of iceCandidatesQueueRef.current) {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      }
      iceCandidatesQueueRef.current = [];

      // Create and send answer
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      
      console.log("📤 Sending answer");
      socket.sendAnswer(sessionId, answer);

      setState(prev => ({
        ...prev,
        peerDisplayName: data.from.displayName,
      }));
    } catch (error) {
      console.error("Error handling offer:", error);
      onError?.("Failed to handle incoming call");
    }
  }, [sessionId, onError]);

  const handleAnswer = useCallback(async (data: AnswerData) => {
    console.log("🎬 Handling incoming answer");
    
    try {
      const pc = peerConnectionRef.current;
      if (!pc) {
        console.error("No peer connection available");
        return;
      }

      await pc.setRemoteDescription(new RTCSessionDescription(data.answer));
      hasRemoteDescriptionRef.current = true;

      // Process queued ICE candidates
      console.log(`Processing ${iceCandidatesQueueRef.current.length} queued ICE candidates`);
      for (const candidate of iceCandidatesQueueRef.current) {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      }
      iceCandidatesQueueRef.current = [];

      setState(prev => ({
        ...prev,
        peerDisplayName: data.from.displayName,
      }));
    } catch (error) {
      console.error("Error handling answer:", error);
      onError?.("Failed to establish connection");
    }
  }, [onError]);

  const handleIceCandidate = useCallback(async (data: IceCandidateData) => {
    console.log("🧊 Handling incoming ICE candidate");
    
    try {
      const pc = peerConnectionRef.current;
      if (!pc) {
        console.error("No peer connection available");
        return;
      }

      // Queue ICE candidates if remote description is not set yet
      if (!hasRemoteDescriptionRef.current) {
        console.log("Queueing ICE candidate (no remote description yet)");
        iceCandidatesQueueRef.current.push(data.candidate);
        return;
      }

      await pc.addIceCandidate(new RTCIceCandidate(data.candidate));
    } catch (error) {
      console.error("Error adding ICE candidate:", error);
    }
  }, []);

  const handleMediaState = useCallback((data: MediaStateData) => {
    setState(prev => ({
      ...prev,
      peerMediaState: { audio: data.audio, video: data.video },
    }));
  }, []);

  const handleChatMessage = useCallback((data: ChatMessageData) => {
    setChatMessages((prev) => [
      ...prev,
      {
        id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
        message: data.message,
        from: data.from.displayName,
        timestamp: data.timestamp,
        isSelf: false,
      },
    ]);
  }, []);

  const handleReadyToConnect = useCallback(async () => {
    console.log("🚀 Ready to connect, isInitiator:", isInitiatorRef.current);
    
    if (isInitiatorRef.current) {
      // Only initiator creates the offer
      await createOffer();
    }
  }, []);

  const handleUserLeft = useCallback(() => {
    console.log("👋 Peer left the session");
    
    // Close peer connection
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }

    setState(prev => ({
      ...prev,
      remoteStream: null,
      connectionState: "new",
      peerDisplayName: null,
      peerMediaState: null,
    }));
  }, []);

  // Handle when the other party ends the session
  const handleSessionEnded = useCallback((data: SessionEndedData) => {
    console.log("🛑 Session ended by:", data.endedBy.displayName);
    
    // Close peer connection
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }

    // Stop local media tracks
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach((track) => track.stop());
      screenStreamRef.current = null;
    }

    if (cameraStreamRef.current) {
      cameraStreamRef.current.getTracks().forEach((track) => track.stop());
      cameraStreamRef.current = null;
    }

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
      localStreamRef.current = null;
    }

    // Reset state
    hasRemoteDescriptionRef.current = false;
    iceCandidatesQueueRef.current = [];
    
    setState({
      localStream: null,
      remoteStream: null,
      isAudioEnabled: true,
      isVideoEnabled: true,
      isScreenSharing: false,
      connectionState: "new",
      isInitiator: false,
      peerDisplayName: null,
      peerMediaState: null,
    });

    // Notify the component
    onSessionEnded?.(data.endedBy.displayName);
  }, [onSessionEnded]);

  // Handle when another user joins - initiator should create offer
  const handleUserJoined = useCallback(async (data: { userId: string; displayName: string }) => {
    console.log("👋 User joined, I am initiator:", isInitiatorRef.current);
    
    // If I'm the initiator (first person), create an offer when someone joins
    if (isInitiatorRef.current && peerConnectionRef.current) {
      console.log("🚀 Creating offer for newly joined user");
      // Small delay to ensure the other peer is ready
      setTimeout(async () => {
        try {
          const pc = peerConnectionRef.current;
          if (!pc) return;
          
          const offer = await pc.createOffer({
            offerToReceiveAudio: true,
            offerToReceiveVideo: true,
          });
          
          await pc.setLocalDescription(offer);
          socketRef.current?.sendOffer(sessionIdRef.current, offer);
        } catch (error) {
          console.error("Error creating offer for joined user:", error);
        }
      }, 500);
    }
    
    setState(prev => ({
      ...prev,
      peerDisplayName: data.displayName,
    }));
  }, []);

  // Initialize socket connection
  const socket = useSocket({
    onSessionJoined: (data) => {
      console.log("✅ Joined session:", data.sessionId, "isInitiator:", data.isInitiator);
      isInitiatorRef.current = data.isInitiator;
      setState(prev => ({ ...prev, isInitiator: data.isInitiator }));
    },
    onUserJoined: handleUserJoined,
    onReadyToConnect: handleReadyToConnect,
    onOffer: handleOffer,
    onAnswer: handleAnswer,
    onIceCandidate: handleIceCandidate,
    onMediaState: handleMediaState,
    onChatMessage: handleChatMessage,
    onUserLeft: handleUserLeft,
    onSessionEnded: handleSessionEnded,
    onError: (error) => onError?.(error.message),
  });

  const sendChatMessage = useCallback(
    (message: string) => {
      const trimmed = message.trim();
      if (!trimmed) return;

      const timestamp = new Date().toISOString();
      setChatMessages((prev) => [
        ...prev,
        {
          id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
          message: trimmed,
          from: selfDisplayName || "You",
          timestamp,
          isSelf: true,
        },
      ]);

      socket.sendChatMessage(sessionId, trimmed);
    },
    [sessionId, socket, selfDisplayName]
  );
  
  // Store socket reference for use in callbacks
  useEffect(() => {
    socketRef.current = socket;
  }, [socket]);

  // Create RTCPeerConnection
  const createPeerConnection = useCallback(() => {
    console.log("🔧 Creating RTCPeerConnection");
    
    const pc = new RTCPeerConnection(ICE_SERVERS);

    // Handle ICE candidates
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        console.log("📤 Sending ICE candidate");
        socket.sendIceCandidate(sessionId, event.candidate.toJSON());
      }
    };

    // Handle connection state changes
    pc.onconnectionstatechange = () => {
      console.log("🔌 Connection state:", pc.connectionState);
      setState(prev => ({ ...prev, connectionState: pc.connectionState }));
      onConnectionStateChange?.(pc.connectionState);
    };

    // Handle ICE connection state
    pc.oniceconnectionstatechange = () => {
      console.log("🧊 ICE connection state:", pc.iceConnectionState);
    };

    // Handle incoming tracks (remote stream)
    pc.ontrack = (event) => {
      console.log("📹 Received remote track:", event.track.kind);
      
      if (event.streams && event.streams[0]) {
        setState(prev => ({ ...prev, remoteStream: event.streams[0] }));
      }
    };

    // Add local tracks to peer connection
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => {
        console.log("➕ Adding local track:", track.kind);
        pc.addTrack(track, localStreamRef.current!);
      });
    }

    peerConnectionRef.current = pc;
    return pc;
  }, [sessionId, socket, onConnectionStateChange]);

  // Create and send offer (initiator only)
  const createOffer = useCallback(async () => {
    console.log("📤 Creating offer");
    
    try {
      let pc = peerConnectionRef.current;
      if (!pc) {
        pc = createPeerConnection();
      }

      const offer = await pc.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: true,
      });
      
      await pc.setLocalDescription(offer);
      socket.sendOffer(sessionId, offer);
    } catch (error) {
      console.error("Error creating offer:", error);
      onError?.("Failed to start call");
    }
  }, [sessionId, socket, createPeerConnection, onError]);

  // Initialize media (get camera/microphone access)
  const initializeMedia = useCallback(async () => {
    console.log("📹 Initializing media");
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: "user",
        },
      });

      cameraStreamRef.current = stream;
      localStreamRef.current = stream;
      setState(prev => ({
        ...prev,
        localStream: stream,
        isAudioEnabled: true,
        isVideoEnabled: true,
        isScreenSharing: false,
      }));

      console.log("✅ Media initialized successfully");
      return stream;
    } catch (error) {
      console.error("Error accessing media devices:", error);
      onError?.("Failed to access camera/microphone. Please check permissions.");
      throw error;
    }
  }, [onError]);

  const getVideoSender = useCallback((): RTCRtpSender | null => {
    const pc = peerConnectionRef.current;
    if (!pc) return null;
    return pc.getSenders().find((s) => s.track?.kind === "video") || null;
  }, []);

  const setLocalPreviewStream = useCallback((videoTrack: MediaStreamTrack | null) => {
    const audioTrack = cameraStreamRef.current?.getAudioTracks()[0] || null;
    const tracks: MediaStreamTrack[] = [];
    if (audioTrack) tracks.push(audioTrack);
    if (videoTrack) tracks.push(videoTrack);

    // Apply current enable/disable state to the tracks
    if (audioTrack) audioTrack.enabled = mediaEnabledRef.current.audio;
    if (videoTrack) videoTrack.enabled = mediaEnabledRef.current.video;

    const previewStream = new MediaStream(tracks);
    localStreamRef.current = previewStream;
    setState((prev) => ({ ...prev, localStream: previewStream }));
  }, []);

  const stopScreenShare = useCallback(async () => {
    if (!state.isScreenSharing) return;

    const cameraVideoTrack = cameraStreamRef.current?.getVideoTracks()[0] || null;

    // Always stop the screen stream if it exists.
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach((t) => t.stop());
      screenStreamRef.current = null;
    }

    if (!cameraVideoTrack) {
      setState((prev) => ({ ...prev, isScreenSharing: false }));
      return;
    }

    try {
      const sender = getVideoSender();
      if (sender) {
        await sender.replaceTrack(cameraVideoTrack);
      }
    } catch (error) {
      console.error("Error restoring camera track:", error);
    } finally {
      setLocalPreviewStream(cameraVideoTrack);
      setState((prev) => ({ ...prev, isScreenSharing: false }));
    }
  }, [getVideoSender, setLocalPreviewStream, state.isScreenSharing]);

  const toggleScreenShare = useCallback(async () => {
    if (state.isScreenSharing) {
      await stopScreenShare();
      return;
    }

    try {
      if (typeof window !== "undefined" && !window.isSecureContext) {
        onError?.("Screen sharing requires HTTPS (or localhost). Open the app on https:// or http://localhost.");
        return;
      }

      if (!navigator.mediaDevices?.getDisplayMedia) {
        onError?.("Screen sharing is not supported in this browser.");
        return;
      }

      if (!cameraStreamRef.current) {
        await initializeMedia();
      }

      const screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: false,
      });

      const screenVideoTrack = screenStream.getVideoTracks()[0] || null;
      if (!screenVideoTrack) {
        screenStream.getTracks().forEach((t) => t.stop());
        onError?.("Failed to start screen sharing");
        return;
      }

      screenStreamRef.current = screenStream;
      screenVideoTrack.onended = () => {
        stopScreenShare();
      };

      const sender = getVideoSender();
      if (!sender) {
        // No active peer connection yet.
        screenStream.getTracks().forEach((t) => t.stop());
        screenStreamRef.current = null;
        onError?.("Start the call first, then try screen sharing.");
        return;
      }

      await sender.replaceTrack(screenVideoTrack);
      setLocalPreviewStream(screenVideoTrack);
      setState((prev) => ({ ...prev, isScreenSharing: true }));
    } catch (error) {
      console.error("Error toggling screen share:", error);
      const message =
        error instanceof DOMException && error.name === "NotAllowedError"
          ? "Screen sharing was blocked. Please allow the permission and try again."
          : "Failed to start screen sharing";
      onError?.(message);
    }
  }, [getVideoSender, initializeMedia, onError, setLocalPreviewStream, state.isScreenSharing, stopScreenShare]);

  // Start the WebRTC session
  const startSession = useCallback(async () => {
    console.log("🚀 Starting WebRTC session");
    
    try {
      // 1. Initialize media
      await initializeMedia();
      
      // 2. Create peer connection
      createPeerConnection();
      
      // 3. Connect to signaling server
      socket.connect();

      // 4. Join the session room.
      // Do NOT poll `socket.isConnected` here; it's a React state value and can be stale
      // inside this closure. socket.io-client will buffer emits until connected.
      console.log("📤 Requesting join-session:", sessionId);
      socket.joinSession(sessionId);

      // One retry for robustness (hot reload / transient connect delays).
      setTimeout(() => {
        console.log("📤 Re-requesting join-session (retry):", sessionId);
        socket.joinSession(sessionId);
      }, 700);
    } catch (error) {
      console.error("Error starting session:", error);
      onError?.("Failed to start video session");
    }
  }, [sessionId, socket, initializeMedia, createPeerConnection, onError]);

  // End the session
  const endSession = useCallback(() => {
    console.log("🛑 Ending WebRTC session");
    
    // Stop local media tracks
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach((track) => track.stop());
      screenStreamRef.current = null;
    }

    if (cameraStreamRef.current) {
      cameraStreamRef.current.getTracks().forEach((track) => track.stop());
      cameraStreamRef.current = null;
    }

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
      localStreamRef.current = null;
    }

    // Close peer connection
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }

    // Notify peer that session ended, then leave and disconnect
    socket.endSessionCall(sessionId);
    socket.leaveSession(sessionId);
    socket.disconnect();

    // Reset state
    hasRemoteDescriptionRef.current = false;
    iceCandidatesQueueRef.current = [];
    
    setState({
      localStream: null,
      remoteStream: null,
      isAudioEnabled: true,
      isVideoEnabled: true,
      isScreenSharing: false,
      connectionState: "new",
      isInitiator: false,
      peerDisplayName: null,
      peerMediaState: null,
    });
  }, [sessionId, socket]);

  // Toggle audio (mute/unmute)
  const toggleAudio = useCallback(() => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        const newState = audioTrack.enabled;
        
        setState(prev => ({ ...prev, isAudioEnabled: newState }));
        socket.sendMediaState(sessionId, newState, state.isVideoEnabled);
        
        console.log("🎤 Audio:", newState ? "unmuted" : "muted");
      }
    }
  }, [sessionId, socket, state.isVideoEnabled]);

  // Toggle video (camera on/off)
  const toggleVideo = useCallback(() => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        const newState = videoTrack.enabled;
        
        setState(prev => ({ ...prev, isVideoEnabled: newState }));
        socket.sendMediaState(sessionId, state.isAudioEnabled, newState);
        
        console.log("📹 Video:", newState ? "on" : "off");
      }
    }
  }, [sessionId, socket, state.isAudioEnabled]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      endSession();
    };
  }, []);

  return {
    // State
    localStream: state.localStream,
    remoteStream: state.remoteStream,
    isAudioEnabled: state.isAudioEnabled,
    isVideoEnabled: state.isVideoEnabled,
    isScreenSharing: state.isScreenSharing,
    connectionState: state.connectionState,
    isInitiator: state.isInitiator,
    peerDisplayName: state.peerDisplayName,
    peerMediaState: state.peerMediaState,
    isConnected: socket.isConnected,
    connectionError: socket.connectionError,

    chatMessages,
    sendChatMessage,
    
    // Actions
    startSession,
    endSession,
    toggleAudio,
    toggleVideo,
    toggleScreenShare,
  };
}
