import React, { useState, useEffect } from "react";
import { Post, UserProfile } from "../types";
import { Heart, Clock, MessageSquare, Share2, Edit3, Trash2, Check, X } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { doc, updateDoc, increment, writeBatch, setDoc, deleteDoc, getDoc, collection, onSnapshot } from "firebase/firestore";
import { ref, deleteObject } from "firebase/storage";
import { db, storage, handleFirestoreError, OperationType } from "../lib/firebase";
import { ReplyList } from "./ReplyList";

export const PostCard: React.FC<{ post: Post; user: UserProfile }> = ({ post, user }) => {
  const [timeLeft, setTimeLeft] = useState<string>("");
  const [isLiking, setIsLiking] = useState(false);
  const [showReplies, setShowReplies] = useState(false);
  const [showShareToast, setShowShareToast] = useState(false);
  const [hasLiked, setHasLiked] = useState(false);
  
  // Edit state
  const [replyCount, setReplyCount] = useState(0);

  useEffect(() => {
    if (!post.id) return;
    const repliesRef = collection(db, "posts", post.id, "replies");
    const unsub = onSnapshot(repliesRef, (snap) => {
      setReplyCount(snap.size);
    });
    return () => unsub();
  }, [post.id]);

  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(post.content);
  const [isSaving, setIsSaving] = useState(false);
  
  // Delete state
  const [isDeleting, setIsDeleting] = useState(false);
  const [showFullImage, setShowFullImage] = useState(false);

  const isAuthor = user.id === post.authorId;

  const handleShare = () => {
    const url = `${window.location.origin}/post/${post.id}`;
    navigator.clipboard.writeText(url);
    setShowShareToast(true);
    setTimeout(() => setShowShareToast(false), 2000);
  };

  useEffect(() => {
    // Check if user already liked this post
    const checkLike = async () => {
      const likeRef = doc(db, "posts", post.id, "likes", user.id);
      const snap = await getDoc(likeRef);
      if (snap.exists()) setHasLiked(true);
    };
    checkLike();

    const updateCountdown = () => {
      const now = Date.now();
      const expiry = post.createdAt?.toMillis() ? post.createdAt.toMillis() + 24 * 60 * 60 * 1000 : now;
      const diff = expiry - now;

      if (diff <= 0) {
        setTimeLeft("Expiring...");
        return;
      }

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      setTimeLeft(`${hours}h ${minutes}m ${seconds}s`);
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [post.createdAt, post.id, user.id]);

  const handleLike = async () => {
    if (isLiking || hasLiked) return;
    setIsLiking(true);
    try {
      const batch = writeBatch(db);
      const postRef = doc(db, "posts", post.id);
      const likeRef = doc(db, "posts", post.id, "likes", user.id);
      
      batch.update(postRef, { likes: increment(1) });
      batch.set(likeRef, { createdAt: new Date() });
      
      await batch.commit();
      setHasLiked(true);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `posts/${post.id}`);
    } finally {
      setIsLiking(false);
    }
  };

  const handleSaveEdit = async () => {
    if (!editContent.trim() || editContent === post.content || isSaving) return;
    setIsSaving(true);
    try {
      const postRef = doc(db, "posts", post.id);
      await updateDoc(postRef, { content: editContent.trim() });
      setIsEditing(false);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `posts/${post.id}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (isDeleting) return;
    if (!confirm("Are you sure you want to delete this thought? It will vanish early.")) return;
    
    setIsDeleting(true);
    try {
      if (post.imageUrl) {
        try {
          const imageRef = ref(storage, post.imageUrl);
          await deleteObject(imageRef);
        } catch (storageErr) {
          console.error("Failed to delete image from storage:", storageErr);
          // Continue with post deletion even if storage deletion fails
        }
      }
      const postRef = doc(db, "posts", post.id);
      await deleteDoc(postRef);
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `posts/${post.id}`);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="relative group p-6 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md shadow-xl transition-all hover:bg-white/[0.07]"
      id={`post-${post.id}`}
    >
      <div className="flex justify-between items-start mb-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-blue-400 tracking-wide">
              {post.authorName}
            </h3>
            {isAuthor && (
              <span className="text-[9px] px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-400 font-bold uppercase tracking-tighter">
                You
              </span>
            )}
          </div>
          <p className="text-[10px] text-white/40 font-mono uppercase tracking-widest">
            {post.createdAt?.toMillis() ? new Date(post.createdAt.toMillis()).toLocaleString() : "Syncing..."}
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          {isAuthor && !isEditing && (
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity mr-2">
              <button 
                onClick={() => setIsEditing(true)}
                className="p-1.5 rounded-lg bg-white/5 hover:bg-blue-500/20 text-white/40 hover:text-blue-400 transition-all"
              >
                <Edit3 className="w-4 h-4" />
              </button>
              <button 
                onClick={handleDelete}
                className="p-1.5 rounded-lg bg-white/5 hover:bg-rose-500/20 text-white/40 hover:text-rose-400 transition-all"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          )}
          
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-[10px] font-mono text-white/50">
            <Clock className="w-3 h-3" />
            {timeLeft}
          </div>
        </div>
      </div>

      {isEditing ? (
        <div className="space-y-3 mb-6">
          <textarea
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
            className="w-full p-3 rounded-xl bg-black/40 border border-blue-500/30 text-white text-sm focus:outline-none focus:border-blue-500"
            rows={3}
            maxLength={600}
          />
          <div className="flex justify-end gap-2">
            <button
              onClick={() => { setIsEditing(false); setEditContent(post.content); }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 text-xs font-semibold text-white/60 hover:bg-white/10"
            >
              <X className="w-3 h-3" />
              Cancel
            </button>
            <button
              onClick={handleSaveEdit}
              disabled={isSaving || !editContent.trim() || editContent === post.content}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 text-xs font-semibold text-white hover:bg-blue-500 disabled:opacity-50"
            >
              {isSaving ? <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Check className="w-3 h-3" />}
              Save Changes
            </button>
          </div>
        </div>
      ) : (
        <>
          <p className="text-white/90 leading-relaxed break-words whitespace-pre-wrap mb-4 selection:bg-blue-500/40">
            {post.content}
          </p>
          {post.imageUrl && (
            <div className="relative mb-6 rounded-xl overflow-hidden border border-white/10 group/image">
              <img 
                src={post.imageUrl} 
                alt="Post attachment" 
                className="w-full max-h-[400px] object-cover cursor-zoom-in transition-transform duration-500 group-hover/image:scale-105"
                onClick={() => setShowFullImage(true)}
              />
              <div 
                className="absolute inset-0 bg-black/20 opacity-0 group-hover/image:opacity-100 transition-opacity flex items-center justify-center pointer-events-none"
              >
                <div className="bg-white/10 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/20 text-[10px] font-bold uppercase tracking-widest text-white shadow-xl">
                  Click to Expand
                </div>
              </div>
            </div>
          )}
        </>
      )}

      <AnimatePresence>
        {showFullImage && post.imageUrl && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-4 md:p-10 backdrop-blur-sm"
            onClick={() => setShowFullImage(false)}
          >
            <button 
              className="absolute top-6 right-6 p-2 rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors border border-white/10"
              onClick={(e) => { e.stopPropagation(); setShowFullImage(false); }}
            >
              <X className="w-6 h-6" />
            </button>
            <motion.img 
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              src={post.imageUrl} 
              alt="Full view" 
              className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            />
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex items-center justify-between pt-4 border-t border-white/10">
        <div className="flex items-center gap-4">
          <button
            onClick={handleLike}
            disabled={isLiking || hasLiked}
            className={`group/like flex items-center gap-2 transition-colors ${hasLiked ? 'text-rose-400' : 'text-white/40 hover:text-rose-400'}`}
            id={`like-btn-${post.id}`}
          >
            <div className={`p-2 rounded-full transition-colors ${hasLiked ? 'bg-rose-400/10' : 'group-hover/like:bg-rose-400/10'}`}>
              <Heart 
                className={`w-5 h-5 transition-all ${hasLiked || post.likes > 0 ? "fill-rose-400 text-rose-400" : ""}`} 
              />
            </div>
            <span className="text-sm font-medium">{post.likes}</span>
          </button>

          <button
            onClick={() => setShowReplies(!showReplies)}
            className={`group/reply flex items-center gap-2 transition-colors ${showReplies ? 'text-blue-400' : 'text-white/40 hover:text-blue-400'}`}
          >
            <div className={`p-2 rounded-full transition-colors ${showReplies ? 'bg-blue-400/10' : 'group-hover/reply:bg-blue-400/10'}`}>
              <MessageSquare className={`w-5 h-5 ${showReplies ? "fill-blue-400" : ""}`} />
            </div>
            <span className="text-sm font-medium">{replyCount}</span>
          </button>

          <button
            onClick={handleShare}
            className="group/share flex items-center gap-2 text-white/40 hover:text-blue-400 transition-colors relative"
          >
            <div className="p-2 rounded-full group-hover/share:bg-blue-400/10 transition-colors">
              <Share2 className="w-4 h-4" />
            </div>
            <AnimatePresence>
              {showShareToast && (
                <motion.span 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-blue-500 text-[10px] font-bold rounded whitespace-nowrap shadow-lg shadow-blue-500/20"
                >
                  Copied Link!
                </motion.span>
              )}
            </AnimatePresence>
          </button>
        </div>
        
        <div className="text-[10px] text-white/20 font-medium uppercase tracking-tight">
          Public Thought
        </div>
      </div>

      <AnimatePresence>
        {showReplies && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <ReplyList postId={post.id} user={user} />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};
