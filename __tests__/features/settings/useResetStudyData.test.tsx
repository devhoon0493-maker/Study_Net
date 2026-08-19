import AsyncStorage from "@react-native-async-storage/async-storage";
import { act, renderHook, waitFor } from "@testing-library/react-native";
import { get, update } from "firebase/database";
import { Alert } from "react-native";

import { MEMBER_KEY } from "../../../features/group/groupConstants";
import { useResetStudyData } from "../../../features/settings/useResetStudyData";
import { PRIMARY_DDAY_KEY } from "../../../utils/dday";
import { auth } from "../../../utils/firebaseConfig";

const setCurrentUser = (user: unknown) => {
  Object.defineProperty(auth, "currentUser", {
    configurable: true,
    value: user,
    writable: true,
  });
};

const pressAlertButton = async (callIndex: number, buttonIndex: number) => {
  const buttons = jest.mocked(Alert.alert).mock.calls[callIndex]?.[2];
  if (!Array.isArray(buttons)) throw new Error("Expected alert buttons");
  await buttons[buttonIndex]?.onPress?.();
};

describe("useResetStudyData", () => {
  const onResetComplete = jest.fn();

  beforeEach(async () => {
    await AsyncStorage.clear();
    jest.clearAllMocks();
    jest.spyOn(Alert, "alert").mockImplementation(jest.fn());
    setCurrentUser({ uid: "user-1" });
    jest.mocked(get).mockResolvedValue({
      val: () => ({
        room1: { members: { "user-1": {} } },
        room2: { members: { "other-user": {} } },
      }),
    } as never);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("does nothing when no reset option is selected", async () => {
    const { result } = await renderHook(() =>
      useResetStudyData({ onResetComplete }),
    );

    await waitFor(() => {
      expect(result.current).not.toBeNull();
    });

    await act(async () => {
      await result.current.runReset({
        resetRecords: false,
        resetGoals: false,
        resetGroupStatus: false,
      });
    });

    expect(Alert.alert).not.toHaveBeenCalled();
    expect(update).not.toHaveBeenCalled();
  });

  it("removes selected local study data after confirmation", async () => {
    await AsyncStorage.multiSet([
      ["study_sessions", "[{}]"],
      ["active_session", "{}"],
      ["daily_goal_seconds", "3600"],
      ["weekly_goal_seconds", "18000"],
      ["streak_goal_days", "14"],
      [PRIMARY_DDAY_KEY, JSON.stringify({ title: "Exam" })],
    ]);

    const { result } = await renderHook(() =>
      useResetStudyData({ onResetComplete }),
    );

    await waitFor(() => {
      expect(result.current).not.toBeNull();
    });

    await act(async () => {
      await result.current.runReset({
        resetRecords: true,
        resetGoals: true,
        resetGroupStatus: false,
      });
    });
    await act(async () => {
      await pressAlertButton(0, 1);
    });
    await act(async () => {
      await pressAlertButton(1, 0);
    });

    await expect(AsyncStorage.getItem("study_sessions")).resolves.toBeNull();
    await expect(AsyncStorage.getItem("active_session")).resolves.toBeNull();
    await expect(AsyncStorage.getItem("daily_goal_seconds")).resolves.toBeNull();
    await expect(AsyncStorage.getItem(PRIMARY_DDAY_KEY)).resolves.toBeNull();
    expect(onResetComplete).toHaveBeenCalled();
  });

  it("resets my remote group status when selected", async () => {
    const { result } = await renderHook(() =>
      useResetStudyData({ onResetComplete }),
    );

    await waitFor(() => {
      expect(result.current).not.toBeNull();
    });

    await act(async () => {
      await result.current.runReset({
        resetRecords: false,
        resetGoals: false,
        resetGroupStatus: true,
      });
    });
    await act(async () => {
      await pressAlertButton(0, 1);
    });

    expect(update).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        "rooms/room1/members/user-1/online": false,
        "rooms/room1/members/user-1/studyStartEpoch": null,
      }),
    );
  });

  it("uses stored member id if auth uid is unavailable", async () => {
    setCurrentUser(null);
    await AsyncStorage.setItem(MEMBER_KEY, JSON.stringify({ id: "member-1" }));
    jest.mocked(get).mockResolvedValueOnce({
      val: () => ({
        room1: { members: { "member-1": {} } },
      }),
    } as never);

    const { result } = await renderHook(() =>
      useResetStudyData({ onResetComplete }),
    );

    await waitFor(() => {
      expect(result.current).not.toBeNull();
    });

    await act(async () => {
      await result.current.runReset({
        resetRecords: false,
        resetGoals: false,
        resetGroupStatus: true,
      });
    });
    await act(async () => {
      await pressAlertButton(0, 1);
    });

    expect(update).not.toHaveBeenCalled();
  });

  it("skips remote reset when rooms are empty and alerts on reset failure", async () => {
    jest.mocked(get).mockResolvedValueOnce({ val: () => null } as never);
    const { result } = await renderHook(() =>
      useResetStudyData({ onResetComplete }),
    );

    await waitFor(() => {
      expect(result.current).not.toBeNull();
    });

    await act(async () => {
      await result.current.runReset({
        resetRecords: false,
        resetGoals: false,
        resetGroupStatus: true,
      });
    });
    await act(async () => {
      await pressAlertButton(0, 1);
    });
    expect(update).not.toHaveBeenCalled();

    jest.mocked(Alert.alert).mockClear();
    jest.mocked(get).mockRejectedValueOnce(new Error("failed"));
    await act(async () => {
      await result.current.runReset({
        resetRecords: false,
        resetGoals: false,
        resetGroupStatus: true,
      });
    });
    await act(async () => {
      await pressAlertButton(0, 1);
    });

    const lastAlert = jest.mocked(Alert.alert).mock.calls.at(-1);
    expect(lastAlert?.[0]).toMatch(/\S+/);
    expect(lastAlert?.[1]).toMatch(/\S+/);
  });

  it("alerts when local reset storage removal fails", async () => {
    jest.spyOn(AsyncStorage, "multiRemove").mockRejectedValueOnce(new Error("bad"));
    const { result } = await renderHook(() =>
      useResetStudyData({ onResetComplete }),
    );

    await waitFor(() => {
      expect(result.current).not.toBeNull();
    });

    await act(async () => {
      await result.current.runReset({
        resetRecords: true,
        resetGoals: false,
        resetGroupStatus: false,
      });
    });
    await act(async () => {
      await pressAlertButton(0, 1);
    });

    const lastAlert = jest.mocked(Alert.alert).mock.calls.at(-1);
    expect(lastAlert?.[0]).toMatch(/\S+/);
    expect(lastAlert?.[1]).toMatch(/\S+/);
  });

  it("ignores malformed stored member ids during group reset", async () => {
    setCurrentUser(null);
    await AsyncStorage.setItem(MEMBER_KEY, "{bad json");
    const { result } = await renderHook(() =>
      useResetStudyData({ onResetComplete }),
    );

    await waitFor(() => {
      expect(result.current).not.toBeNull();
    });

    await act(async () => {
      await result.current.runReset({
        resetRecords: false,
        resetGoals: false,
        resetGroupStatus: true,
      });
    });
    await act(async () => {
      await pressAlertButton(0, 1);
    });

    expect(get).not.toHaveBeenCalled();
    expect(update).not.toHaveBeenCalled();
  });

  it("ignores missing or non-string stored member ids during group reset", async () => {
    setCurrentUser(null);
    const { result } = await renderHook(() =>
      useResetStudyData({ onResetComplete }),
    );

    await waitFor(() => {
      expect(result.current).not.toBeNull();
    });

    await act(async () => {
      await result.current.runReset({
        resetRecords: false,
        resetGoals: false,
        resetGroupStatus: true,
      });
    });
    await act(async () => {
      await pressAlertButton(0, 1);
    });
    expect(get).not.toHaveBeenCalled();

    jest.mocked(Alert.alert).mockClear();
    await AsyncStorage.setItem(MEMBER_KEY, JSON.stringify({ id: 123 }));
    await act(async () => {
      await result.current.runReset({
        resetRecords: false,
        resetGoals: false,
        resetGroupStatus: true,
      });
    });
    await act(async () => {
      await pressAlertButton(0, 1);
    });
    expect(get).not.toHaveBeenCalled();
  });
});
