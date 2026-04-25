import { Timestamp } from "firebase/firestore";

export interface Post {
  id: string;
  content: string;
  authorName: string;
  authorId: string;
  createdAt: Timestamp;
  likes: number;
  imageUrl?: string;
}

export interface Reply {
  id: string;
  content: string;
  authorName: string;
  authorId: string;
  createdAt: Timestamp;
  likes: number;
}

export interface UserProfile {
  name: string;
  id: string;
}
