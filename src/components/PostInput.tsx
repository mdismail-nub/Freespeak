import React, { useState, useRef } from "react";
import { UserProfile } from "../types";
import { Send, User, Image as ImageIcon, X } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage, handleFirestoreError, OperationType } from "../lib/firebase";
import { generateId } from "../lib/utils";

const MAX_CHARS = 500;

export function PostInput({ user }: { user: UserProfile }) {
  const [content, setContent] = useState("");
  const [isPosting, setIsPosting] = useState(false);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert("Image too large. Max 5MB.");
        return;
      }
      setSelectedImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeImage = () => {
    setSelectedImage(null);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!content.trim() && !selectedImage) || isPosting || content.length > MAX_CHARS) return;

    setIsPosting(true);
    try {
      let imageUrl = null;

      if (selectedImage) {
        try {
          const imageId = generateId();
          const storageRef = ref(storage, `posts/${user.id}/${imageId}_${selectedImage.name}`);
          const uploadResult = await uploadBytes(storageRef, selectedImage);
          imageUrl = await getDownloadURL(uploadResult.ref);
        } catch (uploadErr) {
          console.error("Image upload failed:", uploadErr);
          alert("Failed to upload image. Please try again.");
          setIsPosting(false);
          return;
        }
      }

      try {
        await addDoc(collection(db, "posts"), {
          content: content.trim(),
          authorName: user.name,
          authorId: user.id,
          createdAt: serverTimestamp(),
          likes: 0,
          ...(imageUrl && { imageUrl })
        });
        
        setContent("");
        removeImage();
      } catch (dbErr) {
        handleFirestoreError(dbErr, OperationType.CREATE, "posts");
      }
    } catch (err) {
      console.error("Post creation error:", err);
    } finally {
      setIsPosting(false);
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto mb-12">
      <div className="flex items-center gap-3 mb-4 px-2">
        <div className="w-10 h-10 rounded-full bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
          <User className="w-5 h-5 text-blue-400" />
        </div>
        <div>
          <p className="text-[10px] text-white/30 uppercase tracking-widest font-bold">Posting Anonymously as</p>
          <p className="text-sm font-bold text-blue-400">{user.name}</p>
        </div>
      </div>

      <form 
        onSubmit={handleSubmit}
        className="relative group p-1 rounded-2xl bg-gradient-to-br from-white/10 to-white/5 border border-white/10 focus-within:border-blue-500/50 transition-all shadow-2xl"
      >
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Speak your mind anonymously..."
          className="w-full h-32 p-4 bg-transparent text-white placeholder-white/20 resize-none focus:outline-none scrollbar-hide text-lg"
          maxLength={MAX_CHARS}
          id="post-textarea"
        />

        <AnimatePresence>
          {imagePreview && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative mx-4 mb-4"
            >
              <img 
                src={imagePreview} 
                alt="Upload preview" 
                className="w-full max-h-64 object-cover rounded-xl border border-white/10 shadow-lg"
              />
              <button
                type="button"
                onClick={removeImage}
                className="absolute top-2 right-2 p-1.5 rounded-full bg-black/60 text-white hover:bg-black transition-colors backdrop-blur-sm border border-white/10 shadow-inner"
              >
                <X className="w-4 h-4" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>
        
        <div className="flex items-center justify-between p-3 bg-white/5 rounded-xl mt-1 border-t border-white/5">
          <div className="flex items-center gap-4">
            <input 
              type="file"
              ref={fileInputRef}
              onChange={handleImageSelect}
              accept="image/*"
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-white/40 hover:text-blue-400 hover:bg-blue-500/10 transition-all text-xs font-bold uppercase tracking-wider"
            >
              <ImageIcon className="w-4 h-4" />
              <span>Image</span>
            </button>

            <div className={`text-[10px] font-mono font-bold tracking-wider ${content.length >= MAX_CHARS ? 'text-rose-500' : 'text-white/30'}`}>
              {content.length}/{MAX_CHARS}
            </div>
          </div>
          
          <button
            type="submit"
            disabled={(!content.trim() && !selectedImage) || isPosting || content.length > MAX_CHARS}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold transition-all active:scale-95 shadow-lg shadow-blue-600/30"
            id="submit-post-btn"
          >
            {isPosting ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <Send className="w-4 h-4" />
                <span>Post Anonymously</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
