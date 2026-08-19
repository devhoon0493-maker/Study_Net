import {
  EmailAuthProvider,
  reauthenticateWithCredential,
  updatePassword,
} from "firebase/auth";
import { useMemo, useState } from "react";
import { Alert } from "react-native";

import { getErrorCode } from "../../utils/errorMessages";
import { auth } from "../../utils/firebaseConfig";

type UseChangePasswordFormParams = {
  onChanged: () => void;
};

export function useChangePasswordForm({
  onChanged,
}: UseChangePasswordFormParams) {
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [saving, setSaving] = useState(false);
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const validation = useMemo(() => {
    const minLength = newPw.length >= 8;
    const hasNumber = /[0-9]/.test(newPw);
    const hasSpecial = /[!@#$%^&*]/.test(newPw);

    return {
      valid: minLength && hasNumber && hasSpecial,
      minLength,
      hasNumber,
      hasSpecial,
    };
  }, [newPw]);

  const handleChange = async () => {
    if (saving) return;

    if (!currentPw || !newPw || !confirmPw) {
      Alert.alert("입력 오류", "모든 항목을 입력해주세요.");
      return;
    }

    const user = auth.currentUser;
    if (!user?.email) {
      Alert.alert(
        "변경 불가",
        "이메일 비밀번호 계정에서만 비밀번호를 변경할 수 있어요.",
      );
      return;
    }

    if (!validation.valid) {
      Alert.alert(
        "비밀번호 조건",
        "8자 이상, 숫자 1개 이상, 특수문자 1개 이상을 포함해야 합니다.",
      );
      return;
    }

    if (newPw !== confirmPw) {
      Alert.alert("불일치", "새 비밀번호가 서로 일치하지 않습니다.");
      return;
    }

    if (currentPw === newPw) {
      Alert.alert(
        "변경 불가",
        "현재 비밀번호와 다른 새 비밀번호를 입력해주세요.",
      );
      return;
    }

    try {
      setSaving(true);
      const credential = EmailAuthProvider.credential(user.email, currentPw);

      await reauthenticateWithCredential(user, credential);
      await updatePassword(user, newPw);

      Alert.alert("완료", "비밀번호가 변경되었습니다.", [
        { text: "확인", onPress: onChanged },
      ]);
    } catch (error) {
      Alert.alert("변경 실패", getPasswordErrorMessage(getErrorCode(error)));
    } finally {
      setSaving(false);
    }
  };

  return {
    currentPw,
    setCurrentPw,
    newPw,
    setNewPw,
    confirmPw,
    setConfirmPw,
    saving,
    showCurrent,
    setShowCurrent,
    showNew,
    setShowNew,
    showConfirm,
    setShowConfirm,
    validation,
    handleChange,
  };
}

const getPasswordErrorMessage = (code?: string) => {
  switch (code) {
    case "auth/wrong-password":
    case "auth/invalid-credential":
      return "현재 비밀번호가 올바르지 않아요.";
    case "auth/weak-password":
      return "새 비밀번호가 너무 약해요.";
    case "auth/requires-recent-login":
      return "보안을 위해 다시 로그인한 뒤 시도해주세요.";
    case "auth/network-request-failed":
      return "네트워크 연결을 확인해주세요.";
    default:
      return "비밀번호를 변경하지 못했어요. 잠시 후 다시 시도해주세요.";
  }
};
