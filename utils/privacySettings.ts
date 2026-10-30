import AsyncStorage from "@react-native-async-storage/async-storage";
import { get, ref } from "firebase/database";

import { auth, db } from "./firebaseConfig";

export const STUDY_STATUS_PUBLIC_KEY = "settings_study_status_public";
export const COMMUNITY_ACTIVITY_PUBLIC_KEY = "settings_community_activity_public";

export const loadStudyStatusPublic = async () => {
  const value = await AsyncStorage.getItem(STUDY_STATUS_PUBLIC_KEY);
  if (value !== null) return value !== "false";

  const uid = auth.currentUser?.uid;
  if (!uid) return true;

  try {
    const snapshot = await get(ref(db, `users/${uid}/studyStatusPublic`));
    const remoteValue = snapshot.val();
    if (typeof remoteValue === "boolean") {
      await saveStudyStatusPublic(remoteValue);
      return remoteValue;
    }
  } catch {
    // Use the default privacy setting if the profile cannot be read.
  }

  return true;
};

export const loadCommunityActivityPublic = async () => {
  const value = await AsyncStorage.getItem(COMMUNITY_ACTIVITY_PUBLIC_KEY);
  return value === "true";
};

export const saveStudyStatusPublic = async (value: boolean) => {
  await AsyncStorage.setItem(STUDY_STATUS_PUBLIC_KEY, String(value));
};

export const saveCommunityActivityPublic = async (value: boolean) => {
  await AsyncStorage.setItem(COMMUNITY_ACTIVITY_PUBLIC_KEY, String(value));
};
