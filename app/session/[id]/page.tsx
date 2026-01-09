"use client";

import { useParams, useRouter } from "next/navigation";
import { useState, useEffect, useRef, useCallback } from "react";
import { Navbar } from "@/components/navbar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Video, VideoOff, Mic, MicOff, PhoneOff, Loader2, AlertCircle, Monitor } from "lucide-react";
import { useWebRTC } from "@/lib/hooks/use-webrtc";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";

/**
 * Video Session Page
 * 
 * This page handles 1-to-1 video calls using WebRTC.
 * 
 * Architecture:
 * - WebRTC handles peer-to-peer video/audio
 * - Socket.io handles signaling only (offers, answers, ICE candidates)
 * - No video/audio data passes through the server
 * 
 * Flow:
 * 1. User opens this page
 * 2. Page verifies user is authorized for this session
 * 3. User clicks "Start Call" to begin
 * 4. Camera/microphone permissions requested
 * 5. Socket connection established
 * 6. When both users join, WebRTC negotiation begins
 * 7. Peer-to-peer connection established
 * 8. Video call active
 */

interface SessionData {
  id: string;
  skillTitle: string;
  providerId: string;
  providerName: string;
  requesterId: string;
  requesterName: string;
  status: string;
  scheduledFor?: string | null;
}

