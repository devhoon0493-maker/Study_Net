import { RADIUS, SPACE, TYPE_SIZE, TYPE_WEIGHT } from "../../constants/designTokens";
import { useMemo } from "react";
import { useRouter } from "expo-router";
import {
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import {
  getScreenBottomPadding,
  getScreenTopPadding,
} from "../../constants/layout";
import { useMonoTheme, type MonoTheme } from "../../constants/mono";
import {
  SettingsHeader,
} from "../../features/settings/SettingsHeader";
import {
  USER_TYPE_OPTIONS,
  useProfileForm,
} from "../../features/settings/useProfileForm";

export default function ProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { theme: C } = useMonoTheme();
  const styles = useMemo(() => createStyles(C), [C]);
  const topPadding = getScreenTopPadding(insets.top);
  const bottomPadding = getScreenBottomPadding(insets.bottom, 44);

  const {
    name,
    setName,
    email,
    setEmail,
    image,
    userType,
    setUserType,
    pickImage,
    handleSave,
    saveState,
  } = useProfileForm({ onSaved: () => router.replace("/main") });

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[
        styles.content,
        { paddingTop: topPadding, paddingBottom: bottomPadding },
      ]}
    >
      <SettingsHeader title="프로필 설정" compactTitle />

      <TouchableOpacity style={styles.imageWrapper} onPress={pickImage}>
        {image ? (
          <Image source={{ uri: image }} style={styles.profileImage} />
        ) : (
          <View style={styles.placeholder}>
            <Text style={styles.placeholderText}>이미지 선택</Text>
          </View>
        )}
      </TouchableOpacity>

      <Text style={styles.label}>이름</Text>
      <TextInput
        style={styles.input}
        value={name}
        onChangeText={setName}
        placeholder="이름 입력"
        placeholderTextColor={C.subtle}
      />

      <Text style={styles.label}>이메일</Text>
      <TextInput
        style={styles.input}
        value={email}
        onChangeText={setEmail}
        placeholder="이메일 입력"
        placeholderTextColor={C.subtle}
        keyboardType="email-address"
        autoCapitalize="none"
      />

      <Text style={styles.label}>사용자</Text>
      <View style={styles.typeContainer}>
        {USER_TYPE_OPTIONS.map((type) => {
          const active = userType === type;
          return (
            <TouchableOpacity
              key={type}
              style={[styles.typeButton, active && styles.typeButtonActive]}
              onPress={() => setUserType(type)}
            >
              <Text style={[styles.typeText, active && styles.typeTextActive]}>
                {type}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <Text style={styles.saveStatus}>
        {saveState === "saving"
          ? "저장 중..."
          : saveState === "editing"
            ? !name.trim() || !email.trim() || name.trim().length > 40 || email.trim().length > 120
              ? "이름과 이메일을 확인해 주세요."
              : "수정 후 저장 버튼을 눌러 주세요."
            : saveState === "error"
              ? "저장 실패 · 연결을 확인하고 다시 저장해 주세요"
              : "저장 완료 · 다른 사용자에게 프로필이 표시됩니다."}
      </Text>
      <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
        <Text style={styles.saveButtonText}>
          {saveState === "error" ? "다시 저장" : "지금 저장"}
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const createStyles = (C: MonoTheme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: C.bg,
    },
    content: {
      padding: 20,
    },
    imageWrapper: {
      alignSelf: "center",
      marginBottom: 25,
    },
    profileImage: {
      width: 120,
      height: 120,
      borderRadius: 60,
      borderWidth: 1,
      borderBottomWidth: 3,
      borderColor: C.border,
    },
    placeholder: {
      width: 120,
      height: 120,
      borderRadius: 60,
      backgroundColor: C.surface,
      justifyContent: "center",
      alignItems: "center",
      borderWidth: 1,
      borderBottomWidth: 4,
      borderColor: C.border,
      shadowColor: C.shadow,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.16,
      shadowRadius: 2,
      elevation: 2,
    },
    placeholderText: {
      color: C.text,
    },
    label: {
      color: C.text,
      marginBottom: SPACE.sm,
      marginTop: 15,
      fontSize: TYPE_SIZE.body,
    },
    input: {
      backgroundColor: C.surface,
      borderRadius: RADIUS.compact,
      padding: SPACE.md,
      color: C.text,
      borderWidth: 1,
      borderBottomWidth: 4,
      borderColor: C.border,
    },
    typeContainer: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: SPACE.sm,
      marginTop: 5,
      marginBottom: 20,
    },
    typeButton: {
      minHeight: 44,
      flexBasis: "31%",
      flexGrow: 1,
      paddingHorizontal: 14,
      borderRadius: RADIUS.md,
      backgroundColor: C.surface,
      borderWidth: 1,
      borderBottomWidth: 3,
      borderColor: C.border,
      alignItems: "center",
      justifyContent: "center",
      shadowColor: C.shadow,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.14,
      shadowRadius: 2,
      elevation: 2,
    },
    typeButtonActive: {
      borderWidth: 2,
      borderBottomWidth: 4,
    },
    typeText: {
      color: C.text,
      fontSize: TYPE_SIZE.body,
    },
    typeTextActive: {
      color: C.text,
      fontWeight: TYPE_WEIGHT.semibold,
    },
    saveButton: {
      backgroundColor: C.surface,
      minHeight: 56,
      borderRadius: RADIUS.md,
      alignItems: "center",
      justifyContent: "center",
      marginTop: 10,
      borderWidth: 1,
      borderBottomWidth: 4,
      borderColor: C.border,
      shadowColor: C.shadow,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.14,
      shadowRadius: 2,
      elevation: 2,
    },
    saveButtonText: {
      color: C.text,
      fontSize: TYPE_SIZE.subheading,
      fontWeight: TYPE_WEIGHT.bold,
    },
    saveStatus: {
      color: C.muted,
      textAlign: "center",
      marginTop: 8,
      fontSize: TYPE_SIZE.label,
    },
  });
