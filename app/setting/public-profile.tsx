import { RADIUS, SPACE, TYPE_SIZE, TYPE_WEIGHT } from "../../constants/designTokens";
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
import { SettingsHeader } from "../../features/settings/SettingsHeader";
import {
  PUBLIC_PROFILE_BIO_MAX_LENGTH,
  usePublicProfileForm,
} from "../../features/settings/usePublicProfileForm";

const getInitial = (name: string) => name.trim().slice(0, 1).toUpperCase() || "S";

export default function PublicProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { theme: C } = useMonoTheme();
  const styles = useMemo(() => createStyles(C), [C]);
  const topPadding = getScreenTopPadding(insets.top);
  const bottomPadding = getScreenBottomPadding(insets.bottom, 44);

  const { profile, bio, saving, updateBio, savePublicProfile } =
    usePublicProfileForm({
      onSaved: () => router.back(),
    });

  const name = profile.name || "Study User";

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[
        styles.content,
        { paddingTop: topPadding, paddingBottom: bottomPadding },
      ]}
    >
      <SettingsHeader title="공개 프로필" compactTitle />

      <View style={styles.previewCard}>
        <View style={styles.avatar}>
          {profile.image ? (
            <Image source={{ uri: profile.image }} style={styles.avatarImage} />
          ) : (
            <Text style={styles.avatarText}>{getInitial(name)}</Text>
          )}
        </View>
        <Text style={styles.previewName}>{name}</Text>
        {profile.userType ? (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{profile.userType}</Text>
          </View>
        ) : null}
        <Text style={styles.previewBio}>
          {bio.trim() || "아직 한줄 소개가 없어요."}
        </Text>
      </View>

      <Text style={styles.label}>한줄 소개</Text>
      <TextInput
        style={styles.input}
        value={bio}
        onChangeText={updateBio}
        placeholder="예: 매일 조금씩 성장하는 중"
        placeholderTextColor={C.subtle}
        maxLength={PUBLIC_PROFILE_BIO_MAX_LENGTH}
        multiline
      />
      <Text style={styles.counter}>{bio.length}/{PUBLIC_PROFILE_BIO_MAX_LENGTH}</Text>

      <TouchableOpacity
        style={[styles.saveButton, saving && styles.saveButtonDisabled]}
        onPress={savePublicProfile}
        disabled={saving}
      >
        <Text style={styles.saveButtonText}>{saving ? "저장 중" : "저장하기"}</Text>
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
      paddingHorizontal: 20,
    },
    previewCard: {
      borderWidth: 1,
      borderBottomWidth: 4,
      borderColor: C.border,
      borderRadius: RADIUS.card,
      backgroundColor: C.surface,
      padding: 20,
      alignItems: "center",
      marginBottom: SPACE.xl,
    },
    avatar: {
      width: 72,
      height: 72,
      borderRadius: 36,
      borderWidth: 1,
      borderBottomWidth: 4,
      borderColor: C.border,
      backgroundColor: C.surface,
      alignItems: "center",
      justifyContent: "center",
      overflow: "hidden",
      marginBottom: SPACE.md,
    },
    avatarImage: {
      width: "100%",
      height: "100%",
    },
    avatarText: {
      color: C.text,
      fontSize: TYPE_SIZE.heading,
      fontWeight: TYPE_WEIGHT.heavy,
    },
    previewName: {
      color: C.text,
      fontSize: TYPE_SIZE.title,
      fontWeight: TYPE_WEIGHT.heavy,
    },
    badge: {
      borderWidth: 1,
      borderBottomWidth: 3,
      borderColor: C.border,
      borderRadius: RADIUS.pill,
      paddingHorizontal: 10,
      paddingVertical: SPACE.xs,
      marginTop: SPACE.sm,
    },
    badgeText: {
      color: C.text,
      fontSize: TYPE_SIZE.captionLarge,
      fontWeight: TYPE_WEIGHT.strong,
    },
    previewBio: {
      color: C.text,
      fontSize: TYPE_SIZE.bodySmall,
      fontWeight: TYPE_WEIGHT.bold,
      lineHeight: 19,
      textAlign: "center",
      marginTop: SPACE.md,
    },
    label: {
      color: C.text,
      fontSize: TYPE_SIZE.bodySmall,
      fontWeight: TYPE_WEIGHT.strong,
      marginBottom: SPACE.sm,
    },
    input: {
      minHeight: 92,
      borderWidth: 1,
      borderBottomWidth: 4,
      borderColor: C.border,
      borderRadius: RADIUS.control,
      padding: 14,
      color: C.text,
      backgroundColor: C.surface,
      fontSize: TYPE_SIZE.body,
      lineHeight: 20,
      textAlignVertical: "top",
    },
    counter: {
      color: C.text,
      fontSize: TYPE_SIZE.captionLarge,
      fontWeight: TYPE_WEIGHT.bold,
      textAlign: "right",
      marginTop: SPACE.sm,
    },
    saveButton: {
      minHeight: 54,
      borderWidth: 1,
      borderBottomWidth: 4,
      borderColor: C.border,
      borderRadius: RADIUS.control,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: C.surface,
      marginTop: 22,
    },
    saveButtonDisabled: {
      opacity: 0.5,
    },
    saveButtonText: {
      color: C.text,
      fontSize: TYPE_SIZE.bodyStrong,
      fontWeight: TYPE_WEIGHT.heavy,
    },
  });
