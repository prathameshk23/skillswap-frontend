"use client";

import { useState, useEffect } from "react";
import { Navbar } from "@/components/navbar";
import { RequestCard } from "@/components/request-card";
import { RatingDialog } from "@/components/rating-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";

type Request = {
  id: string;
  skillId: string;
  skillTitle: string;
  requesterId: string;
  requesterName: string;
  requesterAvatar?: string;
  providerId: string;
  providerName: string;
  message: string;
  status: string;
  sessionId?: string;
  scheduledFor?: string | null;
  createdAt: string;
};

export default function RequestsPage() {
  const { user } = useAuth();
  const [incoming, setIncoming] = useState<Request[]>([]);
  const [outgoing, setOutgoing] = useState<Request[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [ratingDialogOpen, setRatingDialogOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<Request | null>(null);

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    try {
      setIsLoading(true);
      const data = await api.getRequests();
      setIncoming(data.incoming || []);
      setOutgoing(data.outgoing || []);
    } catch (error) {
      console.error("Failed to fetch requests:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAccept = async (requestId: string) => {
    try {
      await api.updateRequestStatus(requestId, "ACCEPTED");
      await fetchRequests();
    } catch (error) {
      console.error("Failed to accept request:", error);
    }
  };

  const handleReject = async (requestId: string) => {
    try {
      await api.updateRequestStatus(requestId, "REJECTED");
      await fetchRequests();
    } catch (error) {
      console.error("Failed to reject request:", error);
    }
  };

  const handleComplete = async (requestId: string) => {
    try {
      await api.updateRequestStatus(requestId, "COMPLETED");
      await fetchRequests();
    } catch (error) {
      console.error("Failed to complete request:", error);
    }
  };

  const handleRate = (requestId: string) => {
    const req = outgoing.find((r) => r.id === requestId) || null;
    setSelectedRequest(req);
    setRatingDialogOpen(true);
  };

  const handleSubmitRating = async (rating: number, review: string) => {
    if (!user || !selectedRequest) return;

    const revieweeId =
      selectedRequest.providerId === user.uid
        ? selectedRequest.requesterId
        : selectedRequest.providerId;

    try {
      await api.createRating({
        requestId: selectedRequest.id,
        sessionId: selectedRequest.sessionId,
        revieweeId,
        rating,
        comment: review,
      });
      setRatingDialogOpen(false);
      setSelectedRequest(null);
      await fetchRequests();
    } catch (error) {
      console.error("Failed to submit rating:", error);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Requests</h1>
          <p className="text-muted-foreground">
            Manage incoming and outgoing skill exchange requests
          </p>
        </div>

        <Tabs defaultValue="incoming" className="w-full">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="incoming">
              Incoming ({incoming.length})
            </TabsTrigger>
            <TabsTrigger value="outgoing">
              Outgoing ({outgoing.length})
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="incoming" className="mt-6">
            {isLoading ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground">Loading requests...</p>
              </div>
            ) : incoming.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                No incoming requests
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {incoming.map((request) => (
                  <RequestCard
                    key={request.id}
                    request={request}
                    type="incoming"
                    onAccept={handleAccept}
                    onReject={handleReject}
                    onComplete={handleComplete}
                  />
                ))}
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="outgoing" className="mt-6">
            {isLoading ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground">Loading requests...</p>
              </div>
            ) : outgoing.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                No outgoing requests
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {outgoing.map((request) => (
                  <RequestCard
                    key={request.id}
                    request={request}
                    type="outgoing"
                    onRate={handleRate}
                  />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </main>

      <RatingDialog
        open={ratingDialogOpen}
        onOpenChange={setRatingDialogOpen}
        onSubmit={handleSubmitRating}
      />
    </div>
  );
}
