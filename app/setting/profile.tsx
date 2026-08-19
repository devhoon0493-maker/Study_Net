import { useRouter } from "expo-router";
import { useMemo } from "react";
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
  } = useProfileForm({
    onSaved: () => router.back(),
  });

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

      <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
        <Text style={styles.saveButtonText}>저장하기</Text>
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
      marginBottom: 8,
      marginTop: 15,
      fontSize: 14,
    },
    input: {
      backgroundColor: C.surface,
      borderRadius: 10,
      padding: 12,
      color: C.text,
      borderWidth: 1,
      borderBottomWidth: 4,
      borderColor: C.border,
    },
    typeContainer: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
      marginTop: 5,
      marginBottom: 20,
    },
    typeButton: {
      minHeight: 44,
      flexBasis: "31%",
      flexGrow: 1,
      paddingHorizontal: 14,
      borderRadius: 12,
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
      fontSize: 14,
    },
    typeTextActive: {
      color: C.text,
      fontWeight: "600",
    },
    saveButton: {
      backgroundColor: C.surface,
      minHeight: 56,
      borderRadius: 12,
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
      fontSize: 16,
      fontWeight: "bold",
    },
  });
