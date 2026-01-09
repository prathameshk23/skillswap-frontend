"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import { io, Socket } from "socket.io-client";
import { getAuthToken, SOCKET_URL } from "@/lib/api";

/**
 * Socket.io Events for WebRTC Signaling
 * 
 * Connection Events:
 * - session-joined: Successfully joined a session room
 * - user-joined: Another user joined the session
 * - user-left: Another user left the session
 * - ready-to-connect: Both users in session, ready to start WebRTC
 * - error: Server error occurred
 * 
 * WebRTC Signaling Events:
 * - offer: Received SDP offer from peer
 * - answer: Received SDP answer from peer
 * - ice-candidate: Received ICE candidate from peer
 * 
 * Media Events:
 * - media-state: Peer's media state changed (mute/camera)
 * 
 * Chat Events:
 * - chat-message: Received chat message from peer
 */

export interface SessionJoinedData {
  sessionId: string;
  participants: string[];
  isInitiator: boolean;
}

export interface UserJoinedData {
  userId: string;
  displayName: string;
}

export interface UserLeftData {
  userId: string;
  displayName: string;
}

export interface OfferData {
  offer: RTCSessionDescriptionInit;
  from: {
    userId: string;
    displayName: string;
  };
}

export interface AnswerData {
  answer: RTCSessionDescriptionInit;
  from: {
    userId: string;
    displayName: string;
  };
}

export interface IceCandidateData {
  candidate: RTCIceCandidateInit;
  from: {
    userId: string;
    displayName: string;
  };
}

export interface MediaStateData {
  audio: boolean;
  video: boolean;
  from: {
    userId: string;
    displayName: string;
  };
}

export interface ChatMessageData {
  message: string;
  from: {
    userId: string;
    displayName: string;
  };
  timestamp: string;
}

export interface SessionEndedData {
  sessionId: string;
  endedBy: {
    userId: string;
    displayName: string;
  };
}

export interface UseSocketOptions {
  onSessionJoined?: (data: SessionJoinedData) => void;
  onUserJoined?: (data: UserJoinedData) => void;
  onUserLeft?: (data: UserLeftData) => void;
  onReadyToConnect?: (data: { sessionId: string; participants: string[] }) => void;
  onOffer?: (data: OfferData) => void;
  onAnswer?: (data: AnswerData) => void;
  onIceCandidate?: (data: IceCandidateData) => void;
  onMediaState?: (data: MediaStateData) => void;
  onChatMessage?: (data: ChatMessageData) => void;
  onSessionEnded?: (data: SessionEndedData) => void;
  onError?: (error: { message: string }) => void;
  onDisconnect?: () => void;
  onConnect?: () => void;
}

