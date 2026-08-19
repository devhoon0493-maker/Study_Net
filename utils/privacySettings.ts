import AsyncStorage from "@react-native-async-storage/async-storage";

export const STUDY_STATUS_PUBLIC_KEY = "settings_study_status_public";
export const COMMUNITY_ACTIVITY_PUBLIC_KEY = "settings_community_activity_public";

export const loadStudyStatusPublic = async () => {
  const value = await AsyncStorage.getItem(STUDY_STATUS_PUBLIC_KEY);
  return value !== "false";
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
