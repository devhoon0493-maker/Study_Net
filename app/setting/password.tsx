import { RADIUS, SPACE, TYPE_SIZE, TYPE_WEIGHT } from "../../constants/designTokens";
import { useRouter } from "expo-router";
import { useMemo } from "react";
import {
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useMonoTheme, type MonoTheme } from "../../constants/mono";
import { SettingsHeader } from "../../features/settings/SettingsHeader";
import { useChangePasswordForm } from "../../features/settings/useChangePasswordForm";

export default function ChangePassword() {
  const router = useRouter();
  const { theme: C } = useMonoTheme();
  const styles = useMemo(() => createStyles(C), [C]);

  const {
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
  } = useChangePasswordForm({
    onChanged: () => router.back(),
  });

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <SettingsHeader title="비밀번호 변경" compactTitle />

      <View style={styles.card}>
        <PasswordField
          label="현재 비밀번호"
          value={currentPw}
          onChange={setCurrentPw}
          show={showCurrent}
          onToggle={() => setShowCurrent((value) => !value)}
          styles={styles}
          placeholder="현재 비밀번호 입력"
          placeholderColor={C.subtle}
        />

        <PasswordField
          label="새 비밀번호"
          value={newPw}
          onChange={setNewPw}
          show={showNew}
          onToggle={() => setShowNew((value) => !value)}
          styles={styles}
          placeholder="새 비밀번호 입력"
          placeholderColor={C.subtle}
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
          placeholderColor={C.subtle}
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
    card: {
      backgroundColor: C.surface,
      borderRadius: RADIUS.card,
      padding: 20,
      borderWidth: 1,
      borderBottomWidth: 3,
      borderColor: C.border,
    },
    label: {
      color: C.text,
      marginTop: SPACE.lg,
      marginBottom: 6,
      fontSize: TYPE_SIZE.bodySmall,
    },
    inputRow: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: C.surface,
      borderRadius: RADIUS.md,
      borderWidth: 1,
      borderBottomWidth: 4,
      borderColor: C.border,
      paddingHorizontal: SPACE.md,
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
      borderRadius: RADIUS.sm,
      alignItems: "center",
      justifyContent: "center",
    },
    eye: {
      color: C.text,
      fontWeight: TYPE_WEIGHT.semibold,
    },
    validationBox: {
      marginTop: 10,
    },
    rule: {
      color: C.text,
      fontSize: TYPE_SIZE.label,
      marginTop: SPACE.xs,
      opacity: 0.5,
    },
    valid: {
      color: C.text,
      fontWeight: TYPE_WEIGHT.strong,
      opacity: 1,
    },
    primaryBtn: {
      backgroundColor: C.surface,
      borderWidth: 1,
      borderBottomWidth: 4,
      borderColor: C.border,
      borderRadius: RADIUS.control,
      alignItems: "center",
      justifyContent: "center",
      minHeight: 52,
      marginTop: SPACE.xl,
    },
    primaryBtnDisabled: {
      opacity: 0.5,
    },
    primaryText: {
      color: C.text,
      fontWeight: TYPE_WEIGHT.strong,
    },
  });
