import { initializeApp, type FirebaseOptions } from "firebase/app";
import { getDatabase } from "firebase/database";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as FirebaseAuth from "firebase/auth";
import type { Persistence } from "firebase/auth";
import { Platform } from "react-native";

const requireEnv = (name: string, value: string | undefined) => {
  const trimmedValue = value?.trim();
  if (!trimmedValue) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return trimmedValue;
};

export const firebaseConfig: FirebaseOptions = {
  apiKey: requireEnv(
    "EXPO_PUBLIC_FIREBASE_API_KEY",
    process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  ),
  authDomain: requireEnv(
    "EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN",
    process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  ),
  databaseURL: requireEnv(
    "EXPO_PUBLIC_FIREBASE_DATABASE_URL",
    process.env.EXPO_PUBLIC_FIREBASE_DATABASE_URL,
  ),
  projectId: requireEnv(
    "EXPO_PUBLIC_FIREBASE_PROJECT_ID",
    process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  ),
  storageBucket: requireEnv(
    "EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET",
    process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  ),
  messagingSenderId: requireEnv(
    "EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID",
    process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  ),
  appId: requireEnv(
    "EXPO_PUBLIC_FIREBASE_APP_ID",
    process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
  ),
};

export const app = initializeApp(firebaseConfig);
export const db = getDatabase(app);
const getReactNativePersistence = (
  FirebaseAuth as typeof FirebaseAuth & {
    getReactNativePersistence: (storage: typeof AsyncStorage) => Persistence;
  }
).getReactNativePersistence;

export const auth =
  Platform.OS === "web"
    ? FirebaseAuth.getAuth(app)
    : FirebaseAuth.initializeAuth(app, {
        persistence: getReactNativePersistence(AsyncStorage),
      });
