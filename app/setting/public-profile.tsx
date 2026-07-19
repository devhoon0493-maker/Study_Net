import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { ref, update } from "firebase/database";
import { useEffect, useMemo, useState } from "react";
import {
  Alert,
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
import { auth, db } from "../../utils/firebaseConfig";

type UserProfile = {
  uid?: string;
  name?: string;
  email?: string;
  image?: string | null;
  userType?: string;
  bio?: string;
};

const MAX_BIO_LENGTH = 60;

const getInitial = (name: string) => name.trim().slice(0, 1).toUpperCase() || "S";

export default function PublicProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { theme: C } = useMonoTheme();
  const styles = useMemo(() => createStyles(C), [C]);
  const topPadding = getScreenTopPadding(insets.top);
  const bottomPadding = getScreenBottomPadding(insets.bottom, 44);

  const [profile, setProfile] = useState<UserProfile>({});
  const [bio, setBio] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const raw = await AsyncStorage.getItem("userProfile");
        const parsed: UserProfile = raw ? JSON.parse(raw) : {};
        setProfile(parsed);
        setBio(parsed.bio || "");
      } catch {
        setProfile({});
        setBio("");
      }
    };

    loadProfile();
  }, []);

  const savePublicProfile = async () => {
    if (saving) return;

    const trimmedBio = bio.trim();
    if (trimmedBio.length > MAX_BIO_LENGTH) {
      Alert.alert("글자 수 확인", `한줄 소개는 ${MAX_BIO_LENGTH}자 이내로 입력해주세요.`);
      return;
    }

    try {
      setSaving(true);
      const currentUser = auth.currentUser;
      const uid = currentUser?.uid || profile.uid;
      const nextProfile = {
        ...profile,
        uid,
        bio: trimmedBio,
        updatedAt: Date.now(),
      };

      await AsyncStorage.setItem("userProfile", JSON.stringify(nextProfile));

      if (uid) {
        await update(ref(db, `users/${uid}`), {
          bio: trimmedBio,
          updatedAt: nextProfile.updatedAt,
        });
      }

      router.back();
    } catch {
      Alert.alert("저장 실패", "공개 프로필을 저장하지 못했어요.");
    } finally {
      setSaving(false);
    }
  };

  const name = profile.name || "Study User";

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[
        styles.content,
        { paddingTop: topPadding, paddingBottom: bottomPadding },
      ]}
    >
      <View style={styles.header}>
        <TouchableOpacity style={styles.iconButton} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={20} color={C.text} />
        </TouchableOpacity>
        <Text style={styles.title}>공개 프로필</Text>
        <View style={styles.headerSpacer} />
      </View>

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
        onChangeText={(value) => setBio(value.slice(0, MAX_BIO_LENGTH))}
        placeholder="예: 매일 조금씩 성장하는 중"
        placeholderTextColor={C.text}
        maxLength={MAX_BIO_LENGTH}
        multiline
      />
      <Text style={styles.counter}>{bio.length}/{MAX_BIO_LENGTH}</Text>

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
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 22,
    },
    iconButton: {
      width: 38,
      height: 38,
      borderWidth: 1,
      borderBottomWidth: 3,
      borderColor: C.border,
      borderRadius: 10,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: C.surface,
    },
    headerSpacer: {
      width: 38,
    },
    title: {
      color: C.text,
      fontSize: 21,
      fontWeight: "900",
    },
    previewCard: {
      borderWidth: 1,
      borderBottomWidth: 4,
      borderColor: C.border,
      borderRadius: 18,
      backgroundColor: C.surface,
      padding: 20,
      alignItems: "center",
      marginBottom: 24,
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
      marginBottom: 12,
    },
    avatarImage: {
      width: "100%",
      height: "100%",
    },
    avatarText: {
      color: C.text,
      fontSize: 24,
      fontWeight: "900",
    },
    previewName: {
      color: C.text,
      fontSize: 18,
      fontWeight: "900",
    },
    badge: {
      borderWidth: 1,
      borderBottomWidth: 3,
      borderColor: C.border,
      borderRadius: 999,
      paddingHorizontal: 10,
      paddingVertical: 4,
      marginTop: 8,
    },
    badgeText: {
      color: C.text,
      fontSize: 11,
      fontWeight: "800",
    },
    previewBio: {
      color: C.text,
      fontSize: 13,
      fontWeight: "700",
      lineHeight: 19,
      textAlign: "center",
      marginTop: 12,
    },
    label: {
      color: C.text,
      fontSize: 13,
      fontWeight: "800",
      marginBottom: 8,
    },
    input: {
      minHeight: 92,
      borderWidth: 1,
      borderBottomWidth: 4,
      borderColor: C.border,
      borderRadius: 14,
      padding: 14,
      color: C.text,
      backgroundColor: C.surface,
      fontSize: 14,
      lineHeight: 20,
      textAlignVertical: "top",
    },
    counter: {
      color: C.text,
      fontSize: 11,
      fontWeight: "700",
      textAlign: "right",
      marginTop: 8,
    },
    saveButton: {
      minHeight: 54,
      borderWidth: 1,
      borderBottomWidth: 4,
      borderColor: C.border,
      borderRadius: 14,
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
      fontSize: 15,
      fontWeight: "900",
    },
  });
