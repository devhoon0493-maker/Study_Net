import { act, renderHook, waitFor } from "@testing-library/react-native";
import * as Linking from "expo-linking";
import { Alert } from "react-native";

import {
  CONTACT_CATEGORIES,
  useContactForm,
} from "../../../features/settings/useContactForm";
import { auth } from "../../../utils/firebaseConfig";

jest.mock("expo-linking", () => ({
  canOpenURL: jest.fn(() => Promise.resolve(true)),
  openURL: jest.fn(() => Promise.resolve()),
}));

const setCurrentUser = (user: unknown) => {
  Object.defineProperty(auth, "currentUser", {
    configurable: true,
    value: user,
    writable: true,
  });
};

describe("useContactForm", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Alert, "alert").mockImplementation(jest.fn());
    setCurrentUser({ uid: "user-1", email: "user@example.com" });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("prefills reply email from the current user", async () => {
    const { result } = await renderHook(() => useContactForm());

    await waitFor(() => {
      expect(result.current).not.toBeNull();
    });

    expect(result.current.replyEmail).toBe("user@example.com");
  });

  it("uses empty reply and anonymous uid fallback when signed out", async () => {
    setCurrentUser(null);
    const { result } = await renderHook(() => useContactForm());

    await waitFor(() => {
      expect(result.current.replyEmail).toBe("");
    });

    await act(async () => {
      result.current.setMessage("I need help with my account.");
    });
    await act(async () => {
      await result.current.sendMail();
    });

    expect(Linking.openURL).toHaveBeenCalledWith(expect.stringContaining("mailto:"));
  });

  it("blocks short messages", async () => {
    const { result } = await renderHook(() => useContactForm());

    await waitFor(() => {
      expect(result.current).not.toBeNull();
    });

    await act(async () => {
      result.current.setMessage("hi");
    });
    await act(async () => {
      await result.current.sendMail();
    });

    expect(Alert.alert).toHaveBeenCalled();
    expect(Linking.openURL).not.toHaveBeenCalled();
  });

  it("opens a mailto URL for valid messages", async () => {
    const { result } = await renderHook(() => useContactForm());

    await waitFor(() => {
      expect(result.current).not.toBeNull();
    });

    await act(async () => {
      result.current.setCategory(CONTACT_CATEGORIES[1]);
      result.current.setMessage("Please add calendar export.");
      result.current.setReplyEmail("reply@example.com");
    });
    await act(async () => {
      await result.current.sendMail();
    });

    expect(Linking.canOpenURL).toHaveBeenCalledWith(
      expect.stringContaining("mailto:support@studynet.app"),
    );
    expect(Linking.openURL).toHaveBeenCalledWith(
      expect.stringContaining("mailto:support@studynet.app"),
    );
    expect(Linking.openURL).toHaveBeenCalledWith(
      expect.stringContaining(encodeURIComponent("reply@example.com")),
    );
  });

  it("shows an alert when no mail app is available", async () => {
    jest.mocked(Linking.canOpenURL).mockResolvedValueOnce(false);
    const { result } = await renderHook(() => useContactForm());

    await waitFor(() => {
      expect(result.current).not.toBeNull();
    });

    await act(async () => {
      result.current.setMessage("Mail app missing.");
    });
    await act(async () => {
      await result.current.sendMail();
    });

    expect(Alert.alert).toHaveBeenCalled();
    expect(Linking.openURL).not.toHaveBeenCalled();
  });

  it("shows an alert when opening the mail app fails", async () => {
    jest.mocked(Linking.openURL).mockRejectedValueOnce(new Error("failed"));
    const { result } = await renderHook(() => useContactForm());

    await waitFor(() => {
      expect(result.current).not.toBeNull();
    });

    await act(async () => {
      result.current.setMessage("The mail app throws.");
      result.current.setReplyEmail("");
    });
    await act(async () => {
      await result.current.sendMail();
    });

    expect(Alert.alert).toHaveBeenCalled();
  });
});
