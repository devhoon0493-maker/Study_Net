import AsyncStorage from "@react-native-async-storage/async-storage";

export const USER_PROFILE_KEY = "userProfile";

export type StoredUserProfile = {
  uid?: string;
  name?: string;
  email?: string;
  image?: string | null;
  userType?: string;
  bio?: string;
  color?: string;
  studyStatusPublic?: boolean;
  communityActivityPublic?: boolean;
  createdAt?: number;
  updatedAt?: number;
};

export const loadStoredUserProfile = async () => {
  try {
    const raw = await AsyncStorage.getItem(USER_PROFILE_KEY);
    return raw ? (JSON.parse(raw) as StoredUserProfile) : null;
  } catch {
    return null;
  }
};

export const saveStoredUserProfile = async (profile: StoredUserProfile) => {
  await AsyncStorage.setItem(USER_PROFILE_KEY, JSON.stringify(profile));
};
