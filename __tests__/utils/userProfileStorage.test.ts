import AsyncStorage from "@react-native-async-storage/async-storage";

import {
  loadStoredUserProfile,
  saveStoredUserProfile,
  USER_PROFILE_KEY,
} from "../../utils/userProfileStorage";

describe("userProfileStorage", () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it("saves and loads stored user profiles", async () => {
    await saveStoredUserProfile({
      uid: "user-1",
      name: "Tester",
      email: "tester@example.com",
    });

    await expect(loadStoredUserProfile()).resolves.toMatchObject({
      uid: "user-1",
      name: "Tester",
      email: "tester@example.com",
    });
  });

  it("returns null when the stored profile is missing or malformed", async () => {
    await expect(loadStoredUserProfile()).resolves.toBeNull();

    await AsyncStorage.setItem(USER_PROFILE_KEY, "{bad json");

    await expect(loadStoredUserProfile()).resolves.toBeNull();
  });
});
