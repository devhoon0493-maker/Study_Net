import { Ionicons } from "@expo/vector-icons";
import { useMemo } from "react";
import { useRouter } from "expo-router";
import { Alert, Image, ScrollView, StatusBar, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import BottomNav, { getBottomNavSpace } from "../../components/BottomNav";
import { getScreenTopPadding } from "../../constants/layout";
import { useMonoTheme } from "../../constants/mono";
import { useCommunityModeration } from "../../features/community/useCommunityModeration";
import { auth } from "../../utils/firebaseConfig";

export default function FriendsSettingsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { theme: C } = useMonoTheme();
  const { blockedUsers, unblockUser } = useCommunityModeration();
  const top = getScreenTopPadding(insets.top);
  const bottom = getBottomNavSpace(insets.bottom);
  const uid = auth.currentUser?.uid;
  const styles = useMemo(() => ({
    page: { flex: 1, backgroundColor: C.bg },
    header: { height: 56, flexDirection: "row" as const, alignItems: "center" as const, paddingHorizontal: 16, gap: 12 },
    title: { color: C.text, fontSize: 20, fontWeight: "700" as const },
    body: { padding: 18, paddingBottom: bottom + 24 },
    hint: { color: C.muted, fontSize: 14, lineHeight: 21, marginBottom: 16 },
    row: { minHeight: 72, flexDirection: "row" as const, alignItems: "center" as const, gap: 12, borderBottomWidth: 1, borderBottomColor: C.border },
    avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: C.surface, alignItems: "center" as const, justifyContent: "center" as const, overflow: "hidden" as const },
    avatarImage: { width: 44, height: 44 },
    name: { color: C.text, fontSize: 15, fontWeight: "600" as const, flex: 1 },
    button: { paddingVertical: 9, paddingHorizontal: 12, borderRadius: 10, backgroundColor: C.surface },
    buttonText: { color: C.text, fontSize: 13, fontWeight: "600" as const },
    empty: { alignItems: "center" as const, paddingTop: 64, gap: 12 },
    emptyText: { color: C.muted, fontSize: 14 },
  }), [C, bottom]);

  const confirmUnblock = (blockedUid: string, name: string) => {
    Alert.alert("차단 해제", `${name}님의 차단을 해제할까요?`, [
      { text: "취소", style: "cancel" },
      { text: "해제", onPress: () => void unblockUser(blockedUid).catch(() => Alert.alert("오류", "차단 해제에 실패했어요. 다시 시도해 주세요.")) },
    ]);
  };

  return (
    <View style={[styles.page, { paddingTop: top }]}>
      <StatusBar barStyle={C.statusBar} backgroundColor={C.bg} />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} accessibilityLabel="뒤로 가기">
          <Ionicons name="chevron-back" size={21} color={C.text} />
        </TouchableOpacity>
        <Text style={styles.title}>차단된 목록</Text>
      </View>
      <ScrollView contentContainerStyle={styles.body}>
        <Text style={styles.hint}>차단한 사용자의 게시글과 댓글은 커뮤니티에서 숨겨집니다. 차단을 해제하면 다시 표시됩니다.</Text>
        {!uid || blockedUsers.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="person-remove-outline" size={30} color={C.muted} />
            <Text style={styles.emptyText}>차단된 사용자가 없습니다.</Text>
          </View>
        ) : blockedUsers.map((user) => (
          <View key={user.uid} style={styles.row}>
            <View style={styles.avatar}>
              {user.image ? <Image source={{ uri: user.image }} style={styles.avatarImage} /> : <Ionicons name="person-outline" size={20} color={C.muted} />}
            </View>
            <Text style={styles.name} numberOfLines={1}>{user.name}</Text>
            <TouchableOpacity style={styles.button} onPress={() => confirmUnblock(user.uid, user.name)}>
              <Text style={styles.buttonText}>차단 해제</Text>
            </TouchableOpacity>
          </View>
        ))}
      </ScrollView>
      <BottomNav />
    </View>
  );
}
