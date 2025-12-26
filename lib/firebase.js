// lib/firebase.js
import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyBA9FB_XVujhIj7emoVIdohvK0_QPA7fAI",
  authDomain: "discord-app-f5ebb.firebaseapp.com",
  projectId: "discord-app-f5ebb",
  storageBucket: "discord-app-f5ebb.firebasestorage.app",
  messagingSenderId: "545483803793",
  appId: "1:545483803793:web:4bae5ac75e3e4434a40330"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();