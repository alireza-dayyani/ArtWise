export interface User {
  id: string;
  email: string;
  name: string;
  avatarUrl?: string;
  createdAt: string;
  isAdmin?: boolean;
}

export interface Artwork {
  id: string;
  userId: string;
  imageUrl: string; // Base64 or local object URL
  title: string;
  artist: string;
  year: string;
  style: string;
  summary: string;
  detailedAnalysis: string;
  historicalContext: string;
  stylisticInfluences: string;
  interpretation: string;
  categories: string[];
  tags: string[];
  createdAt: string;
}

export interface Thread {
  id: string;
  userId: string;
  artworkId: string;
  title: string;
  createdAt: string;
}

export interface Message {
  id: string;
  threadId: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: string;
}
