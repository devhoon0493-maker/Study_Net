import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { get, ref } from "firebase/database";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { getScreenTopPadding } from "../constants/layout";
import { useMonoTheme } from "../constants/mono";
import { auth, db } from "../utils/firebaseConfig";

type PublicProfile = {
  name?: string;
  userType?: string;
  image?: string | null;
  bio?: string;
  communityActivityPublic?: boolean;
};

export default function UserProfileScreen() {
  const router = useRouter();
  const { uid } = useLocalSearchParams<{ uid?: string }>();
  const { theme: C } = useMonoTheme();
  const insets = useSafeAreaInsets();
  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const load = async () => {
      if (!uid) {
        setLoading(false);
        return;
      }
      try {
        const snapshot = await get(ref(db, `publicProfiles/${uid}`));
        let value = snapshot.val() as PublicProfile | null;
        if (!value && auth.currentUser?.uid === uid) {
          const fallback = await get(ref(db, `users/${uid}`));
          value = fallback.val() as PublicProfile | null;
        }
        if (active) setProfile(value);
      } catch {
        if (active) setProfile(null);
      } finally {
        if (active) setLoading(false);
      }
    };
    void load();
    return () => {
      active = false;
    };
  }, [uid]);

  const initial = profile?.name?.trim().slice(0, 1).toUpperCase() || "?";
  const isPrivate = profile?.communityActivityPublic !== true;

  return (
    <View style={[styles.container, { backgroundColor: C.bg, paddingTop: getScreenTopPadding(insets.top) }]}>
      <StatusBar barStyle={C.statusBar} backgroundColor={C.bg} />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton} accessibilityRole="button" accessibilityLabel="뒤로 가기">
          <Ionicons name="arrow-back" size={21} color={C.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: C.text }]}>공개 프로필</Text>
        <View style={styles.backButton} />
      </View>

      {loading ? (
        <ActivityIndicator style={styles.loader} color={C.primary} />
      ) : !profile ? (
        <View style={styles.empty}>
          <Ionicons name="person-circle-outline" size={42} color={C.muted} />
          <Text style={{ color: C.text, marginTop: 12 }}>프로필을 불러오지 못했어요.</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          <View style={[styles.card, { backgroundColor: C.surface, borderColor: C.borderSoft }]}>
            <View style={[styles.avatar, { backgroundColor: C.primarySoft }]}>
              {profile.image ? (
                <Image source={{ uri: profile.image }} style={styles.avatarImage} />
              ) : (
                <Text style={[styles.avatarInitial, { color: C.primary }]}>{initial}</Text>
              )}
            </View>
            <Text style={[styles.name, { color: C.text }]}>{profile.name || "Study User"}</Text>
            <View style={[styles.badge, { backgroundColor: C.bg }]}>
              <Ionicons name="person-outline" size={14} color={C.muted} />
              <Text style={{ color: C.muted }}>{profile.userType || "일반 회원"}</Text>
            </View>
            <View style={[styles.divider, { backgroundColor: C.borderSoft }]} />
            <View style={styles.sectionTitleRow}>
              <Ionicons name="chatbox-ellipses-outline" size={17} color={C.muted} />
              <Text style={[styles.sectionTitle, { color: C.text }]}>한 줄 소개</Text>
            </View>
            <Text style={[styles.bio, { color: C.muted }]}>
              {profile.bio?.trim() || "아직 등록된 소개가 없어요."}
            </Text>
            <View style={[styles.activityRow, { backgroundColor: C.bg }]}>
              <Ionicons name={isPrivate ? "lock-closed-outline" : "people-outline"} size={17} color={C.muted} />
              <Text style={{ color: C.muted }}>
                커뮤니티 활동 {isPrivate ? "비공개" : "공개"}
              </Text>
            </View>
          </View>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 20 },
  header: { height: 54, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  backButton: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  headerTitle: { fontSize: 18, fontWeight: "700" },
  loader: { flex: 1 },
  empty: { flex: 1, alignItems: "center", justifyContent: "center" },
  content: { paddingTop: 18, paddingBottom: 32 },
  card: { borderWidth: 1, borderRadius: 22, padding: 22, alignItems: "center" },
  avatar: { width: 96, height: 96, borderRadius: 48, overflow: "hidden", alignItems: "center", justifyContent: "center" },
  avatarImage: { width: "100%", height: "100%" },
  avatarInitial: { fontSize: 38, fontWeight: "700" },
  name: { marginTop: 16, fontSize: 23, fontWeight: "700" },
  badge: { marginTop: 9, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, flexDirection: "row", alignItems: "center", gap: 6 },
  divider: { height: 1, alignSelf: "stretch", marginVertical: 22 },
  sectionTitleRow: { alignSelf: "stretch", flexDirection: "row", alignItems: "center", gap: 7 },
  sectionTitle: { fontSize: 15, fontWeight: "700" },
  bio: { alignSelf: "stretch", marginTop: 10, minHeight: 44, lineHeight: 22, fontSize: 14 },
  activityRow: { alignSelf: "stretch", marginTop: 18, padding: 13, borderRadius: 12, flexDirection: "row", alignItems: "center", gap: 8 },
});
