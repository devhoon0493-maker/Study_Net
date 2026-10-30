import { Ionicons } from "@expo/vector-icons";
import { get, ref } from "firebase/database";
import { useEffect, useState } from "react";
import { ActivityIndicator, Image, Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useMonoTheme } from "../constants/mono";
import { db } from "../utils/firebaseConfig";

type PublicProfile = {
  name?: string;
  image?: string | null;
  userType?: string;
  bio?: string;
  communityActivityPublic?: boolean;
};

export default function PublicProfileModal({ uid, onClose, inline = false }: {
  uid: string | null;
  onClose: () => void;
  inline?: boolean;
}) {
  const { theme: C } = useMonoTheme();
  const insets = useSafeAreaInsets();
  const [result, setResult] = useState<{ uid: string; profile: PublicProfile | null } | null>(null);

  useEffect(() => {
    setResult(null);
    if (!uid) return;
    let active = true;
    void get(ref(db, `publicProfiles/${uid}`))
      .then((snapshot) => {
        if (active) setResult({ uid, profile: snapshot.val() as PublicProfile | null });
      })
      .catch(() => {
        if (active) setResult({ uid, profile: null });
      });
    return () => { active = false; };
  }, [uid]);

  if (!uid) return null;
  const loading = result?.uid !== uid;
  const profile = loading ? null : result.profile;
  const content = (
    <View style={[styles.backdrop, { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 20 }]}>
      <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityRole="button" accessibilityLabel="프로필 배경 닫기" />
      <View style={[styles.card, { backgroundColor: C.surface, borderColor: C.borderSoft }]} accessibilityViewIsModal>
        <View style={styles.header}>
          <Text style={[styles.title, { color: C.text }]}>프로필</Text>
          <Pressable onPress={onClose} style={styles.close} accessibilityRole="button" accessibilityLabel="프로필 닫기">
            <Ionicons name="close" size={22} color={C.text} />
          </Pressable>
        </View>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {loading ? <ActivityIndicator color={C.primary} style={styles.loader} /> : !profile ? (
            <Text style={[styles.bio, { color: C.muted }]}>프로필을 불러오지 못했어요.</Text>
          ) : (
            <>
              <View style={[styles.avatar, { backgroundColor: C.primarySoft }]}>
                {profile.image ? <Image source={{ uri: profile.image }} style={styles.image} /> : (
                  <Text style={[styles.initial, { color: C.primary }]}>{profile.name?.trim().slice(0, 1) || "?"}</Text>
                )}
              </View>
              <Text style={[styles.name, { color: C.text }]}>{profile.name || "Study User"}</Text>
              <Text style={[styles.type, { color: C.muted }]}>{profile.userType || "일반 회원"}</Text>
              <View style={[styles.info, { borderTopColor: C.borderSoft }]}>
                <Text style={[styles.label, { color: C.text }]}>한줄소개</Text>
                <Text style={[styles.bio, { color: C.muted }]}>{profile.bio?.trim() || "아직 등록된 소개가 없어요."}</Text>
              </View>
              <Text style={[styles.privacy, { color: C.muted }]}>커뮤니티 활동 {profile.communityActivityPublic === true ? "공개" : "비공개"}</Text>
            </>
          )}
        </ScrollView>
      </View>
    </View>
  );
  return inline ? content : (
    <Modal transparent visible animationType="fade" onRequestClose={onClose}>{content}</Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "center", alignItems: "center", paddingHorizontal: 24, zIndex: 10 },
  card: { width: "100%", maxWidth: 360, maxHeight: "100%", borderRadius: 22, borderWidth: 1, overflow: "hidden", flexShrink: 1 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingLeft: 22, paddingRight: 10, paddingTop: 10 },
  title: { fontSize: 17, fontWeight: "700" },
  close: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  content: { padding: 22, paddingTop: 8, alignItems: "center" },
  loader: { marginVertical: 40 },
  avatar: { width: 72, height: 72, borderRadius: 36, overflow: "hidden", alignItems: "center", justifyContent: "center" },
  image: { width: "100%", height: "100%" },
  initial: { fontSize: 30, fontWeight: "700" },
  name: { fontSize: 21, fontWeight: "700", marginTop: 14, textAlign: "center" },
  type: { fontSize: 13, marginTop: 6 },
  info: { borderTopWidth: 1, marginTop: 20, paddingTop: 16, alignSelf: "stretch" },
  label: { fontSize: 14, fontWeight: "600" },
  bio: { fontSize: 14, lineHeight: 22, marginTop: 8 },
  privacy: { fontSize: 12, marginTop: 18 },
});
