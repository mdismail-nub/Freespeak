import { useAnonymousUser } from "./hooks/useAnonymousUser";
import { PostInput } from "./components/PostInput";
import { Feed } from "./components/Feed";
import { ShieldCheck, Info, AlertCircle, ExternalLink } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { db } from "./lib/firebase";
import { useState, useEffect } from "react";
export default function App() {
  const { user, authError } = useAnonymousUser();

  if (!user && !authError) {
    return (
      <div className="min-h-screen bg-[#070708] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#070708] text-white selection:bg-blue-500/30">
      {/* Background Ambience */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-600/10 rounded-full blur-[120px]" />
      </div>

      <header className="sticky top-0 z-50 border-b border-white/5 bg-[#070708]/80 backdrop-blur-xl">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-600/20">
              <span className="font-bold text-lg select-none">F</span>
            </div>
            <h1 className="text-xl font-black tracking-tighter uppercase">
              Free<span className="text-blue-500">Speak</span>
            </h1>
          </div>
          
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
            <ShieldCheck className="w-4 h-4" />
            <span className="text-[10px] font-bold uppercase tracking-wider">
              {user ? "Anonymous Session" : "Authenticating..."}
            </span>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 pt-8">
        <AnimatePresence>
          {authError && (
            <motion.div 
              initial={{ height: 0, opacity: 0, marginBottom: 0 }}
              animate={{ height: "auto", opacity: 1, marginBottom: 24 }}
              exit={{ height: 0, opacity: 0, marginBottom: 0 }}
              className="overflow-hidden"
            >
              <div className="bg-rose-500/10 border border-rose-500/20 rounded-2xl p-5 flex gap-4 items-start shadow-2xl shadow-rose-500/5">
                <div className="p-2.5 rounded-xl bg-rose-500/20 text-rose-400 shrink-0">
                  <AlertCircle className="w-5 h-5" />
                </div>
                <div className="space-y-2">
                  <h4 className="text-sm font-bold text-rose-400 uppercase tracking-wide">Firebase Configuration Required</h4>
                  <p className="text-xs text-white/60 leading-relaxed font-medium">
                    {authError} Anonymous authentication must be enabled in your Firebase Console to allow secure posting and interaction.
                  </p>
                  <div className="pt-2">
                    <a 
                      href="https://console.firebase.google.com/project/hip-rain-446216-d2/authentication/providers" 
                      target="_blank" 
                      rel="noreferrer"
                      className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-rose-500/20 text-[10px] font-bold text-rose-400 hover:bg-rose-500/30 transition-all uppercase tracking-wider border border-rose-500/20"
                    >
                      Enable Anonymous Auth <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {user && (
          <>
            {/* Subtle Banner */}
            <section className="mb-12">
              <motion.div 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center justify-center gap-2 p-3 rounded-xl bg-blue-500/5 border border-blue-500/10 text-center"
              >
                <Info className="w-4 h-4 text-blue-400 shrink-0" />
                <p className="text-xs text-blue-100/60 font-medium">
                  Your identity is hidden. Speak freely. All posts vanish in 24 hours.
                </p>
              </motion.div>
            </section>

            <PostInput user={user} />
            
            <div className="space-y-6">
              <div className="flex items-center justify-between border-b border-white/5 pb-4 px-2">
                <h2 className="text-sm font-bold uppercase tracking-[0.2em] text-white/40">Latest Thoughts</h2>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-[10px] font-bold text-white/20 uppercase tracking-widest">Live Feed</span>
                </div>
              </div>
              <Feed user={user} />
            </div>
          </>
        )}

        {!user && authError && (
          <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
             <AlertCircle className="w-12 h-12 text-rose-500/20" />
             <p className="text-sm font-mono text-white/30 uppercase tracking-widest max-w-xs">
               Authentication failed. Please check the setup instructions above.
             </p>
          </div>
        )}
      </main>

      <footer className="py-12 border-t border-white/5 bg-white/[0.01]">
        <div className="max-w-4xl mx-auto px-4 flex flex-col items-center text-center gap-4">
          <p className="text-white/20 text-[10px] font-bold uppercase tracking-[0.3em]">
            FreeSpeak &copy; 2026 • The Void Listens
          </p>
          <div className="bg-white/5 px-4 py-2 rounded-lg border border-white/5">
            <p className="text-[9px] text-white/30 max-w-sm leading-relaxed">
              This platform uses client-side session identification. We do not store any personal data. All entries are automatically filtered out 24 hours after their creation.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
