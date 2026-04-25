import React, { useState, useEffect } from "react";
import { Reply, UserProfile } from "../types";
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, doc, updateDoc, increment, writeBatch, getDoc, deleteDoc } from "firebase/firestore";
import { db, handleFirestoreError, OperationType } from "../lib/firebase";
import { Send, CornerDownRight, Heart, Edit3, Trash2, Check, X } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

export const ReplyList: React.FC<{ postId: string; user: UserProfile }> = ({ postId, user }) => {
  const [replies, setReplies] = useState<Reply[]>([]);
  const [content, setContent] = useState("");
  const [isPosting, setIsPosting] = useState(false);

  useEffect(() => {
    const q = query(
      collection(db, "posts", postId, "replies"),
      orderBy("createdAt", "asc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setReplies(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Reply)));
    }, (err) => handleFirestoreError(err, OperationType.LIST, `posts/${postId}/replies`));

    return () => unsubscribe();
  }, [postId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() || isPosting || content.length > 400) return;

    setIsPosting(true);
    try {
      await addDoc(collection(db, "posts", postId, "replies"), {
        content: content.trim(),
        authorName: user.name,
        authorId: user.id,
        createdAt: serverTimestamp(),
        likes: 0
      });
      setContent("");
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `posts/${postId}/replies`);
    } finally {
      setIsPosting(false);
    }
  };

  const [likedReplies, setLikedReplies] = useState<Set<string>>(new Set());

  useEffect(() => {
    // Check which replies the user has already liked
    const checkLikes = async () => {
      const likedSet = new Set<string>();
      for (const reply of replies) {
        try {
          const likeRef = doc(db, "posts", postId, "replies", reply.id, "likes", user.id);
          const snap = await getDoc(likeRef);
          if (snap.exists()) {
            likedSet.add(reply.id);
          }
        } catch (e) {
          // Ignore errors for individual check
        }
      }
      setLikedReplies(likedSet);
    };

    if (replies.length > 0) {
      checkLikes();
    }
  }, [replies, postId, user.id]);

  const handleLikeReply = async (replyId: string) => {
    if (likedReplies.has(replyId)) return;
    try {
      const batch = writeBatch(db);
      const replyRef = doc(db, "posts", postId, "replies", replyId);
      const likeRef = doc(db, "posts", postId, "replies", replyId, "likes", user.id);
      
      batch.update(replyRef, { likes: increment(1) });
      batch.set(likeRef, { createdAt: new Date() });
      
      await batch.commit();
      setLikedReplies(prev => new Set(prev).add(replyId));
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `posts/${postId}/replies/${replyId}`);
    }
  };

  const [editingReplyId, setEditingReplyId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const startEditing = (reply: Reply) => {
    setEditingReplyId(reply.id);
    setEditContent(reply.content);
  };

  const cancelEditing = () => {
    setEditingReplyId(null);
    setEditContent("");
  };

  const handleEditReply = async (replyId: string) => {
    if (!editContent.trim() || isSaving) return;
    setIsSaving(true);
    try {
      const replyRef = doc(db, "posts", postId, "replies", replyId);
      await updateDoc(replyRef, { content: editContent.trim() });
      setEditingReplyId(null);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `posts/${postId}/replies/${replyId}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteReply = async (replyId: string) => {
    if (!confirm("Remove this reply?")) return;
    try {
      const replyRef = doc(db, "posts", postId, "replies", replyId);
      await deleteDoc(replyRef);
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `posts/${postId}/replies/${replyId}`);
    }
  };

  return (
    <div className="mt-4 pt-4 border-t border-white/5 space-y-4">
      <div className="space-y-3">
        <AnimatePresence mode="popLayout">
          {replies.map((reply) => (
            <motion.div
              layout
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              key={reply.id}
              className="flex gap-3 px-4 py-2"
            >
              <CornerDownRight className="w-4 h-4 text-white/20 shrink-0 mt-1" />
              <div className="flex-1 space-y-1 group">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-blue-400/80">
                      {reply.authorName}
                      {reply.authorId === user.id && (
                        <span className="ml-1 text-[8px] px-1 rounded bg-blue-500/10 text-blue-400/60 uppercase tracking-tighter">You</span>
                      )}
                    </span>
                    <span className="text-[9px] text-white/20 font-mono">
                      {reply.createdAt?.toMillis() ? new Date(reply.createdAt.toMillis()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "Just now"}
                    </span>
                  </div>
                  
                  {reply.authorId === user.id && !editingReplyId && (
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={() => startEditing(reply)}
                        className="p-1 rounded hover:bg-blue-500/10 text-white/20 hover:text-blue-400 transition-colors"
                      >
                        <Edit3 className="w-3 h-3" />
                      </button>
                      <button 
                        onClick={() => handleDeleteReply(reply.id)}
                        className="p-1 rounded hover:bg-rose-500/10 text-white/20 hover:text-rose-400 transition-colors"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  )}
                </div>

                {editingReplyId === reply.id ? (
                  <div className="space-y-2 mt-1">
                    <textarea
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                      className="w-full text-xs text-white bg-black/40 border border-blue-500/30 p-2 rounded-lg focus:outline-none focus:border-blue-500"
                      rows={2}
                      maxLength={400}
                    />
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={cancelEditing}
                        className="p-1 rounded hover:bg-white/5 text-[10px] text-white/40 flex items-center gap-1"
                      >
                        <X className="w-3 h-3" /> Cancel
                      </button>
                      <button
                        onClick={() => handleEditReply(reply.id)}
                        disabled={isSaving || !editContent.trim()}
                        className="p-1 px-2 rounded bg-blue-600 text-[10px] text-white font-bold flex items-center gap-1 hover:bg-blue-500 disabled:opacity-50"
                      >
                        {isSaving ? "..." : <><Check className="w-3 h-3" /> Save</>}
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <p className="text-xs text-white/70 bg-white/5 p-2 rounded-lg border border-white/5 break-words">
                      {reply.content}
                    </p>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleLikeReply(reply.id)}
                        disabled={likedReplies.has(reply.id)}
                        className={`group/reply-like flex items-center gap-1.5 transition-colors ${likedReplies.has(reply.id) ? 'text-rose-400' : 'text-white/20 hover:text-rose-400'}`}
                      >
                        <Heart className={`w-3 h-3 ${likedReplies.has(reply.id) || reply.likes > 0 ? "fill-rose-400 text-rose-400" : ""}`} />
                        <span className="text-[10px] font-medium">{reply.likes || 0}</span>
                      </button>
                    </div>
                  </>
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      <form onSubmit={handleSubmit} className="flex gap-2 px-2 pb-2">
        <input
          type="text"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Write a reply..."
          className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white placeholder:text-white/20 focus:outline-none focus:border-blue-500/50"
          maxLength={400}
        />
        <button
          type="submit"
          disabled={!content.trim() || isPosting}
          className="p-1.5 rounded-lg bg-blue-600/20 text-blue-400 hover:bg-blue-600 hover:text-white transition-all disabled:opacity-30"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
};
