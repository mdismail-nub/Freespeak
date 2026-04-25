import { useState, useEffect } from "react";
import { Post, UserProfile } from "../types";
import { collection, query, orderBy, onSnapshot, limit, where, Timestamp } from "firebase/firestore";
import { db, handleFirestoreError, OperationType } from "../lib/firebase";
import { PostCard } from "./PostCard";
import { motion, AnimatePresence } from "motion/react";
import { MessageSquareOff } from "lucide-react";

export function Feed({ user }: { user: UserProfile }) {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Current time minus 24 hours
    const yesterday = new Timestamp(
      Math.floor(Date.now() / 1000) - 24 * 60 * 60,
      0
    );

    const q = query(
      collection(db, "posts"),
      where("createdAt", ">", yesterday),
      orderBy("createdAt", "desc"),
      limit(50)
    );

    const unsubscribe = onSnapshot(q, 
      (snapshot) => {
        const newPosts = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        } as Post));
        
        setPosts(newPosts);
        setLoading(false);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, "posts");
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <div className="w-12 h-12 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin" />
        <p className="text-white/40 font-mono text-xs uppercase animate-pulse">Scanning the void...</p>
      </div>
    );
  }

  if (posts.length === 0) {
    return (
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex flex-col items-center justify-center py-32 text-center"
      >
        <div className="p-6 rounded-full bg-white/5 border border-white/10 mb-6 group hover:scale-110 transition-transform">
          <MessageSquareOff className="w-12 h-12 text-white/20 group-hover:text-blue-400 transition-colors" />
        </div>
        <h3 className="text-xl font-semibold text-white/80 mb-2">Silence is golden</h3>
        <p className="text-white/40 max-w-xs">Be the first to break the silence. All thoughts vanish in 24 hours.</p>
      </motion.div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-6 pb-20">
      <AnimatePresence mode="popLayout">
        {posts.map((post) => (
          <PostCard key={post.id} post={post} user={user} />
        ))}
      </AnimatePresence>
    </div>
  );
}
