import AsyncStorage from "@react-native-async-storage/async-storage";
import { act, renderHook, waitFor } from "@testing-library/react-native";
import { ref, update } from "firebase/database";
import { Alert } from "react-native";

import {
  PUBLIC_PROFILE_BIO_MAX_LENGTH,
  usePublicProfileForm,
} from "../../../features/settings/usePublicProfileForm";
import { auth } from "../../../utils/firebaseConfig";
import { USER_PROFILE_KEY } from "../../../utils/userProfileStorage";

const setCurrentUser = (user: unknown) => {
  Object.defineProperty(auth, "currentUser", {
    configurable: true,
    value: user,
    writable: true,
  });
};

describe("usePublicProfileForm", () => {
  const onSaved = jest.fn();

  beforeEach(async () => {
    await AsyncStorage.clear();
    jest.clearAllMocks();
    jest.spyOn(Alert, "alert").mockImplementation(jest.fn());
    setCurrentUser(null);
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it("loads stored profile and clamps bio length", async () => {
    await AsyncStorage.setItem(
      USER_PROFILE_KEY,
      JSON.stringify({ uid: "stored", bio: "hello" }),
    );

    const { result } = await renderHook(() => usePublicProfileForm({ onSaved }));

    await waitFor(() => {
      expect(result.current).not.toBeNull();
    });
    await waitFor(() => {
      expect(result.current.profile.uid).toBe("stored");
      expect(result.current.bio).toBe("hello");
    });

    const longBio = "x".repeat(PUBLIC_PROFILE_BIO_MAX_LENGTH + 10);
    await act(async () => {
      result.current.updateBio(longBio);
    });

    expect(result.current.bio).toHaveLength(PUBLIC_PROFILE_BIO_MAX_LENGTH);
  });

  it("blocks saving a stored bio that exceeds the public profile limit", async () => {
    await AsyncStorage.setItem(
      USER_PROFILE_KEY,
      JSON.stringify({
        uid: "stored",
        bio: "x".repeat(PUBLIC_PROFILE_BIO_MAX_LENGTH + 1),
      }),
    );
    const { result } = await renderHook(() => usePublicProfileForm({ onSaved }));

    await waitFor(() => {
      expect(result.current.bio).toHaveLength(
        PUBLIC_PROFILE_BIO_MAX_LENGTH + 1,
      );
    });
    await act(async () => {
      await result.current.savePublicProfile();
    });

    expect(Alert.alert).toHaveBeenCalled();
    expect(update).not.toHaveBeenCalled();
    expect(onSaved).not.toHaveBeenCalled();
  });

  it("uses an empty profile when stored profile loading fails", async () => {
    jest.spyOn(AsyncStorage, "getItem").mockRejectedValueOnce(new Error("bad"));

    const { result } = await renderHook(() => usePublicProfileForm({ onSaved }));

    await waitFor(() => {
      expect(result.current.profile).toEqual({});
      expect(result.current.bio).toBe("");
    });
  });

  it("saves public profile locally and remotely when uid exists", async () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date("2026-07-28T00:00:00Z"));
    setCurrentUser({ uid: "auth-user" });

    const { result } = await renderHook(() => usePublicProfileForm({ onSaved }));

    await waitFor(() => {
      expect(result.current).not.toBeNull();
    });

    await act(async () => {
      result.current.updateBio("  public bio  ");
    });
    await act(async () => {
      await result.current.savePublicProfile();
    });

    const saved = JSON.parse((await AsyncStorage.getItem(USER_PROFILE_KEY))!);
    expect(saved).toMatchObject({
      uid: "auth-user",
      bio: "public bio",
      updatedAt: Date.now(),
    });
    expect(ref).toHaveBeenCalledWith(expect.anything(), "users/auth-user");
    expect(update).toHaveBeenCalledWith(expect.anything(), {
      bio: "public bio",
      updatedAt: Date.now(),
    });
    expect(onSaved).toHaveBeenCalled();
  });

  it("ignores duplicate public profile saves while saving", async () => {
    setCurrentUser({ uid: "auth-user" });
    let resolveUpdate: (() => void) | undefined;
    jest.mocked(update).mockReturnValueOnce(
      new Promise<void>((resolve) => {
        resolveUpdate = resolve;
      }) as never,
    );
    const { result } = await renderHook(() => usePublicProfileForm({ onSaved }));

    await waitFor(() => {
      expect(result.current).not.toBeNull();
    });
    await act(async () => {
      result.current.updateBio("public bio");
    });

    let firstSave: Promise<void>;
    await act(async () => {
      firstSave = result.current.savePublicProfile();
    });
    expect(result.current.saving).toBe(true);
    await act(async () => {
      await result.current.savePublicProfile();
    });
    expect(update).toHaveBeenCalledTimes(1);

    await act(async () => {
      resolveUpdate?.();
      await firstSave!;
    });
  });

  it("saves public profile locally when no uid exists", async () => {
    const { result } = await renderHook(() => usePublicProfileForm({ onSaved }));

    await waitFor(() => {
      expect(result.current).not.toBeNull();
    });

    await act(async () => {
      result.current.updateBio("local only");
    });
    await act(async () => {
      await result.current.savePublicProfile();
    });

    const saved = JSON.parse((await AsyncStorage.getItem(USER_PROFILE_KEY))!);
    expect(saved).toMatchObject({ bio: "local only" });
    expect(update).not.toHaveBeenCalled();
    expect(onSaved).toHaveBeenCalled();
  });

  it("shows an alert if saving fails", async () => {
    jest.mocked(update).mockRejectedValueOnce(new Error("failed"));
    setCurrentUser({ uid: "auth-user" });
    const { result } = await renderHook(() => usePublicProfileForm({ onSaved }));

    await waitFor(() => {
      expect(result.current).not.toBeNull();
    });

    await act(async () => {
      result.current.updateBio("bio");
    });
    await act(async () => {
      await result.current.savePublicProfile();
    });

    expect(Alert.alert).toHaveBeenCalled();
  });
});
