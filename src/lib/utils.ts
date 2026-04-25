import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const ADJECTIVES = [
  "Silent", "Swift", "Blue", "Golden", "Mystic", "Lunar", "Solar", "Wild", 
  "Ethereal", "Zen", "Crimson", "Shadow", "Neon", "Cosmic", "Glitch", "Retro"
];

const NOUNS = [
  "Fox", "Wolf", "Raven", "Moon", "Star", "Cloud", "Ghost", "Echo", 
  "Coder", "Dreamer", "Nomad", "Stellar", "Aurora", "Spirit", "Pulse", "Wanderer"
];

export function generateAnonymousName(): string {
  const adj = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
  const noun = NOUNS[Math.floor(Math.random() * NOUNS.length)];
  const tag = Math.floor(1000 + Math.random() * 9000);
  return `${adj}${noun}#${tag}`;
}

export function generateId(): string {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}
