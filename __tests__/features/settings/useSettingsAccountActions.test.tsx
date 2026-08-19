import AsyncStorage from "@react-native-async-storage/async-storage";
import { act, renderHook, waitFor } from "@testing-library/react-native";
import { deleteUser, signOut } from "firebase/auth";
import { get, update } from "firebase/database";
import { Alert } from "react-native";

import { useSettingsAccountActions } from "../../../features/settings/useSettingsAccountActions";
import { PRIMARY_DDAY_KEY } from "../../../utils/dday";
import { auth } from "../../../utils/firebaseConfig";
import { USER_PROFILE_KEY } from "../../../utils/userProfileStorage";

const setCurrentUser = (user: unknown) => {
  Object.defineProperty(auth, "currentUser", {
    configurable: true,
    value: user,
    writable: true,
  });
};

const pressAlertButton = async (index: number) => {
  const buttons = jest.mocked(Alert.alert).mock.calls.at(-1)?.[2];
  if (Array.isArray(buttons)) {
    await buttons[index]?.onPress?.();
  }
};

describe("useSettingsAccountActions", () => {
  const onExitToLogin = jest.fn();

  beforeEach(async () => {
    await AsyncStorage.clear();
    jest.clearAllMocks();
    jest.spyOn(Alert, "alert").mockImplementation(jest.fn());
    setCurrentUser(null);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("logs out after confirmation and clears local session data", async () => {
    await AsyncStorage.multiSet([
      [USER_PROFILE_KEY, "profile"],
      ["active_session", "active"],
      ["study_sessions", "sessions"],
    ]);
    const { result } = await renderHook(() =>
      useSettingsAccountActions({ onExitToLogin }),
    );

    await act(async () => {
      result.current.handleLogout();
    });
    await act(async () => {
      await pressAlertButton(1);
    });

    expect(signOut).toHaveBeenCalledWith(auth);
    expect(onExitToLogin).toHaveBeenCalled();
    await expect(AsyncStorage.getItem(USER_PROFILE_KEY)).resolves.toBeNull();
    await expect(AsyncStorage.getItem("active_session")).resolves.toBeNull();
    await expect(AsyncStorage.getItem("study_sessions")).resolves.toBe(
      "sessions",
    );
    expect(result.current.accountBusy).toBe(false);
  });

  it("clears local account data when deleting without a signed-in user", async () => {
    await AsyncStorage.multiSet([
      [USER_PROFILE_KEY, "profile"],
      ["study_sessions", "sessions"],
      ["active_session", "active"],
      ["group_member_profile", "member"],
      [PRIMARY_DDAY_KEY, "dday"],
    ]);
    const { result } = await renderHook(() =>
      useSettingsAccountActions({ onExitToLogin }),
    );

    await act(async () => {
      result.current.handleDeleteAccount();
    });
    await act(async () => {
      await pressAlertButton(1);
    });

    expect(deleteUser).not.toHaveBeenCalled();
    expect(onExitToLogin).toHaveBeenCalled();
    await expect(AsyncStorage.getItem(USER_PROFILE_KEY)).resolves.toBeNull();
    await expect(AsyncStorage.getItem("study_sessions")).resolves.toBeNull();
    await expect(AsyncStorage.getItem("group_member_profile")).resolves.toBeNull();
  });

  it("deletes remote account data and Firebase user after confirmation", async () => {
    const user = { uid: "user-1" };
    setCurrentUser(user);
    jest
      .mocked(get)
      .mockResolvedValueOnce({
        val: () => ({
          mine: { authorId: "user-1" },
          other: { authorId: "other" },
        }),
      } as never)
      .mockResolvedValueOnce({
        val: () => ({
          mine: { other: true },
          other: { "user-1": true },
        }),
      } as never)
      .mockResolvedValueOnce({
        val: () => ({
          mine: { c1: { authorId: "other" } },
          other: { c2: { authorId: "user-1" } },
        }),
      } as never)
      .mockResolvedValueOnce({
        val: () => ({
          owned: { ownerId: "user-1", code: "ABC123" },
          joined: { ownerId: "other", members: { "user-1": true } },
        }),
      } as never);
    const { result } = await renderHook(() =>
      useSettingsAccountActions({ onExitToLogin }),
    );

    await act(async () => {
      result.current.handleDeleteAccount();
    });
    await act(async () => {
      await pressAlertButton(1);
    });

    await waitFor(() => {
      expect(deleteUser).toHaveBeenCalledWith(user);
    });
    expect(update).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        "users/user-1": null,
        "communityPosts/mine": null,
        "communityPostCheers/mine/other": null,
        "communityPostCheers/other/user-1": null,
        "communityPostComments/mine/c1": null,
        "communityPostComments/other/c2": null,
        "rooms/owned": null,
        "roomCodes/ABC123": null,
        "rooms/joined/members/user-1": null,
      }),
    );
    expect(onExitToLogin).toHaveBeenCalled();
    expect(result.current.accountBusy).toBe(false);
  });

  it("deletes a signed-in account when remote cleanup snapshots are empty", async () => {
    const user = { uid: "user-empty" };
    setCurrentUser(user);
    jest.mocked(get).mockResolvedValue({ val: () => null } as never);
    const { result } = await renderHook(() =>
      useSettingsAccountActions({ onExitToLogin }),
    );

    await act(async () => {
      result.current.handleDeleteAccount();
    });
    await act(async () => {
      await pressAlertButton(1);
    });

    expect(update).toHaveBeenCalledWith(expect.anything(), {
      "users/user-empty": null,
      "publicProfiles/user-empty": null,
      "userRooms/user-empty": null,
    });
    expect(deleteUser).toHaveBeenCalledWith(user);
    expect(onExitToLogin).toHaveBeenCalled();
  });

  it("shows a recent-login warning when Firebase requires reauth", async () => {
    setCurrentUser({ uid: "user-1" });
    jest.mocked(get).mockResolvedValue({ val: () => ({}) } as never);
    jest
      .mocked(deleteUser)
      .mockRejectedValueOnce({ code: "auth/requires-recent-login" });
    const { result } = await renderHook(() =>
      useSettingsAccountActions({ onExitToLogin }),
    );

    await act(async () => {
      result.current.handleDeleteAccount();
    });
    await act(async () => {
      await pressAlertButton(1);
    });

    expect(Alert.alert).toHaveBeenCalledTimes(2);
    expect(onExitToLogin).not.toHaveBeenCalled();
    expect(result.current.accountBusy).toBe(false);
  });

  it("shows a generic delete failure for other account deletion errors", async () => {
    setCurrentUser({ uid: "user-1" });
    jest.mocked(get).mockRejectedValueOnce(new Error("network"));
    const { result } = await renderHook(() =>
      useSettingsAccountActions({ onExitToLogin }),
    );

    await act(async () => {
      result.current.handleDeleteAccount();
    });
    await act(async () => {
      await pressAlertButton(1);
    });

    expect(Alert.alert).toHaveBeenCalledTimes(2);
    expect(onExitToLogin).not.toHaveBeenCalled();
  });
});
