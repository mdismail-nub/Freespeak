import { useState, useEffect } from "react";
import { UserProfile } from "../types";
import { generateAnonymousName } from "../lib/utils";
import { auth } from "../lib/firebase";
import { signInAnonymously, onAuthStateChanged } from "firebase/auth";

const STORAGE_KEY = "freespeak_user_name";

export function useAnonymousUser() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    // 1. Get or generate name from local storage
    let name = localStorage.getItem(STORAGE_KEY);
    if (!name) {
      name = generateAnonymousName();
      localStorage.setItem(STORAGE_KEY, name);
    }

    // 2. Sign in anonymously to Firebase
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      if (fbUser) {
        setUser({
          name: name!,
          id: fbUser.uid
        });
        setAuthError(null);
      } else {
        try {
          await signInAnonymously(auth);
        } catch (err: any) {
          console.error("Firebase Anonymous Auth Error:", err);
          if (err.code === "auth/admin-restricted-operation" || err.code === "auth/operation-not-allowed") {
            setAuthError("Anonymous authentication is disabled in your Firebase Console. This is required for security and features like unique likes. Please enable it to continue.");
          } else {
            setAuthError(err.message);
          }
        }
      }
    });

    return () => unsubscribe();
  }, []);

  return { user, authError };
}