export default function SessionPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const sessionId = params.id as string;
  
  // Session data
  const [session, setSession] = useState<SessionData | null>(null);
  const [isLoadingSession, setIsLoadingSession] = useState(true);
  const [sessionError, setSessionError] = useState<string | null>(null);
  const [hasStarted, setHasStarted] = useState(false);
  const [sessionEndedBy, setSessionEndedBy] = useState<string | null>(null);
  const [chatText, setChatText] = useState("");

  // Video refs
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);

  // Handle when the other party ends the session
  const handleSessionEnded = useCallback((endedBy: string) => {
    setSessionEndedBy(endedBy);
  }, []);

  // WebRTC hook
  const {
    localStream,
    remoteStream,
    isAudioEnabled,
    isVideoEnabled,
    isScreenSharing,
    connectionState,
    peerDisplayName,
    peerMediaState,
    isConnected,
    connectionError,
    startSession: startWebRTC,
    endSession: endWebRTC,
    toggleAudio,
    toggleVideo,
    toggleScreenShare,
    chatMessages,
    sendChatMessage,
  } = useWebRTC({
    sessionId,
    onConnectionStateChange: (state) => {
      console.log("Connection state changed:", state);
    },
    onError: (error) => {
      console.error("WebRTC error:", error);
      setSessionError(error);
    },
    onSessionEnded: handleSessionEnded,
    selfDisplayName: user?.displayName || "You",
  });

  const handleSendChat = useCallback(() => {
    if (!chatText.trim()) return;
    sendChatMessage(chatText);
    setChatText("");
  }, [chatText, sendChatMessage]);

  // Fetch session data
  useEffect(() => {
    const fetchSession = async () => {
      try {
        setIsLoadingSession(true);
        const data = await api.getSession(sessionId);
        setSession(data);
        
        // Verify user is a participant
        if (user && data.providerId !== user.uid && data.requesterId !== user.uid) {
          setSessionError("You are not authorized to join this session");
        }
      } catch (error: any) {
        console.error("Failed to fetch session:", error);
        const message = error instanceof Error ? error.message : "Failed to load session";
        setSessionError(message);
      } finally {
        setIsLoadingSession(false);
      }
    };

    if (sessionId && user) {
      fetchSession();
    }
  }, [sessionId, user]);

  // Attach streams to video elements
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

  // Start the video call
  const handleStartCall = useCallback(async () => {
    try {
      if (session?.scheduledFor) {
        const scheduledTime = new Date(session.scheduledFor).getTime();
        if (Date.now() < scheduledTime) {
          setSessionError(`This session is scheduled for ${new Date(session.scheduledFor).toLocaleString()}`);
          return;
        }
      }

      // Only mark session as started if it's not already in progress
      // This allows the second user to join without error
      if (session?.status === 'scheduled') {
        await api.startSession(sessionId);
      }
      
      // Start WebRTC
      await startWebRTC();
      setHasStarted(true);
    } catch (error: any) {
      console.error("Failed to start call:", error);
      const message = error instanceof Error ? error.message : "Failed to start call";
      setSessionError(message);
    }
  }, [sessionId, startWebRTC, session?.scheduledFor, session?.status]);

  // End the session
  const handleEndSession = useCallback(async () => {
    if (confirm("Are you sure you want to end this session?")) {
      try {
        // End WebRTC
        endWebRTC();
        
        // Mark session as ended in backend
        await api.endSession(sessionId);
        
        // Redirect to dashboard
        router.push("/requests");
      } catch (error) {
        console.error("Failed to end session:", error);
        router.push("/requests");
      }
    }
  }, [sessionId, endWebRTC, router]);

  // Get other participant's name
  const getOtherParticipantName = () => {
    if (!session || !user) return "Participant";
    return session.providerId === user.uid ? session.requesterName : session.providerName;
  };

  // Get connection status display
  const getConnectionStatus = () => {
    if (!hasStarted) return null;
    
    switch (connectionState) {
      case "connecting":
        return (
          <div className="flex items-center gap-2 text-yellow-400">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Connecting...</span>
          </div>
        );
      case "connected":
        return (
          <div className="flex items-center gap-2 text-green-400">
            <div className="h-2 w-2 rounded-full bg-green-400 animate-pulse" />
            <span>Connected</span>
          </div>
        );
      case "disconnected":
      case "failed":
        return (
          <div className="flex items-center gap-2 text-red-400">
            <AlertCircle className="h-4 w-4" />
            <span>Connection {connectionState}</span>
          </div>
        );
      default:
        return (
          <div className="text-gray-400">
            Waiting for peer to join...
          </div>
        );
    }
  };

  // Loading state
  if (isLoadingSession) {
    return (
      <div className="min-h-screen bg-gray-900">
        <Navbar />
        <main className="flex items-center justify-center h-[calc(100vh-64px)]">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin text-white mx-auto mb-4" />
            <p className="text-gray-400">Loading session...</p>
          </div>
        </main>
      </div>
    );
  }

  // Session ended by other party
  if (sessionEndedBy) {
    return (
      <div className="min-h-screen bg-gray-900">
        <Navbar />
        <main className="flex items-center justify-center h-[calc(100vh-64px)]">
          <Card className="bg-gray-800 border-gray-700 p-8 max-w-md">
            <div className="text-center">
              <PhoneOff className="h-12 w-12 text-yellow-400 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-white mb-2">Session Ended</h2>
              <p className="text-gray-400 mb-6">{sessionEndedBy} has ended the session.</p>
              <Button onClick={() => router.push("/requests")} className="bg-blue-600 hover:bg-blue-700">
                Back to Requests
              </Button>
            </div>
          </Card>
        </main>
      </div>
    );
  }

  // Error state
  if (sessionError && !hasStarted) {
    return (
      <div className="min-h-screen bg-gray-900">
        <Navbar />
        <main className="flex items-center justify-center h-[calc(100vh-64px)]">
          <Card className="bg-red-900/20 border-red-500 p-8 max-w-md">
            <div className="text-center">
              <AlertCircle className="h-12 w-12 text-red-400 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-white mb-2">Session Error</h2>
              <p className="text-red-400 mb-6">{sessionError}</p>
              <Button onClick={() => router.push("/requests")} variant="outline">
                Back to Requests
              </Button>
            </div>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900">
      <Navbar />
      
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="space-y-6">
          {/* Session Info */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-white">
                {session?.skillTitle || "Video Session"}
              </h1>
              <p className="text-sm text-gray-400 mt-1">
                with {getOtherParticipantName()}
              </p>
            </div>
            <div className="text-sm">
              {getConnectionStatus()}
            </div>
          </div>

          {/* Pre-call screen */}
          {!hasStarted && (
            <Card className="bg-gray-800 border-gray-700 p-8">
              <div className="text-center">
                <Video className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <h2 className="text-xl font-semibold text-white mb-2">
                  {session?.status === 'in-progress' ? 'Call in Progress' : 'Ready to start?'}
                </h2>
                <p className="text-gray-400 mb-6 max-w-md mx-auto">
                  {session?.status === 'in-progress' 
                    ? 'The other participant has already joined. Click below to join the call.'
                    : 'Click the button below to start the video call. Make sure you allow camera and microphone access when prompted.'}
                </p>
                {session?.scheduledFor && (
                  <p className="text-sm text-gray-300 mb-4">
                    Scheduled for: {new Date(session.scheduledFor).toLocaleString()}
                  </p>
                )}
                <Button
                  size="lg"
                  onClick={handleStartCall}
                  className="bg-green-600 hover:bg-green-700"
                  disabled={
                    Boolean(session?.scheduledFor) &&
                    Date.now() < new Date(session?.scheduledFor || 0).getTime()
                  }
                >
                  <Video className="h-5 w-5 mr-2" />
                  {session?.status === 'in-progress' ? 'Join Call' : 'Start Call'}
                </Button>
              </div>
            </Card>
          )}

          {/* Video Grid - only show after starting */}
          {hasStarted && (
            <>
              <div className="grid gap-4 lg:grid-cols-2">
                {/* Remote Video */}
                <Card className="relative aspect-video overflow-hidden bg-gray-800 border-gray-700">
                  {remoteStream ? (
                    <video
                      ref={remoteVideoRef}
                      autoPlay
                      playsInline
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center">
                      <div className="text-center">
                        <div className="mx-auto mb-4 flex h-24 w-24 items-center justify-center rounded-full bg-gray-700 text-4xl font-bold text-white">
                          {(peerDisplayName || getOtherParticipantName())[0]?.toUpperCase() || "?"}
                        </div>
                        <p className="text-gray-400">
                          {peerDisplayName || getOtherParticipantName()}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          Waiting to connect...
                        </p>
                      </div>
                    </div>
                  )}
                  <div className="absolute bottom-4 left-4">
                    <span className="rounded-full bg-black/50 px-3 py-1 text-sm text-white">
                      {peerDisplayName || getOtherParticipantName()}
                    </span>
                  </div>
                  {/* Peer media indicators */}
                  {peerMediaState && (
                    <div className="absolute top-4 right-4 flex gap-2">
                      {!peerMediaState.audio && (
                        <div className="rounded-full bg-red-500/80 p-2">
                          <MicOff className="h-4 w-4 text-white" />
                        </div>
                      )}
                      {!peerMediaState.video && (
                        <div className="rounded-full bg-red-500/80 p-2">
                          <VideoOff className="h-4 w-4 text-white" />
                        </div>
                      )}
                    </div>
                  )}
                </Card>

                {/* Local Video */}
                <Card className="relative aspect-video overflow-hidden bg-gray-800 border-gray-700">
                  {localStream ? (
                    <video
                      ref={localVideoRef}
                      autoPlay
                      playsInline
                      muted // Mute local video to prevent echo
                      className={`h-full w-full object-cover ${!isVideoEnabled ? 'hidden' : ''}`}
                    />
                  ) : null}
                  {(!localStream || !isVideoEnabled) && (
                    <div className="flex h-full items-center justify-center absolute inset-0">
                      <div className="text-center">
                        <div className="mx-auto mb-4 flex h-24 w-24 items-center justify-center rounded-full bg-gray-700 text-4xl font-bold text-white">
                          {user?.displayName?.[0]?.toUpperCase() || "Y"}
                        </div>
                        <p className="text-gray-400">You</p>
                        {!isVideoEnabled && (
                          <p className="text-xs text-gray-500 mt-1">Camera off</p>
                        )}
                      </div>
                    </div>
                  )}
                  <div className="absolute bottom-4 left-4">
                    <span className="rounded-full bg-black/50 px-3 py-1 text-sm text-white">
                      You
                    </span>
                  </div>
                  {/* Local media indicators */}
                  <div className="absolute top-4 right-4 flex gap-2">
                    {!isAudioEnabled && (
                      <div className="rounded-full bg-red-500/80 p-2">
                        <MicOff className="h-4 w-4 text-white" />
                      </div>
                    )}
                    {!isVideoEnabled && (
                      <div className="rounded-full bg-red-500/80 p-2">
                        <VideoOff className="h-4 w-4 text-white" />
                      </div>
                    )}
                  </div>
                </Card>
              </div>

              {/* Controls */}
              <div className="flex justify-center gap-4">
                <Button
                  size="lg"
                  variant={!isAudioEnabled ? "destructive" : "secondary"}
                  className="h-14 w-14 rounded-full p-0"
                  onClick={toggleAudio}
                  title={isAudioEnabled ? "Mute" : "Unmute"}
                >
                  {isAudioEnabled ? (
                    <Mic className="h-6 w-6" />
                  ) : (
                    <MicOff className="h-6 w-6" />
                  )}
                </Button>

                <Button
                  size="lg"
                  variant={!isVideoEnabled ? "destructive" : "secondary"}
                  className="h-14 w-14 rounded-full p-0"
                  onClick={toggleVideo}
                  title={isVideoEnabled ? "Turn off camera" : "Turn on camera"}
                >
                  {isVideoEnabled ? (
                    <Video className="h-6 w-6" />
                  ) : (
                    <VideoOff className="h-6 w-6" />
                  )}
                </Button>

                <Button
                  size="lg"
                  variant={isScreenSharing ? "destructive" : "secondary"}
                  className="h-14 w-14 rounded-full p-0"
                  onClick={toggleScreenShare}
                  title={isScreenSharing ? "Stop sharing screen" : "Share screen"}
                >
                  <Monitor className="h-6 w-6" />
                </Button>

                <Button
                  size="lg"
                  variant="destructive"
                  className="h-14 w-14 rounded-full p-0"
                  onClick={handleEndSession}
                  title="End call"
                >
                  <PhoneOff className="h-6 w-6" />
                </Button>
              </div>

              {/* Connection error display */}
              {connectionError && (
                <Card className="bg-red-900/20 border-red-500 p-4">
                  <div className="flex items-center gap-2 text-red-400">
                    <AlertCircle className="h-5 w-5" />
                    <span>{connectionError}</span>
                  </div>
                </Card>
              )}

              {/* Non-fatal session errors (e.g. screen share) */}
              {sessionError && (
                <Card className="border-destructive/40 bg-destructive/10 p-4">
                  <div className="flex items-center gap-2 text-destructive">
                    <AlertCircle className="h-5 w-5" />
                    <span className="text-sm">{sessionError}</span>
                  </div>
                </Card>
              )}

              {/* Chat */}
              <Card className="bg-gray-800 border-gray-700 p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-white font-semibold">Chat</h3>
                  <span className="text-xs text-gray-400">
                    {isConnected ? "Connected" : "Connecting..."}
                  </span>
                </div>

                <div className="h-48 overflow-y-auto space-y-2 rounded-md bg-gray-900/40 p-3">
                  {chatMessages.length === 0 ? (
                    <p className="text-sm text-gray-400">No messages yet.</p>
                  ) : (
                    chatMessages.map((m) => (
                      <div key={m.id} className={m.isSelf ? "text-right" : "text-left"}>
                        <div className="text-xs text-gray-400">
                          {m.isSelf ? "You" : m.from} • {new Date(m.timestamp).toLocaleTimeString()}
                        </div>
                        <div className={m.isSelf ? "inline-block bg-green-600/30 text-white px-3 py-2 rounded-md" : "inline-block bg-gray-700 text-white px-3 py-2 rounded-md"}>
                          {m.message}
                        </div>
                      </div>
                    ))
                  )}
                </div>

                <div className="mt-3 flex gap-2">
                  <Input
                    value={chatText}
                    onChange={(e) => setChatText(e.target.value)}
                    placeholder="Type a message..."
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleSendChat();
                      }
                    }}
                  />
                  <Button onClick={handleSendChat} disabled={!chatText.trim()}>
                    Send
                  </Button>
                </div>
              </Card>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
