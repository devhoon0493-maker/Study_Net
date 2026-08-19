import AsyncStorage from "@react-native-async-storage/async-storage";
import { act, renderHook, waitFor } from "@testing-library/react-native";
import * as FileSystem from "expo-file-system/legacy";
import * as ImagePicker from "expo-image-picker";
import { updateProfile } from "firebase/auth";
import { update } from "firebase/database";
import {
  deleteObject,
  getDownloadURL,
  uploadString,
} from "firebase/storage";
import { Alert } from "react-native";

import { useProfileForm } from "../../../features/settings/useProfileForm";
import { auth } from "../../../utils/firebaseConfig";
import { USER_PROFILE_KEY } from "../../../utils/userProfileStorage";

jest.mock("expo-file-system/legacy", () => ({
  EncodingType: { Base64: "base64" },
  readAsStringAsync: jest.fn(() => Promise.resolve("file-base64")),
}));

jest.mock("expo-image-picker", () => ({
  MediaTypeOptions: { Images: "Images" },
  launchImageLibraryAsync: jest.fn(() =>
    Promise.resolve({
      canceled: true,
      assets: [],
    }),
  ),
  requestMediaLibraryPermissionsAsync: jest.fn(() =>
    Promise.resolve({ granted: true }),
  ),
}));

const setCurrentUser = (user: unknown) => {
  Object.defineProperty(auth, "currentUser", {
    configurable: true,
    value: user,
    writable: true,
  });
};

