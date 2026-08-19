import { act, renderHook, waitFor } from "@testing-library/react-native";
import {
  EmailAuthProvider,
  reauthenticateWithCredential,
  updatePassword,
} from "firebase/auth";
import { Alert } from "react-native";

import { useChangePasswordForm } from "../../../features/settings/useChangePasswordForm";
import { auth } from "../../../utils/firebaseConfig";

const setCurrentUser = (user: unknown) => {
  Object.defineProperty(auth, "currentUser", {
    configurable: true,
    value: user,
    writable: true,
  });
};

describe("useChangePasswordForm", () => {
  const onChanged = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Alert, "alert").mockImplementation(jest.fn());
    setCurrentUser(null);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("validates password strength requirements", async () => {
    const { result } = await renderHook(() =>
      useChangePasswordForm({ onChanged }),
    );

    await waitFor(() => {
      expect(result.current).not.toBeNull();
    });

    expect(result.current.validation).toEqual({
      valid: false,
      minLength: false,
      hasNumber: false,
      hasSpecial: false,
    });

    await act(async () => {
      result.current.setNewPw("password1!");
    });

    expect(result.current.validation).toEqual({
      valid: true,
      minLength: true,
      hasNumber: true,
      hasSpecial: true,
    });
  });

  it("blocks incomplete, provider-only, weak, mismatched, and unchanged inputs", async () => {
    const { result } = await renderHook(() =>
      useChangePasswordForm({ onChanged }),
    );

    await waitFor(() => {
      expect(result.current).not.toBeNull();
    });

    await act(async () => {
      await result.current.handleChange();
    });
    expect(Alert.alert).toHaveBeenCalledTimes(1);

    setCurrentUser({ email: null });
    await act(async () => {
      result.current.setCurrentPw("old");
      result.current.setNewPw("password1!");
      result.current.setConfirmPw("password1!");
    });
    await act(async () => {
      await result.current.handleChange();
    });
    expect(Alert.alert).toHaveBeenCalledTimes(2);

    setCurrentUser({ email: "user@example.com" });
    await act(async () => {
      result.current.setNewPw("weak");
      result.current.setConfirmPw("weak");
    });
    await act(async () => {
      await result.current.handleChange();
    });
    expect(Alert.alert).toHaveBeenCalledTimes(3);

    await act(async () => {
      result.current.setNewPw("password1!");
      result.current.setConfirmPw("password2!");
    });
    await act(async () => {
      await result.current.handleChange();
    });
    expect(Alert.alert).toHaveBeenCalledTimes(4);

    await act(async () => {
      result.current.setCurrentPw("password1!");
      result.current.setConfirmPw("password1!");
    });
    await act(async () => {
      await result.current.handleChange();
    });
    expect(Alert.alert).toHaveBeenCalledTimes(5);
  });

  it("reauthenticates and updates password for valid inputs", async () => {
    setCurrentUser({ email: "user@example.com" });
    const { result } = await renderHook(() =>
      useChangePasswordForm({ onChanged }),
    );

    await waitFor(() => {
      expect(result.current).not.toBeNull();
    });

    await act(async () => {
      result.current.setCurrentPw("oldPassword1!");
      result.current.setNewPw("newPassword1!");
      result.current.setConfirmPw("newPassword1!");
    });

    await act(async () => {
      await result.current.handleChange();
    });

    expect(EmailAuthProvider.credential).toHaveBeenCalledWith(
      "user@example.com",
      "oldPassword1!",
    );
    expect(reauthenticateWithCredential).toHaveBeenCalled();
    expect(updatePassword).toHaveBeenCalledWith(
      auth.currentUser,
      "newPassword1!",
    );

    const alertArgs = jest.mocked(Alert.alert).mock.calls.at(-1);
    const buttons = alertArgs?.[2];
    if (Array.isArray(buttons)) {
      buttons[0]?.onPress?.();
    }
    expect(onChanged).toHaveBeenCalled();
  });

  it("ignores duplicate password change submits while saving", async () => {
    setCurrentUser({ email: "user@example.com" });
    let resolveReauth: (() => void) | undefined;
    jest.mocked(reauthenticateWithCredential).mockReturnValueOnce(
      new Promise<void>((resolve) => {
        resolveReauth = resolve;
      }) as never,
    );
    const { result } = await renderHook(() =>
      useChangePasswordForm({ onChanged }),
    );

    await waitFor(() => {
      expect(result.current).not.toBeNull();
    });
    await act(async () => {
      result.current.setCurrentPw("oldPassword1!");
      result.current.setNewPw("newPassword1!");
      result.current.setConfirmPw("newPassword1!");
    });

    let firstSubmit: Promise<void>;
    await act(async () => {
      firstSubmit = result.current.handleChange();
    });
    expect(result.current.saving).toBe(true);
    await act(async () => {
      await result.current.handleChange();
    });
    expect(reauthenticateWithCredential).toHaveBeenCalledTimes(1);

    await act(async () => {
      resolveReauth?.();
      await firstSubmit!;
    });
  });

  it("maps Firebase password change errors", async () => {
    setCurrentUser({ email: "user@example.com" });
    const { result } = await renderHook(() =>
      useChangePasswordForm({ onChanged }),
    );

    await waitFor(() => {
      expect(result.current).not.toBeNull();
    });
    await act(async () => {
      result.current.setCurrentPw("oldPassword1!");
      result.current.setNewPw("newPassword1!");
      result.current.setConfirmPw("newPassword1!");
    });

    for (const code of [
      "auth/wrong-password",
      "auth/weak-password",
      "auth/requires-recent-login",
      "auth/network-request-failed",
      "auth/other",
    ]) {
      jest
        .mocked(reauthenticateWithCredential)
        .mockRejectedValueOnce({ code });
      await act(async () => {
        await result.current.handleChange();
      });
    }

    expect(Alert.alert).toHaveBeenCalledTimes(5);
    expect(result.current.saving).toBe(false);
  });
});
