"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { User, onAuthStateChanged, signOut as firebaseSignOut } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { api, setAuthToken, removeAuthToken } from "@/lib/api";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshToken: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Exchange Firebase token for backend JWT
  const exchangeTokenWithBackend = async (firebaseUser: User) => {
    try {
      const firebaseToken = await firebaseUser.getIdToken();
      const response = await api.login(firebaseToken);
      setAuthToken(response.token);
    } catch (error) {
      console.error("Failed to exchange token with backend:", error);
      // Don't block auth flow if backend is down
    }
  };

  const refreshToken = async () => {
    if (user) {
      await exchangeTokenWithBackend(user);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      
      if (firebaseUser) {
        await exchangeTokenWithBackend(firebaseUser);
      } else {
        removeAuthToken();
      }
      
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signOut = async () => {
    await firebaseSignOut(auth);
    removeAuthToken();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, signOut, refreshToken }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
