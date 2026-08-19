import AsyncStorage from "@react-native-async-storage/async-storage";
import { act, renderHook, waitFor } from "@testing-library/react-native";
import * as ImagePicker from "expo-image-picker";
import { Alert } from "react-native";

import { categories } from "../../../features/community/communityConstants";
import { useCommunityAuthorProfile } from "../../../features/community/useCommunityAuthorProfile";
import { useCommunityBookmarks } from "../../../features/community/useCommunityBookmarks";
import { useCommunityComposeDraft } from "../../../features/community/useCommunityComposeDraft";
import { getCommunityBookmarkStorageKey } from "../../../utils/communityBookmarks";
import { USER_PROFILE_KEY } from "../../../utils/userProfileStorage";

const defaultPostCategory = categories[2];
const groupPostCategory = categories[5];
const questionCategory = categories[3];

describe("community small hooks", () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    jest.clearAllMocks();
    jest.spyOn(Alert, "alert").mockImplementation(jest.fn());
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("manages compose draft fields and group code normalization", async () => {
    const { result } = await renderHook(() => useCommunityComposeDraft());

    await waitFor(() => {
      expect(result.current).not.toBeNull();
    });
    expect(result.current.draftCategory).toBe(defaultPostCategory);

    await act(async () => {
      result.current.setDraftTitle("Title");
      result.current.setDraftBody("Body");
      result.current.changeCategory(groupPostCategory);
      result.current.changeGroupCode("ab-cd-1234!");
    });

    expect(result.current.draftTitle).toBe("Title");
    expect(result.current.draftBody).toBe("Body");
    expect(result.current.draftCategory).toBe(groupPostCategory);
    expect(result.current.draftGroupCode).toBe("ABCD12");

    await act(async () => {
      result.current.changeCategory(questionCategory);
    });

    expect(result.current.draftCategory).toBe(questionCategory);
    expect(result.current.draftGroupCode).toBe("");

    await act(async () => {
      result.current.resetDraft();
    });

    expect(result.current).toMatchObject({
      draftCategory: defaultPostCategory,
      draftGroupCode: "",
      draftTitle: "",
      draftBody: "",
      draftImage: null,
    });
  });

  it("picks embedded, uri fallback, and removable draft images", async () => {
    jest.spyOn(ImagePicker, "launchImageLibraryAsync").mockResolvedValueOnce({
      canceled: false,
      assets: [{ base64: "abc", uri: "file://ignored.jpg" }],
    } as never);

    const { result } = await renderHook(() => useCommunityComposeDraft());

    await act(async () => {
      await result.current.pickImage();
    });
    expect(result.current.draftImage).toBe("data:image/jpeg;base64,abc");

    jest.spyOn(ImagePicker, "launchImageLibraryAsync").mockResolvedValueOnce({
      canceled: false,
      assets: [{ uri: "file://picked.jpg" }],
    } as never);

    await act(async () => {
      await result.current.pickImage();
    });
    expect(result.current.draftImage).toBe("file://picked.jpg");

    await act(async () => {
      result.current.removeImage();
    });
    expect(result.current.draftImage).toBeNull();
  });

  it("ignores canceled draft image picking", async () => {
    jest.spyOn(ImagePicker, "launchImageLibraryAsync").mockResolvedValueOnce({
      canceled: true,
      assets: [],
    } as never);

    const { result } = await renderHook(() => useCommunityComposeDraft());

    await act(async () => {
      await result.current.pickImage();
    });

    expect(result.current.draftImage).toBeNull();
  });

  it("loads, toggles, and persists community bookmarks", async () => {
    await AsyncStorage.setItem(
      getCommunityBookmarkStorageKey("uid"),
      JSON.stringify(["post-1", 3, "post-2"]),
    );

    const { result } = await renderHook(() => useCommunityBookmarks("uid"));

    await act(async () => {
      await result.current.loadBookmarks();
    });
    expect([...result.current.bookmarkedPostIds].sort()).toEqual([
      "post-1",
      "post-2",
    ]);

    await act(async () => {
      await result.current.toggleBookmark("post-1");
    });
    expect([...result.current.bookmarkedPostIds]).toEqual(["post-2"]);

    await act(async () => {
      await result.current.toggleBookmark("post-3");
    });
    expect([...result.current.bookmarkedPostIds].sort()).toEqual([
      "post-2",
      "post-3",
    ]);
    await expect(
      AsyncStorage.getItem(getCommunityBookmarkStorageKey("uid")),
    ).resolves.toBe(JSON.stringify(["post-2", "post-3"]));

    await AsyncStorage.removeItem(getCommunityBookmarkStorageKey("uid"));
    await act(async () => {
      await result.current.loadBookmarks();
    });
    expect(result.current.bookmarkedPostIds.size).toBe(0);

    await AsyncStorage.setItem(
      getCommunityBookmarkStorageKey("uid"),
      JSON.stringify({ bad: true }),
    );
    await act(async () => {
      await result.current.loadBookmarks();
    });
    expect(result.current.bookmarkedPostIds.size).toBe(0);

    await AsyncStorage.setItem(getCommunityBookmarkStorageKey("uid"), "{bad json");
    await act(async () => {
      await result.current.loadBookmarks();
    });
    expect(result.current.bookmarkedPostIds.size).toBe(0);
  });

  it("resets bookmarks and alerts when storage operations fail", async () => {
    const { result } = await renderHook(() => useCommunityBookmarks());

    jest.spyOn(AsyncStorage, "getItem").mockRejectedValueOnce(new Error("bad"));
    await act(async () => {
      await result.current.loadBookmarks();
    });
    expect(result.current.bookmarkedPostIds.size).toBe(0);

    await act(async () => {
      await result.current.toggleBookmark("post-1");
    });
    expect(result.current.bookmarkedPostIds.has("post-1")).toBe(true);

    jest.spyOn(AsyncStorage, "setItem").mockRejectedValueOnce(new Error("bad"));
    await act(async () => {
      await result.current.toggleBookmark("post-2");
    });

    expect(result.current.bookmarkedPostIds.has("post-1")).toBe(true);
    expect(result.current.bookmarkedPostIds.has("post-2")).toBe(false);
    expect(Alert.alert).toHaveBeenCalled();
  });

  it("loads author profile from stored user profile", async () => {
    await AsyncStorage.setItem(
      USER_PROFILE_KEY,
      JSON.stringify({
        name: "Tester",
        userType: "Student",
        image: "https://cdn.example.com/me.jpg",
        bio: "hello",
      }),
    );

    const { result } = await renderHook(() => useCommunityAuthorProfile());

    await act(async () => {
      await result.current.loadAuthorProfile();
    });

    expect(result.current.authorProfile).toEqual({
      authorName: "Tester",
      authorType: "Student",
      authorImage: "https://cdn.example.com/me.jpg",
      authorBio: "hello",
    });

    await AsyncStorage.setItem(
      USER_PROFILE_KEY,
      JSON.stringify({
        name: "",
        userType: "",
        image: "",
        bio: "",
      }),
    );
    await act(async () => {
      await result.current.loadAuthorProfile();
    });

    expect(result.current.authorProfile).toMatchObject({
      authorType: "",
      authorImage: null,
      authorBio: "",
    });
  });

  it("uses fallback author profile when storage is empty or invalid", async () => {
    const { result } = await renderHook(() => useCommunityAuthorProfile());

    await act(async () => {
      await result.current.loadAuthorProfile();
    });

    expect(result.current.authorProfile.authorName).toMatch(/\S+/);
    expect(result.current.authorProfile.authorImage).toBeNull();

    jest.spyOn(AsyncStorage, "getItem").mockRejectedValueOnce(new Error("bad"));
    await act(async () => {
      await result.current.loadAuthorProfile();
    });

    expect(result.current.authorProfile.authorName).toMatch(/\S+/);
    expect(result.current.authorProfile.authorImage).toBeNull();
  });
});