describe("useProfileForm", () => {
  const onSaved = jest.fn();

  beforeEach(async () => {
    await AsyncStorage.clear();
    jest.clearAllMocks();
    jest.spyOn(Alert, "alert").mockImplementation(jest.fn());
    jest.useFakeTimers();
    jest.setSystemTime(new Date("2026-07-28T00:00:00Z"));
    setCurrentUser({
      uid: "user-1",
      email: "auth@example.com",
    });
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it("loads stored profile values", async () => {
    await AsyncStorage.setItem(
      USER_PROFILE_KEY,
      JSON.stringify({
        uid: "stored-user",
        name: "Stored Name",
        email: "stored@example.com",
        image: "https://cdn.example.com/old.jpg",
        userType: "Student",
      }),
    );

    const { result } = await renderHook(() => useProfileForm({ onSaved }));

    await waitFor(() => {
      expect(result.current.name).toBe("Stored Name");
      expect(result.current.email).toBe("stored@example.com");
      expect(result.current.image).toBe("https://cdn.example.com/old.jpg");
      expect(result.current.userType).toBe("Student");
    });
  });

  it("loads empty defaults for missing stored profile fields", async () => {
    await AsyncStorage.setItem(USER_PROFILE_KEY, JSON.stringify({}));

    const { result } = await renderHook(() => useProfileForm({ onSaved }));

    await waitFor(() => {
      expect(result.current.name).toBe("");
      expect(result.current.email).toBe("");
      expect(result.current.image).toBeNull();
      expect(result.current.userType).toBe("");
    });
  });

  it("blocks saving when required fields are empty", async () => {
    const { result } = await renderHook(() => useProfileForm({ onSaved }));

    await waitFor(() => {
      expect(result.current).not.toBeNull();
    });

    await act(async () => {
      await result.current.handleSave();
    });

    expect(Alert.alert).toHaveBeenCalled();
    expect(update).not.toHaveBeenCalled();
    expect(onSaved).not.toHaveBeenCalled();
  });

  it("shows an alert when image permission is denied", async () => {
    jest
      .mocked(ImagePicker.requestMediaLibraryPermissionsAsync)
      .mockResolvedValueOnce({ granted: false } as never);
    const { result } = await renderHook(() => useProfileForm({ onSaved }));

    await waitFor(() => {
      expect(result.current).not.toBeNull();
    });

    await act(async () => {
      await result.current.pickImage();
    });

    expect(Alert.alert).toHaveBeenCalled();
    expect(ImagePicker.launchImageLibraryAsync).not.toHaveBeenCalled();
  });

  it("stores a picked image as an embedded base64 URI", async () => {
    jest.mocked(ImagePicker.launchImageLibraryAsync).mockResolvedValueOnce({
      canceled: false,
      assets: [{ uri: "file:///avatar.jpg", base64: "picked-base64" }],
    } as never);
    const { result } = await renderHook(() => useProfileForm({ onSaved }));

    await waitFor(() => {
      expect(result.current).not.toBeNull();
    });

    await act(async () => {
      await result.current.pickImage();
    });

    expect(result.current.image).toBe("data:image/jpeg;base64,picked-base64");
  });

  it("keeps the current image when image picking is canceled", async () => {
    const { result } = await renderHook(() => useProfileForm({ onSaved }));

    await waitFor(() => {
      expect(result.current).not.toBeNull();
    });

    await act(async () => {
      await result.current.pickImage();
    });

    expect(result.current.image).toBeNull();
  });

  it("saves profile locally and syncs Firebase profile data", async () => {
    const { result } = await renderHook(() => useProfileForm({ onSaved }));

    await waitFor(() => {
      expect(result.current).not.toBeNull();
    });

    await act(async () => {
      result.current.setName("  New Name  ");
      result.current.setEmail("  new@example.com  ");
      result.current.setUserType("Student");
    });
    await act(async () => {
      await result.current.handleSave();
    });

    const saved = JSON.parse((await AsyncStorage.getItem(USER_PROFILE_KEY))!);
    expect(saved).toMatchObject({
      uid: "user-1",
      name: "New Name",
      email: "new@example.com",
      image: null,
      userType: "Student",
      updatedAt: Date.now(),
    });
    expect(updateProfile).toHaveBeenCalledWith(auth.currentUser, {
      displayName: "New Name",
      photoURL: null,
    });
    expect(update).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        name: "New Name",
        email: "new@example.com",
      }),
    );
    expect(onSaved).toHaveBeenCalled();
  });

  it("uploads a new local image before saving", async () => {
    const { result } = await renderHook(() => useProfileForm({ onSaved }));

    await waitFor(() => {
      expect(result.current).not.toBeNull();
    });

    await act(async () => {
      result.current.setName("New Name");
      result.current.setEmail("new@example.com");
    });
    jest.mocked(ImagePicker.launchImageLibraryAsync).mockResolvedValueOnce({
      canceled: false,
      assets: [{ uri: "file:///avatar.jpg" }],
    } as never);
    await act(async () => {
      await result.current.pickImage();
    });
    await act(async () => {
      await result.current.handleSave();
    });

    expect(FileSystem.readAsStringAsync).toHaveBeenCalledWith(
      "file:///avatar.jpg",
      { encoding: FileSystem.EncodingType.Base64 },
    );
    expect(uploadString).toHaveBeenCalledWith(
      expect.anything(),
      "data:image/jpeg;base64,file-base64",
      "data_url",
      expect.objectContaining({
        contentType: "image/jpeg",
        customMetadata: { owner: "user-1" },
      }),
    );
    expect(getDownloadURL).toHaveBeenCalled();
    expect(updateProfile).toHaveBeenCalledWith(
      auth.currentUser,
      expect.objectContaining({
        photoURL: "https://cdn.example.com/avatar.jpg",
      }),
    );
  });

  it("uploads an embedded image without reading from the file system", async () => {
    const { result } = await renderHook(() => useProfileForm({ onSaved }));

    await waitFor(() => {
      expect(result.current).not.toBeNull();
    });

    await act(async () => {
      result.current.setName("New Name");
      result.current.setEmail("new@example.com");
    });
    jest.mocked(ImagePicker.launchImageLibraryAsync).mockResolvedValueOnce({
      canceled: false,
      assets: [{ uri: "file:///avatar.jpg", base64: "picked-base64" }],
    } as never);
    await act(async () => {
      await result.current.pickImage();
    });
    jest.mocked(FileSystem.readAsStringAsync).mockClear();
    await act(async () => {
      await result.current.handleSave();
    });

    expect(FileSystem.readAsStringAsync).not.toHaveBeenCalled();
    expect(uploadString).toHaveBeenCalledWith(
      expect.anything(),
      "data:image/jpeg;base64,picked-base64",
      "data_url",
      expect.anything(),
    );
  });


  it("preserves an existing remote image without reuploading", async () => {
    await AsyncStorage.setItem(
      USER_PROFILE_KEY,
      JSON.stringify({
        uid: "user-1",
        name: "Old Name",
        email: "old@example.com",
        image: "https://cdn.example.com/old.jpg",
      }),
    );
    const { result } = await renderHook(() => useProfileForm({ onSaved }));

    await waitFor(() => {
      expect(result.current.name).toBe("Old Name");
    });

    await act(async () => {
      result.current.setName("Old Name");
      result.current.setEmail("old@example.com");
    });
    await act(async () => {
      await result.current.handleSave();
    });

    const saved = JSON.parse((await AsyncStorage.getItem(USER_PROFILE_KEY))!);
    expect(saved.image).toBe("https://cdn.example.com/old.jpg");
    expect(uploadString).not.toHaveBeenCalled();
    expect(deleteObject).not.toHaveBeenCalled();
  });

  it("saves using a stored uid without updating the Firebase auth profile", async () => {
    setCurrentUser(null);
    await AsyncStorage.setItem(
      USER_PROFILE_KEY,
      JSON.stringify({
        uid: "stored-user",
        name: "Stored Name",
        email: "stored@example.com",
      }),
    );
    const { result } = await renderHook(() => useProfileForm({ onSaved }));

    await waitFor(() => {
      expect(result.current.name).toBe("Stored Name");
    });

    await act(async () => {
      await result.current.handleSave();
    });

    expect(updateProfile).not.toHaveBeenCalled();
    expect(update).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ uid: "stored-user" }),
    );
    expect(onSaved).toHaveBeenCalled();
  });

  it("deletes a previous remote image when saving with no next image", async () => {
    const { result } = await renderHook(() => useProfileForm({ onSaved }));

    await waitFor(() => {
      expect(result.current).not.toBeNull();
    });
    await AsyncStorage.setItem(
      USER_PROFILE_KEY,
      JSON.stringify({
        uid: "user-1",
        name: "Old Name",
        email: "old@example.com",
        image: "https://cdn.example.com/old.jpg",
      }),
    );
    jest.mocked(deleteObject).mockRejectedValueOnce(new Error("already gone"));

    await act(async () => {
      result.current.setName("New Name");
      result.current.setEmail("new@example.com");
    });
    await act(async () => {
      await result.current.handleSave();
    });

    expect(deleteObject).toHaveBeenCalled();
    expect(onSaved).toHaveBeenCalled();
  });

  it("shows save errors when login data is missing or image upload fails", async () => {
    setCurrentUser(null);
    const { result } = await renderHook(() => useProfileForm({ onSaved }));

    await waitFor(() => {
      expect(result.current).not.toBeNull();
    });
    await act(async () => {
      result.current.setName("New Name");
      result.current.setEmail("new@example.com");
    });
    await act(async () => {
      await result.current.handleSave();
    });
    expect(Alert.alert).toHaveBeenCalled();
    expect(onSaved).not.toHaveBeenCalled();

    setCurrentUser({ uid: "user-1", email: "auth@example.com" });
    jest.mocked(Alert.alert).mockClear();
    jest.mocked(ImagePicker.launchImageLibraryAsync).mockResolvedValue({
      canceled: false,
      assets: [{ uri: "file:///avatar.jpg" }],
    } as never);

    for (const code of [
      "storage/unauthorized",
      "storage/canceled",
      "storage/retry-limit-exceeded",
      "storage/other",
    ]) {
      jest.mocked(uploadString).mockRejectedValueOnce({ code });
      await act(async () => {
        await result.current.pickImage();
      });
      await act(async () => {
        await result.current.handleSave();
      });
    }

    jest.mocked(FileSystem.readAsStringAsync).mockRejectedValueOnce(
      new Error("image-read-failed"),
    );
    await act(async () => {
      await result.current.pickImage();
    });
    await act(async () => {
      await result.current.handleSave();
    });

    expect(Alert.alert).toHaveBeenCalledTimes(5);
  });
});