export function useSocket(options: UseSocketOptions = {}) {
  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);

  // Initialize socket connection with JWT authentication
  const connect = useCallback(() => {
    const token = getAuthToken();
    
    if (!token) {
      setConnectionError("No authentication token available");
      return;
    }

    // Disconnect existing socket if any
    if (socketRef.current) {
      socketRef.current.disconnect();
    }

    // Create new socket connection with JWT auth
    const socket = io(SOCKET_URL, {
      auth: { token },
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    // Connection events
    socket.on("connect", () => {
      console.log("🔌 Socket connected:", socket.id);
      setIsConnected(true);
      setConnectionError(null);
      options.onConnect?.();
    });

    socket.on("disconnect", (reason) => {
      console.log("🔌 Socket disconnected:", reason);
      setIsConnected(false);
      options.onDisconnect?.();
    });

    socket.on("connect_error", (error) => {
      console.error("🔌 Socket connection error:", error.message);
      setConnectionError(error.message);
      setIsConnected(false);
    });

    // Session events
    socket.on("session-joined", (data: SessionJoinedData) => {
      console.log("👥 Session joined:", data);
      options.onSessionJoined?.(data);
    });

    socket.on("user-joined", (data: UserJoinedData) => {
      console.log("👋 User joined:", data);
      options.onUserJoined?.(data);
    });

    socket.on("user-left", (data: UserLeftData) => {
      console.log("👋 User left:", data);
      options.onUserLeft?.(data);
    });

    socket.on("ready-to-connect", (data) => {
      console.log("🚀 Ready to connect:", data);
      options.onReadyToConnect?.(data);
    });

    // WebRTC signaling events
    socket.on("offer", (data: OfferData) => {
      console.log("📨 Received offer from:", data.from.displayName);
      options.onOffer?.(data);
    });

    socket.on("answer", (data: AnswerData) => {
      console.log("📨 Received answer from:", data.from.displayName);
      options.onAnswer?.(data);
    });

    socket.on("ice-candidate", (data: IceCandidateData) => {
      console.log("🧊 Received ICE candidate from:", data.from.displayName);
      options.onIceCandidate?.(data);
    });

    // Media state events
    socket.on("media-state", (data: MediaStateData) => {
      console.log("🎬 Media state change from:", data.from.displayName, data);
      options.onMediaState?.(data);
    });

    // Chat events
    socket.on("chat-message", (data: ChatMessageData) => {
      console.log("💬 Chat message from:", data.from.displayName);
      options.onChatMessage?.(data);
    });

    // Session ended event - when the other party ends the call
    socket.on("session-ended", (data: SessionEndedData) => {
      console.log("🛑 Session ended by:", data.endedBy.displayName);
      options.onSessionEnded?.(data);
    });

    // Error events
    socket.on("error", (error: { message: string }) => {
      console.error("❌ Socket error:", error.message);
      setConnectionError(error.message);
      options.onError?.(error);
    });

    socketRef.current = socket;
  }, [options]);

  // Disconnect socket
  const disconnect = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
      setIsConnected(false);
    }
  }, []);

  // Join a session room
  const joinSession = useCallback((sessionId: string) => {
    if (socketRef.current) {
      // Important: do NOT gate on isConnected.
      // socket.io-client will buffer emits until the connection is established.
      console.log("📤 Joining session:", sessionId);
      socketRef.current.emit("join-session", sessionId);
    }
  }, []);

  // Leave a session room
  const leaveSession = useCallback((sessionId: string) => {
    if (socketRef.current) {
      console.log("📤 Leaving session:", sessionId);
      socketRef.current.emit("leave-session", sessionId);
    }
  }, []);

  // End session - notify peer that you're ending the call
  const endSessionCall = useCallback((sessionId: string) => {
    if (socketRef.current) {
      console.log("📤 Ending session:", sessionId);
      socketRef.current.emit("end-session", sessionId);
    }
  }, []);

  // Send WebRTC offer
  const sendOffer = useCallback((sessionId: string, offer: RTCSessionDescriptionInit) => {
    if (socketRef.current) {
      console.log("📤 Sending offer");
      socketRef.current.emit("offer", { sessionId, offer });
    }
  }, []);

  // Send WebRTC answer
  const sendAnswer = useCallback((sessionId: string, answer: RTCSessionDescriptionInit) => {
    if (socketRef.current) {
      console.log("📤 Sending answer");
      socketRef.current.emit("answer", { sessionId, answer });
    }
  }, []);

  // Send ICE candidate
  const sendIceCandidate = useCallback((sessionId: string, candidate: RTCIceCandidateInit) => {
    if (socketRef.current) {
      console.log("📤 Sending ICE candidate");
      socketRef.current.emit("ice-candidate", { sessionId, candidate });
    }
  }, []);

  // Send media state (mute/camera status)
  const sendMediaState = useCallback((sessionId: string, audio: boolean, video: boolean) => {
    if (socketRef.current) {
      console.log("📤 Sending media state:", { audio, video });
      socketRef.current.emit("media-state", { sessionId, audio, video });
    }
  }, []);

  // Send chat message
  const sendChatMessage = useCallback((sessionId: string, message: string) => {
    if (socketRef.current) {
      socketRef.current.emit("chat-message", { sessionId, message });
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  return {
    isConnected,
    connectionError,
    connect,
    disconnect,
    joinSession,
    leaveSession,
    endSessionCall,
    sendOffer,
    sendAnswer,
    sendIceCandidate,
    sendMediaState,
    sendChatMessage,
  };
}
