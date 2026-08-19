import AsyncStorage from "@react-native-async-storage/async-storage";
import { act, render, renderHook, waitFor } from "@testing-library/react-native";
import { Text } from "react-native";
import { useContext } from "react";

import {
  SessionContext,
  SessionProvider,
} from "../../../features/home/HomeSessionContext";
import { ACTIVE_SESSION_KEY } from "../../../features/home/homeUtils";

function SessionProbe() {
  const { session, elapsed, hasActiveSession, refresh } =
    useContext(SessionContext);

  return (
    <>
      <Text testID="subject">{session?.subject ?? "none"}</Text>
      <Text testID="elapsed">{elapsed}</Text>
      <Text testID="active">{String(hasActiveSession)}</Text>
      <Text testID="refresh" onPress={() => void refresh()}>
        refresh
      </Text>
    </>
  );
}

describe("HomeSessionContext", () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    jest.useFakeTimers();
    jest.setSystemTime(new Date("2026-07-28T00:00:10.000Z"));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("loads active sessions and updates elapsed time", async () => {
    await AsyncStorage.setItem(
      ACTIVE_SESSION_KEY,
      JSON.stringify({ subject: "Math", startEpoch: Date.now() - 5_000 }),
    );

    const { getByTestId, unmount } = await render(
      <SessionProvider>
        <SessionProbe />
      </SessionProvider>,
    );

    await waitFor(() => {
      expect(getByTestId("subject").props.children).toBe("Math");
      expect(getByTestId("elapsed").props.children).toBe(5);
      expect(getByTestId("active").props.children).toBe("true");
    });

    jest.setSystemTime(new Date("2026-07-28T00:00:12.000Z"));
    await act(async () => {
      jest.advanceTimersByTime(1000);
    });

    await waitFor(() => {
      expect(getByTestId("elapsed").props.children).toBeGreaterThan(5);
    });

    const getItemSpy = jest.spyOn(AsyncStorage, "getItem");
    await act(async () => {
      jest.advanceTimersByTime(4000);
    });
    expect(getItemSpy).toHaveBeenCalledWith(ACTIVE_SESSION_KEY);

    await act(async () => {
      unmount();
    });
  });

  it("keeps paused active sessions from advancing", async () => {
    await AsyncStorage.setItem(
      ACTIVE_SESSION_KEY,
      JSON.stringify({
        subject: "English",
        savedSeconds: 42,
        goalSeconds: 3600,
        running: false,
      }),
    );

    const { getByTestId } = await render(
      <SessionProvider>
        <SessionProbe />
      </SessionProvider>,
    );

    await waitFor(() => {
      expect(getByTestId("subject").props.children).toBe("English");
      expect(getByTestId("elapsed").props.children).toBe(42);
    });

    jest.setSystemTime(new Date("2026-07-28T00:01:10.000Z"));
    await act(async () => {
      jest.advanceTimersByTime(1000);
    });

    expect(getByTestId("elapsed").props.children).toBe(42);
  });

  it("uses saved seconds for sessions without a running start time", async () => {
    await AsyncStorage.setItem(
      ACTIVE_SESSION_KEY,
      JSON.stringify({
        subject: "Science",
        savedSeconds: -5,
        running: false,
      }),
    );

    const { getByTestId } = await render(
      <SessionProvider>
        <SessionProbe />
      </SessionProvider>,
    );

    await waitFor(() => {
      expect(getByTestId("subject").props.children).toBe("Science");
      expect(getByTestId("elapsed").props.children).toBe(0);
    });

    await AsyncStorage.setItem(
      ACTIVE_SESSION_KEY,
      JSON.stringify({
        subject: "Science",
        savedSeconds: 15,
        running: true,
      }),
    );
    await act(async () => {
      getByTestId("refresh").props.onPress();
    });

    await waitFor(() => {
      expect(getByTestId("elapsed").props.children).toBe(15);
    });
  });

  it("defaults malformed active-session timing fields to zero", async () => {
    await AsyncStorage.setItem(
      ACTIVE_SESSION_KEY,
      JSON.stringify({
        subject: "History",
        running: false,
      }),
    );

    const { getByTestId } = await render(
      <SessionProvider>
        <SessionProbe />
      </SessionProvider>,
    );

    await waitFor(() => {
      expect(getByTestId("elapsed").props.children).toBe(0);
    });

    await AsyncStorage.setItem(
      ACTIVE_SESSION_KEY,
      JSON.stringify({
        subject: "History",
        running: true,
      }),
    );
    await act(async () => {
      getByTestId("refresh").props.onPress();
    });

    await waitFor(() => {
      expect(getByTestId("elapsed").props.children).toBe(0);
    });
  });

  it("exposes a no-op refresh on the default session context", async () => {
    const { result } = await renderHook(() => useContext(SessionContext));

    await act(async () => {
      await result.current.refresh();
    });

    expect(result.current.hasActiveSession).toBe(false);
  });

  it("clears session state when storage is empty or invalid", async () => {
    const { getByTestId } = await render(
      <SessionProvider>
        <SessionProbe />
      </SessionProvider>,
    );

    await waitFor(() => {
      expect(getByTestId("active").props.children).toBe("false");
      expect(getByTestId("elapsed").props.children).toBe(0);
    });
    await act(async () => {
      jest.advanceTimersByTime(1000);
    });
    expect(getByTestId("elapsed").props.children).toBe(0);

    await AsyncStorage.setItem(ACTIVE_SESSION_KEY, "{bad json");
    await act(async () => {
      getByTestId("refresh").props.onPress();
    });

    await waitFor(() => {
      expect(getByTestId("active").props.children).toBe("false");
    });
  });
});
