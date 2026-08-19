import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  COMMUNITY_ACTIVITY_PUBLIC_KEY,
  STUDY_STATUS_PUBLIC_KEY,
  loadCommunityActivityPublic,
  loadStudyStatusPublic,
  saveCommunityActivityPublic,
  saveStudyStatusPublic,
} from "../../utils/privacySettings";

describe("privacy settings", () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it("uses the intended defaults when storage is empty", async () => {
    await expect(loadStudyStatusPublic()).resolves.toBe(true);
    await expect(loadCommunityActivityPublic()).resolves.toBe(false);
  });

  it("loads persisted boolean string values", async () => {
    await AsyncStorage.setItem(STUDY_STATUS_PUBLIC_KEY, "false");
    await AsyncStorage.setItem(COMMUNITY_ACTIVITY_PUBLIC_KEY, "true");

    await expect(loadStudyStatusPublic()).resolves.toBe(false);
    await expect(loadCommunityActivityPublic()).resolves.toBe(true);
  });

  it("saves privacy settings as strings", async () => {
    await saveStudyStatusPublic(false);
    await saveCommunityActivityPublic(true);

    await expect(AsyncStorage.getItem(STUDY_STATUS_PUBLIC_KEY)).resolves.toBe(
      "false",
    );
    await expect(
      AsyncStorage.getItem(COMMUNITY_ACTIVITY_PUBLIC_KEY),
    ).resolves.toBe("true");
  });
});
