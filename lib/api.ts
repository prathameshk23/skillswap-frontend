// API client for backend REST API calls
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5000";

// Socket.io URL for WebRTC signaling
export const SOCKET_URL = API_BASE_URL;

// Token management
export const setAuthToken = (token: string) => {
  if (typeof window !== "undefined") {
    localStorage.setItem("jwt_token", token);
    // Also set as cookie for middleware to check
    document.cookie = `jwt_token=${token}; path=/; max-age=${7 * 24 * 60 * 60}; SameSite=Lax`;
  }
};

export const getAuthToken = (): string | null => {
  if (typeof window !== "undefined") {
    return localStorage.getItem("jwt_token");
  }
  return null;
};

export const removeAuthToken = () => {
  if (typeof window !== "undefined") {
    localStorage.removeItem("jwt_token");
    // Also remove cookie
    document.cookie = "jwt_token=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT";
  }
};

// API client with JWT authorization
class APIClient {
  private baseURL: string;

  constructor(baseURL: string) {
    this.baseURL = baseURL;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const token = getAuthToken();
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...(options.headers as Record<string, string>),
    };

    // Add JWT token to Authorization header if available
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    const response = await fetch(`${this.baseURL}${endpoint}`, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.message || `API Error: ${response.status}`);
    }

    return response.json();
  }

  // Authentication endpoints
  async login(firebaseToken: string) {
    return this.request<{ token: string; user: any }>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ firebaseToken }),
    });
  }

  // Skill endpoints
  async getSkills(params?: { search?: string; category?: string }) {
    const query = new URLSearchParams(params as Record<string, string>).toString();
    return this.request<any[]>(`/api/skills${query ? `?${query}` : ""}`);
  }

  async getSkillById(id: string) {
    return this.request<any>(`/api/skills/${id}`);
  }

  async createSkill(data: {
    title: string;
    description: string;
    category: string;
    level: string;
  }) {
    return this.request<any>("/api/skills", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async getMySkills() {
    return this.request<any[]>("/api/skills/my");
  }

  async updateSkill(id: string, data: any) {
    return this.request<any>(`/api/skills/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  }

  async deleteSkill(id: string) {
    return this.request<void>(`/api/skills/${id}`, {
      method: "DELETE",
    });
  }

  // Request endpoints
  async getRequests() {
    // Fetch both incoming and outgoing requests
    const [incoming, outgoing] = await Promise.all([
      this.request<any[]>("/api/requests/incoming"),
      this.request<any[]>("/api/requests/outgoing"),
    ]);
    return { incoming, outgoing };
  }

  async createRequest(skillId: string, message: string, scheduledFor?: string | null) {
    return this.request<any>("/api/requests", {
      method: "POST",
      body: JSON.stringify({ skillId, message, scheduledFor: scheduledFor || null }),
    });
  }

  async acceptRequest(requestId: string) {
    return this.request<any>(`/api/requests/${requestId}/accept`, {
      method: "PUT",
    });
  }

  async rejectRequest(requestId: string) {
    return this.request<any>(`/api/requests/${requestId}/reject`, {
      method: "PUT",
    });
  }

  async completeRequest(requestId: string) {
    return this.request<any>(`/api/requests/${requestId}/complete`, {
      method: "PUT",
    });
  }

  async updateRequestStatus(
    requestId: string,
    status: "ACCEPTED" | "REJECTED" | "COMPLETED"
  ) {
    // Map status to appropriate endpoint
    if (status === "ACCEPTED") {
      return this.acceptRequest(requestId);
    } else if (status === "REJECTED") {
      return this.rejectRequest(requestId);
    } else if (status === "COMPLETED") {
      return this.completeRequest(requestId);
    }
    throw new Error(`Unknown status: ${status}`);
  }

  // Session endpoints
  async getSession(sessionId: string) {
    return this.request<any>(`/api/sessions/${sessionId}`);
  }

  async getMySessions() {
    return this.request<any[]>("/api/sessions/my");
  }

  async startSession(sessionId: string) {
    return this.request<any>(`/api/sessions/${sessionId}/start`, {
      method: "PATCH",
    });
  }

  async endSession(sessionId: string) {
    return this.request<any>(`/api/sessions/${sessionId}/end`, {
      method: "PATCH",
    });
  }

  // User endpoints
  async getUserProfile(userId: string) {
    return this.request<any>(`/api/users/${userId}`);
  }

  async updateProfile(data: { name?: string; bio?: string; avatar?: string }) {
    return this.request<any>("/api/users/profile", {
      method: "PUT",
      body: JSON.stringify(data),
    });
  }

  // Rating endpoints
  async createRating(data: {
    requestId?: string;
    sessionId?: string;
    revieweeId: string;
    rating: number;
    comment?: string;
  }) {
    return this.request<any>("/api/reviews", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async getUserRatings(userId: string) {
    // Backend exposes /api/reviews/received for current user, and /api/users/:id/reviews for specific users.
    return this.request<any[]>(`/api/users/${userId}/reviews`);
  }
}

// Export singleton instance
export const api = new APIClient(API_BASE_URL);
