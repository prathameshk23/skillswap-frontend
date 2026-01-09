"use client";

import { useRouter } from "next/navigation";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Clock, Video } from "lucide-react";

interface RequestCardProps {
  request: {
    id: string;
    skillId: string;
    skillTitle: string;
    requesterId: string;
    requesterName: string;
    requesterAvatar?: string;
    providerId: string;
    providerName: string;
    message: string;
    status: string; // pending, accepted, rejected, completed
    sessionId?: string;
    scheduledFor?: string | null;
    createdAt: string;
  };
  type: "incoming" | "outgoing";
  onAccept?: (requestId: string) => void;
  onReject?: (requestId: string) => void;
  onComplete?: (requestId: string) => void;
  onRate?: (requestId: string) => void;
}

const statusColors: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  pending: "default",
  accepted: "secondary",
  rejected: "destructive",
  completed: "outline",
};

export function RequestCard({
  request,
  type,
  onAccept,
  onReject,
  onComplete,
  onRate,
}: RequestCardProps) {
  const router = useRouter();
  
  const showActions = request.status === "pending" && type === "incoming";
  const showComplete = request.status === "accepted" && type === "incoming";
  const showJoinSession = request.status === "accepted" && request.sessionId;
  const showRate = request.status === "completed" && type === "outgoing";

  // Determine which user to display based on the card type
  const displayUser = type === "incoming" 
    ? { name: request.requesterName, avatar: request.requesterAvatar }
    : { name: request.providerName, avatar: undefined };

  const handleJoinSession = () => {
    if (request.sessionId) {
      router.push(`/session/${request.sessionId}`);
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1">
            <h3 className="font-semibold text-lg leading-tight mb-1">
              {request.skillTitle}
            </h3>
            <div className="flex items-center gap-2">
              <Badge variant={statusColors[request.status] || "default"} className="text-xs capitalize">
                {request.status}
              </Badge>
            </div>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-3">
        <div className="flex items-center gap-2">
          <Avatar className="h-8 w-8">
            <AvatarImage src={displayUser.avatar} alt={displayUser.name} />
            <AvatarFallback>{displayUser.name?.charAt(0) || "?"}</AvatarFallback>
          </Avatar>
          <div>
            <p className="text-sm font-medium">
              {type === "incoming" ? "From: " : "To: "}{displayUser.name}
            </p>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" />
              {new Date(request.createdAt).toLocaleDateString()}
            </div>
            {request.scheduledFor && (
              <div className="text-xs text-muted-foreground">
                Scheduled: {new Date(request.scheduledFor).toLocaleString()}
              </div>
            )}
          </div>
        </div>
        
        {request.message && (
          <p className="text-sm text-muted-foreground">{request.message}</p>
        )}
      </CardContent>
      
      <CardFooter className="pt-3 border-t gap-2 flex-wrap">
        {showActions && (
          <>
            <Button
              size="sm"
              variant="outline"
              onClick={() => onReject?.(request.id)}
              className="flex-1"
            >
              Reject
            </Button>
            <Button
              size="sm"
              onClick={() => onAccept?.(request.id)}
              className="flex-1"
            >
              Accept
            </Button>
          </>
        )}
        
        {showJoinSession && (
          <Button
            size="sm"
            variant="default"
            onClick={handleJoinSession}
            className="flex-1 bg-green-600 hover:bg-green-700"
          >
            <Video className="h-4 w-4 mr-2" />
            Join Session
          </Button>
        )}
        
        {showComplete && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => onComplete?.(request.id)}
            className="flex-1"
          >
            Mark as Completed
          </Button>
        )}
        
        {showRate && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => onRate?.(request.id)}
            className="w-full"
          >
            Rate Experience
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}
