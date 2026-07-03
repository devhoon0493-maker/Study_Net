import { useRouter } from "expo-router";
import {
  EmailAuthProvider,
  reauthenticateWithCredential,
  updatePassword,
} from "firebase/auth";
import { useMemo, useState } from "react";
import {
  Alert,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useMonoTheme, type MonoTheme } from "../../constants/mono";
import { auth } from "../../utils/firebaseConfig";

export default function ChangePassword() {
  const router = useRouter();
  const { theme: C } = useMonoTheme();
  const styles = useMemo(() => createStyles(C), [C]);

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

  const handleChange = async () => {
    if (saving) return;

    if (!currentPw || !newPw || !confirmPw) {
      Alert.alert("입력 오류", "모든 항목을 입력해주세요.");
      return;
    }

    const user = auth.currentUser;
    if (!user?.email) {
      Alert.alert("변경 불가", "이메일/비밀번호 계정에서만 비밀번호를 변경할 수 있어요.");
      return;
    }

    if (!validation.valid) {
      Alert.alert("비밀번호 조건", "8자 이상, 숫자 1개 이상, 특수문자 1개 이상을 포함해야 합니다.");
      return;
    }

    if (newPw !== confirmPw) {
      Alert.alert("불일치", "새 비밀번호가 서로 일치하지 않습니다.");
      return;
    }

    if (currentPw === newPw) {
      Alert.alert("변경 불가", "현재 비밀번호와 다른 새 비밀번호를 입력해주세요.");
      return;
    }

    try {
      setSaving(true);
      const credential = EmailAuthProvider.credential(user.email, currentPw);

      await reauthenticateWithCredential(user, credential);
      await updatePassword(user, newPw);

      Alert.alert("완료", "비밀번호가 변경되었습니다.", [
        { text: "확인", onPress: () => router.back() },
      ]);
    } catch (error: any) {
      Alert.alert("변경 실패", getPasswordErrorMessage(error?.code));
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.header}>
        <Text style={styles.title}>비밀번호 변경</Text>
      </View>

      <View style={styles.card}>
        <PasswordField
          label="현재 비밀번호"
          value={currentPw}
          onChange={setCurrentPw}
          show={showCurrent}
          onToggle={() => setShowCurrent((value) => !value)}
          styles={styles}
          placeholder="현재 비밀번호 입력"
          placeholderColor={C.text}
        />

        <PasswordField
          label="새 비밀번호"
          value={newPw}
          onChange={setNewPw}
          show={showNew}
          onToggle={() => setShowNew((value) => !value)}
          styles={styles}
          placeholder="새 비밀번호 입력"
          placeholderColor={C.text}
        />

        <View style={styles.validationBox}>
          <Text style={[styles.rule, validation.minLength && styles.valid]}>8자 이상</Text>
          <Text style={[styles.rule, validation.hasNumber && styles.valid]}>숫자 1개 이상</Text>
          <Text style={[styles.rule, validation.hasSpecial && styles.valid]}>
            특수문자 1개 이상 (!@#$%^&*)
          </Text>
        </View>

        <PasswordField
          label="새 비밀번호 확인"
          value={confirmPw}
          onChange={setConfirmPw}
          show={showConfirm}
          onToggle={() => setShowConfirm((value) => !value)}
          styles={styles}
          placeholder="새 비밀번호 다시 입력"
          placeholderColor={C.text}
        />

        <TouchableOpacity
          style={[styles.primaryBtn, saving && styles.primaryBtnDisabled]}
          onPress={handleChange}
          disabled={saving}
        >
          <Text style={styles.primaryText}>{saving ? "변경 중..." : "변경하기"}</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

function PasswordField({
  label,
  value,
  onChange,
  show,
  onToggle,
  styles,
  placeholder,
  placeholderColor,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  show: boolean;
  onToggle: () => void;
  styles: ReturnType<typeof createStyles>;
  placeholder: string;
  placeholderColor: string;
}) {
  return (
    <>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          secureTextEntry={!show}
          value={value}
          onChangeText={onChange}
          placeholder={placeholder}
          placeholderTextColor={placeholderColor}
          autoCorrect={false}
          autoCapitalize="none"
        />
        <TouchableOpacity style={styles.eyeButton} onPress={onToggle}>
          <Text style={styles.eye}>{show ? "숨김" : "보기"}</Text>
        </TouchableOpacity>
      </View>
    </>
  );
}

const createStyles = (C: MonoTheme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: C.bg,
      paddingHorizontal: 20,
    },
    header: {
      marginTop: 10,
      marginBottom: 24,
    },
    title: {
      fontSize: 28,
      fontWeight: "800",
      color: C.text,
    },
    card: {
      backgroundColor: C.surface,
      borderRadius: 18,
      padding: 20,
      borderWidth: 1,
      borderBottomWidth: 3,
      borderColor: C.border,
    },
    label: {
      color: C.text,
      marginTop: 16,
      marginBottom: 6,
      fontSize: 13,
    },
    inputRow: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: C.surface,
      borderRadius: 12,
      borderWidth: 1,
      borderBottomWidth: 4,
      borderColor: C.border,
      paddingHorizontal: 12,
    },
    input: {
      flex: 1,
      paddingVertical: 14,
      color: C.text,
    },
    eyeButton: {
      minWidth: 52,
      height: 34,
      borderWidth: 1,
      borderBottomWidth: 3,
      borderColor: C.border,
      borderRadius: 8,
      alignItems: "center",
      justifyContent: "center",
    },
    eye: {
      color: C.text,
      fontWeight: "600",
    },
    validationBox: {
      marginTop: 10,
    },
    rule: {
      color: C.text,
      fontSize: 12,
      marginTop: 4,
      opacity: 0.5,
    },
    valid: {
      color: C.text,
      fontWeight: "800",
      opacity: 1,
    },
    primaryBtn: {
      backgroundColor: C.surface,
      borderWidth: 1,
      borderBottomWidth: 4,
      borderColor: C.border,
      borderRadius: 14,
      alignItems: "center",
      justifyContent: "center",
      minHeight: 52,
      marginTop: 24,
    },
    primaryBtnDisabled: {
      opacity: 0.5,
    },
    primaryText: {
      color: C.text,
      fontWeight: "800",
    },
  });
