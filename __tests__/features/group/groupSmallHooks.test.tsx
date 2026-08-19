import AsyncStorage from "@react-native-async-storage/async-storage";
import { act, renderHook, waitFor } from "@testing-library/react-native";
import { onAuthStateChanged } from "firebase/auth";
import { onValue, ref } from "firebase/database";
import { PanResponder } from "react-native";

import {
  COLORS,
  DEFAULT_GROUP_MEMBERS,
  MEMBER_KEY,
} from "../../../features/group/groupConstants";
import { useCreateGroupDraft } from "../../../features/group/useCreateGroupDraft";
import { useGroupMemberProfile } from "../../../features/group/useGroupMemberProfile";
import { useGroupRooms } from "../../../features/group/useGroupRooms";
import { useInitialGroupCodeJoin } from "../../../features/group/useInitialGroupCodeJoin";

describe("group small hooks", () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    jest.clearAllMocks();
    jest.mocked(onAuthStateChanged).mockImplementation((auth, callback) => {
      (callback as (user: null) => void)(null);
      return jest.fn();
    });
    jest.mocked(onValue).mockImplementation(() => jest.fn());
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("manages create-group draft fields, visibility, slider, and reset", async () => {
    const { result } = await renderHook(() => useCreateGroupDraft());

    await waitFor(() => {
      expect(result.current).not.toBeNull();
    });
    expect(result.current.roomMax).toBe(DEFAULT_GROUP_MEMBERS);

    await act(async () => {
      result.current.setRoomName("Morning Study");
      result.current.setRoomSubjects("Math, English");
      result.current.setRoomVisibility("private");
      result.current.onSliderLayout({
        nativeEvent: { layout: { width: 100 } },
      } as never);
    });

    expect(result.current).toMatchObject({
      roomName: "Morning Study",
      roomSubjects: "Math, English",
      roomVisibility: "private",
      roomMax: DEFAULT_GROUP_MEMBERS,
    });
    expect(result.current.memberSliderPanHandlers).toBeTruthy();

    await act(async () => {
      result.current.resetDraft();
    });

    expect(result.current).toMatchObject({
      roomName: "",
      roomSubjects: "",
      roomVisibility: "public",
      roomMax: DEFAULT_GROUP_MEMBERS,
    });
  });

  it("updates room max from slider pan responder callbacks", async () => {
    jest.spyOn(PanResponder, "create").mockImplementation((config) => ({
      panHandlers: config,
    }) as never);
    const { result } = await renderHook(() => useCreateGroupDraft());

    await waitFor(() => {
      expect(result.current).not.toBeNull();
    });
    await act(async () => {
      (
        result.current.memberSliderPanHandlers as Record<string, Function>
      ).onPanResponderGrant({
        nativeEvent: { pageX: 50, locationX: 50 },
      });
    });
    expect(result.current.roomMax).toBe(DEFAULT_GROUP_MEMBERS);

    await act(async () => {
      result.current.onSliderLayout({
        nativeEvent: { layout: { width: 100 } },
      } as never);
    });

    await act(async () => {
      expect(
        (
          result.current.memberSliderPanHandlers as Record<string, Function>
        ).onStartShouldSetPanResponder(),
      ).toBe(true);
      expect(
        (
          result.current.memberSliderPanHandlers as Record<string, Function>
        ).onMoveShouldSetPanResponder(),
      ).toBe(true);
      (
        result.current.memberSliderPanHandlers as Record<string, Function>
      ).onPanResponderGrant({
        nativeEvent: { pageX: 50, locationX: 50 },
      });
    });
    expect(result.current.roomMax).toBe(11);
    expect(result.current.memberSliderPercent).toBe(50);

    await act(async () => {
      (
        result.current.memberSliderPanHandlers as Record<string, Function>
      ).onPanResponderMove({}, { moveX: 100 });
    });
    expect(result.current.roomMax).toBe(20);
    expect(result.current.memberSliderPercent).toBe(100);
  });

  it("subscribes to rooms, sorts by creation time, and cleans up", async () => {
    const unsubscribe = jest.fn();
    jest.mocked(onValue).mockImplementation((roomsRef, callback) => {
      callback({
        val: () => ({
          older: {
            ownerId: "owner",
            name: "Older",
            members: {},
          },
          newer: {
            ownerId: "owner",
            name: "Newer",
            createdAt: 3,
            members: {
              member: { name: "Member", online: true },
            },
          },
        }),
      } as never);
      return unsubscribe;
    });

    const { result, unmount } = await renderHook(() => useGroupRooms());

    await waitFor(() => {
      expect(result.current.map((room) => room.id)).toEqual(["newer", "older"]);
    });
    expect(ref).toHaveBeenCalledWith(expect.anything(), "rooms");
    expect(result.current[0]).toMatchObject({
      id: "newer",
      name: "Newer",
      members: [expect.objectContaining({ id: "member", name: "Member" })],
    });

    await act(async () => {
      unmount();
    });
    expect(unsubscribe).toHaveBeenCalled();
  });

  it("uses an empty room list when the rooms snapshot is empty", async () => {
    jest.mocked(onValue).mockImplementation((roomsRef, callback) => {
      callback({ val: () => null } as never);
      return jest.fn();
    });

    const { result } = await renderHook(() => useGroupRooms());

    await waitFor(() => {
      expect(result.current).toEqual([]);
    });
  });

  it("sorts rooms even when createdAt is missing on both sides", async () => {
    jest.mocked(onValue).mockImplementation((roomsRef, callback) => {
      callback({
        val: () => ({
          a: { ownerId: "owner", name: "A", members: {} },
          b: { ownerId: "owner", name: "B", members: {} },
        }),
      } as never);
      return jest.fn();
    });

    const { result } = await renderHook(() => useGroupRooms());

    await waitFor(() => {
      expect(result.current.map((room) => room.id)).toEqual(["a", "b"]);
    });
  });

  it("normalizes initial group code params and joins when the member is ready", async () => {
    const joinByCode = jest.fn(() => Promise.resolve());
    const setCodeError = jest.fn();
    const setCodeInput = jest.fn();
    const onCodePending = jest.fn();

    await renderHook(() =>
      useInitialGroupCodeJoin({
        initialCodeParam: ["ab-cd12", "ignored"],
        memberReady: true,
        joining: false,
        setCodeError,
        setCodeInput,
        joinByCode,
        onCodePending,
      }),
    );

    await waitFor(() => {
      expect(joinByCode).toHaveBeenCalledWith("ABCD12");
    });
    expect(onCodePending).toHaveBeenCalled();
    expect(setCodeError).toHaveBeenCalledWith("");
    expect(setCodeInput).toHaveBeenCalledWith("ABCD12");
  });

  it("ignores invalid or already-joining initial group codes", async () => {
    const joinByCode = jest.fn(() => Promise.resolve());
    const commonProps = {
      setCodeError: jest.fn(),
      setCodeInput: jest.fn(),
      joinByCode,
      onCodePending: jest.fn(),
    };

    await renderHook(() =>
      useInitialGroupCodeJoin({
        ...commonProps,
        initialCodeParam: undefined,
        memberReady: true,
        joining: false,
      }),
    );

    await renderHook(() =>
      useInitialGroupCodeJoin({
        ...commonProps,
        initialCodeParam: "short",
        memberReady: true,
        joining: false,
      }),
    );

    await renderHook(() =>
      useInitialGroupCodeJoin({
        ...commonProps,
        initialCodeParam: "ABC123",
        memberReady: true,
        joining: true,
      }),
    );

    expect(joinByCode).not.toHaveBeenCalled();
  });

  it("loads an existing local member profile when signed out", async () => {
    const storedMember = {
      id: "stored",
      name: "Stored Member",
      color: COLORS[0],
      image: null,
      userType: "Student",
      bio: "bio",
    };
    await AsyncStorage.setItem(MEMBER_KEY, JSON.stringify(storedMember));
    jest.mocked(onAuthStateChanged).mockImplementation((auth, callback) => {
      (callback as (user: null) => void)(null);
      return jest.fn();
    });

    const { result } = await renderHook(() => useGroupMemberProfile());

    await waitFor(() => {
      expect(result.current).toEqual(storedMember);
    });
  });

  it("creates and stores a local member profile when signed out without storage", async () => {
    jest.spyOn(Date, "now").mockReturnValue(1234);
    jest.spyOn(Math, "random").mockReturnValue(0);
    jest.mocked(onAuthStateChanged).mockImplementation((auth, callback) => {
      (callback as (user: null) => void)(null);
      return jest.fn();
    });

    const { result } = await renderHook(() => useGroupMemberProfile());

    await waitFor(() => {
      expect(result.current?.id).toBe("member-1234-");
    });
    expect(result.current).toMatchObject({
      color: COLORS[0],
      image: null,
      userType: "",
      bio: "",
    });
    await expect(AsyncStorage.getItem(MEMBER_KEY)).resolves.toContain(
      "member-1234-",
    );
  });

  it("hydrates member profile from authenticated user data and cleans up subscriptions", async () => {
    const authUnsubscribe = jest.fn();
    const profileUnsubscribe = jest.fn();
    jest.mocked(onAuthStateChanged).mockImplementation((auth, callback) => {
      (callback as (user: unknown) => void)({
        uid: "user-1",
        displayName: "Display Name",
        email: "user@example.com",
        photoURL: "photo.jpg",
      } as never);
      return authUnsubscribe;
    });
    jest.mocked(onValue).mockImplementation((profileRef, callback) => {
      callback({
        val: () => ({
          name: "Remote Name",
          color: COLORS[1],
          image: "remote.jpg",
          userType: "Teacher",
          bio: "remote bio",
        }),
      } as never);
      return profileUnsubscribe;
    });

    const { result, unmount } = await renderHook(() => useGroupMemberProfile());

    await waitFor(() => {
      expect(result.current).toEqual({
        id: "user-1",
        name: "Remote Name",
        color: COLORS[1],
        image: "remote.jpg",
        userType: "Teacher",
        bio: "remote bio",
      });
    });
    expect(ref).toHaveBeenCalledWith(expect.anything(), "users/user-1");

    await act(async () => {
      unmount();
    });
    expect(authUnsubscribe).toHaveBeenCalled();
    expect(profileUnsubscribe).toHaveBeenCalled();
  });

  it("falls back to authenticated user fields when remote profile is empty", async () => {
    jest.mocked(onAuthStateChanged).mockImplementation((auth, callback) => {
      (callback as (user: unknown) => void)({
        uid: "user-2",
        displayName: "Display User",
        email: "display@example.com",
        photoURL: "photo.jpg",
      } as never);
      return jest.fn();
    });
    jest.mocked(onValue).mockImplementation((profileRef, callback) => {
      callback({ val: () => null } as never);
      return jest.fn();
    });

    const { result } = await renderHook(() => useGroupMemberProfile());

    await waitFor(() => {
      expect(result.current).toMatchObject({
        id: "user-2",
        name: "Display User",
        image: "photo.jpg",
        userType: "",
        bio: "",
      });
    });

    jest.mocked(onAuthStateChanged).mockImplementation((auth, callback) => {
      (callback as (user: unknown) => void)({
        uid: "user-3",
        displayName: "",
        email: "email-name@example.com",
        photoURL: null,
      } as never);
      return jest.fn();
    });

    const emailHook = await renderHook(() => useGroupMemberProfile());
    await waitFor(() => {
      expect(emailHook.result.current?.name).toBe("email-name");
      expect(emailHook.result.current?.image).toBeNull();
    });

    jest.mocked(onAuthStateChanged).mockImplementation((auth, callback) => {
      (callback as (user: unknown) => void)({
        uid: "user-4",
        displayName: "",
        email: null,
        photoURL: null,
      } as never);
      return jest.fn();
    });

    const anonymousHook = await renderHook(() => useGroupMemberProfile());
    await waitFor(() => {
      expect(anonymousHook.result.current?.name).toMatch(/\S+/);
    });
  });
});
