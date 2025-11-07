import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

// Firebase configuration
// You can either:
// 1. Replace these values directly with your Firebase config, OR
// 2. Create a .env file (copy from .env.example) and use environment variables
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyBBss-NIYBAfTiRlEpY6f2B-6nHE7Z6fo8",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "gamefolio-29d27.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "gamefolio-29d27",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "gamefolio-29d27.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "651668185617",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:651668185617:web:1058c305c4d255a1e3c7b0"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize services
export const db = getFirestore(app);
export const storage = getStorage(app);
