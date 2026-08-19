import { initializeApp, type FirebaseOptions } from "firebase/app";
import { getDatabase } from "firebase/database";
import { getAuth } from "firebase/auth";
import { getStorage } from "firebase/storage";

const requireEnv = (name: string) => {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
};

export const firebaseConfig: FirebaseOptions = {
  apiKey: requireEnv("EXPO_PUBLIC_FIREBASE_API_KEY"),
  authDomain: requireEnv("EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN"),
  databaseURL: requireEnv("EXPO_PUBLIC_FIREBASE_DATABASE_URL"),
  projectId: requireEnv("EXPO_PUBLIC_FIREBASE_PROJECT_ID"),
  storageBucket: requireEnv("EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET"),
  messagingSenderId: requireEnv("EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID"),
  appId: requireEnv("EXPO_PUBLIC_FIREBASE_APP_ID"),
};

export const app = initializeApp(firebaseConfig);
export const db = getDatabase(app);
export const auth = getAuth(app);
export const storage = getStorage(app);
