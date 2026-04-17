import React, { createContext, useContext, useState, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";
import { API_URL } from "@/constants/api";
import { getToken } from "@/lib/auth";

export interface Friend {
  friendship_id: string;
  friend_id: string;
  status: "pending" | "accepted" | "blocked";
  name: string;
  email: string;
  avatar_url?: string;
  last_active_date?: string | null;
  is_active_now?: boolean;
  xp_total: number;
  requester_id: string;
}

interface SocialContextProps {
  friends: Friend[];
  leaderboard: any[];
  loadFriends: () => Promise<void>;
  loadLeaderboard: () => Promise<void>;
  sendFriendRequest: (email: string) => Promise<void>;
  acceptFriendRequest: (friendshipId: string) => Promise<void>;
}

const SocialContext = createContext<SocialContextProps | undefined>(undefined);

export function SocialProvider({ children }: { children: React.ReactNode }) {
  const [friends, setFriends] = useState<Friend[]>([]);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);

  const loadFriends = async () => {
    try {
      const token = await getToken();
      if (!token) return;
      
      const res = await fetch(`${API_URL}/social/friends`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (Array.isArray(data)) setFriends(data);
    } catch (err) {
      console.warn("Failed to load friends", err);
    }
  };

  const loadLeaderboard = async () => {
    try {
      const token = await getToken();
      if (!token) return;

      const res = await fetch(`${API_URL}/social/leaderboard`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (Array.isArray(data)) setLeaderboard(data);
    } catch (err) {
      console.warn("Failed to load leaderboard", err);
    }
  };

  const sendFriendRequest = async (email: string) => {
    try {
      const token = await getToken();
      if (!token) return;

      const res = await fetch(`${API_URL}/social/friends/request`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Greška pri slanju zahtjeva");
      await loadFriends();
    } catch (err: any) {
      throw err;
    }
  };

  const acceptFriendRequest = async (friendshipId: string) => {
    try {
      const token = await getToken();
      if (!token) return;

      const res = await fetch(`${API_URL}/social/friends/accept/${friendshipId}`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Greška pri prihvaćanju zhatjeva");
      await loadFriends();
    } catch (err: any) {
      throw err;
    }
  };

  useEffect(() => {
    loadFriends();
    loadLeaderboard();
  }, []);

  return (
    <SocialContext.Provider value={{ friends, leaderboard, loadFriends, loadLeaderboard, sendFriendRequest, acceptFriendRequest }}>
      {children}
    </SocialContext.Provider>
  );
}

export const useSocial = () => {
  const ctx = useContext(SocialContext);
  if (!ctx) throw new Error("useSocial must be used within SocialProvider");
  return ctx;
};
