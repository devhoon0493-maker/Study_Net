import { RADIUS, SPACE, TYPE_SIZE, TYPE_WEIGHT } from "../constants/designTokens";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  Image,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import {
  getScreenBottomPadding,
  getScreenTopPadding,
} from "../constants/layout";
import { useMonoTheme, type MonoTheme } from "../constants/mono";
import { categoryEmoji } from "../features/community/communityConstants";
import { formatRelativeTime, getInitial } from "../features/community/communityUtils";
import { auth } from "../utils/firebaseConfig";
import {
  buildCommunityNotifications,
  saveCommunityNotificationsReadAt,
  subscribeCommunityNotificationSources,
  type CommunityNotification,
} from "../utils/communityNotifications";

export default function NotificationsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { theme: C } = useMonoTheme();
  const s = useMemo(() => createStyles(C), [C]);
  const topPadding = getScreenTopPadding(insets.top);
  const bottomPadding = getScreenBottomPadding(insets.bottom, 32);
  const uid = auth.currentUser?.uid;
  const [notifications, setNotifications] = useState<CommunityNotification[]>([]);

  useEffect(() => {
    if (!uid) {
      setNotifications([]);
      return;
    }

    const unsubscribe = subscribeCommunityNotificationSources(uid, (sources) => {
      setNotifications(
        buildCommunityNotifications({
          ...sources,
          uid,
        }),
      );
    });

    saveCommunityNotificationsReadAt(uid).catch(() => {});

    return () => {
      unsubscribe();
    };
  }, [uid]);

  return (
    <View style={[s.container, { paddingTop: topPadding }]}>
      <StatusBar barStyle={C.statusBar} backgroundColor={C.bg} />

      <View style={s.header}>
        <TouchableOpacity
          testID="notifications-back-button"
          style={s.iconButton}
          onPress={() => router.back()}
        >
          <Ionicons name="chevron-back" size={20} color={C.text} />
        </TouchableOpacity>
        <View style={s.headerText}>
          <Text style={s.title}>알림</Text>
          <Text style={s.subtitle}>내 커뮤니티 글의 반응</Text>
        </View>
        <TouchableOpacity
          testID="notifications-community-button"
          style={s.iconButton}
          onPress={() => router.push("/community")}
        >
          <Ionicons name="chatbubbles-outline" size={18} color={C.text} />
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[s.content, { paddingBottom: bottomPadding }]}
      >
        {notifications.length === 0 ? (
          <View style={s.emptyCard}>
            <Ionicons name="notifications-off-outline" size={26} color={C.muted} />
            <Text style={s.emptyTitle}>아직 새 반응이 없어요.</Text>
            <Text style={s.emptyText}>
              내 게시글에 응원이나 댓글이 달리면 여기에 표시됩니다.
            </Text>
          </View>
        ) : (
          notifications.map((item) => (
            <TouchableOpacity
              testID={`notification-card-${item.id}`}
              key={item.id}
              style={s.notificationCard}
              activeOpacity={0.84}
              onPress={() =>
                router.push({
                  pathname: "/community",
                  params: {
                    postId: item.postId,
                    openComments: item.type === "comment" ? "1" : "0",
                  },
                })
              }
            >
              <View style={s.avatar}>
                {item.actorImage ? (
                  <Image source={{ uri: item.actorImage }} style={s.avatarImage} />
                ) : (
                  <Text style={s.avatarText}>{getInitial(item.actorName)}</Text>
                )}
              </View>

              <View style={s.notificationBody}>
                <View style={s.notificationTop}>
                  <Text style={s.message} numberOfLines={2}>
                    <Text style={s.actor}>{item.actorName}</Text>
                    {item.type === "cheer"
                      ? "님이 내 글을 응원했어요."
                      : "님이 내 글에 댓글을 달았어요."}
                  </Text>
                  <View
                    style={[
                      s.typeIcon,
                      item.type === "comment" && s.typeIconComment,
                    ]}
                  >
                    <Ionicons
                      name={item.type === "cheer" ? "heart" : "chatbubble"}
                      size={12}
                      color={item.type === "cheer" ? C.danger : C.primary}
                    />
                  </View>
                </View>

                <View style={s.postPreview}>
                  <View style={s.postPreviewTop}>
                    <View style={s.postCategoryPill}>
                      <Text style={s.postCategoryText}>
                        {categoryEmoji[item.postCategory]} {item.postCategory}
                      </Text>
                    </View>
                    <Text style={s.postPreviewLabel}>내 글</Text>
                  </View>
                  <Text style={s.postTitle} numberOfLines={1}>
                    {item.postTitle}
                  </Text>
                  <Text style={s.postBody} numberOfLines={2}>
                    {item.postBody}
                  </Text>
                  {item.postImage ? (
                    <Image source={{ uri: item.postImage }} style={s.postImage} />
                  ) : null}
                </View>

                {item.body ? (
                  <View style={s.commentPreview}>
                    <Text style={s.commentLabel}>댓글</Text>
                    <Text style={s.commentBody} numberOfLines={2}>
                      {item.body}
                    </Text>
                  </View>
                ) : null}

                <Text style={s.timeText}>
                  {item.legacy ? "기존 응원" : formatRelativeTime(item.createdAt)}
                </Text>
              </View>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const createStyles = (C: MonoTheme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: C.bg,
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: SPACE.lg,
      paddingBottom: 14,
      gap: SPACE.md,
    },
    iconButton: {
      width: 38,
      height: 38,
      borderRadius: RADIUS.compact,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: C.surfaceAlt,
    },
    headerText: {
      flex: 1,
      minWidth: 0,
    },
    title: {
      color: C.text,
      fontSize: TYPE_SIZE.titleLarge,
      fontWeight: TYPE_WEIGHT.heavy,
    },
    subtitle: {
      color: C.muted,
      fontSize: TYPE_SIZE.captionLarge,
      fontWeight: TYPE_WEIGHT.bold,
      marginTop: 2,
    },
    content: {
      paddingHorizontal: SPACE.lg,
      paddingTop: 6,
      gap: 10,
    },
    emptyCard: {
      alignItems: "center",
      paddingVertical: 44,
      paddingHorizontal: 18,
      borderRadius: RADIUS.lg,
      backgroundColor: C.surface,
      borderWidth: 1,
      borderColor: C.border,
    },
    emptyTitle: {
      color: C.text,
      fontSize: TYPE_SIZE.bodyStrong,
      fontWeight: TYPE_WEIGHT.heavy,
      marginTop: 10,
    },
    emptyText: {
      color: C.muted,
      fontSize: TYPE_SIZE.label,
      lineHeight: 18,
      textAlign: "center",
      marginTop: 5,
    },
    notificationCard: {
      flexDirection: "row",
      gap: SPACE.md,
      padding: 14,
      borderRadius: RADIUS.control,
      backgroundColor: C.surface,
      borderWidth: 1,
      borderColor: C.border,
    },
    avatar: {
      width: 42,
      height: 42,
      borderRadius: 21,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: C.primarySoft,
      overflow: "hidden",
    },
    avatarImage: {
      width: "100%",
      height: "100%",
    },
    avatarText: {
      color: C.primary,
      fontSize: TYPE_SIZE.bodyStrong,
      fontWeight: TYPE_WEIGHT.heavy,
    },
    notificationBody: {
      flex: 1,
      minWidth: 0,
    },
    notificationTop: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: SPACE.sm,
    },
    message: {
      flex: 1,
      color: C.text,
      fontSize: TYPE_SIZE.bodySmall,
      lineHeight: 19,
      fontWeight: TYPE_WEIGHT.bold,
    },
    actor: {
      fontWeight: TYPE_WEIGHT.heavy,
    },
    typeIcon: {
      width: 24,
      height: 24,
      borderRadius: RADIUS.md,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: C.dangerSoft,
    },
    typeIconComment: {
      backgroundColor: C.primarySoft,
    },
    postTitle: {
      color: C.text,
      fontSize: TYPE_SIZE.label,
      fontWeight: TYPE_WEIGHT.heavy,
      marginTop: 6,
    },
    postPreview: {
      borderWidth: 1,
      borderColor: C.border,
      borderRadius: RADIUS.md,
      backgroundColor: C.surfaceAlt,
      padding: 10,
      marginTop: 9,
    },
    postPreviewTop: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: SPACE.sm,
    },
    postCategoryPill: {
      borderRadius: RADIUS.pill,
      backgroundColor: C.primarySoft,
      paddingHorizontal: 7,
      paddingVertical: 2,
    },
    postCategoryText: {
      color: C.primary,
      fontSize: TYPE_SIZE.caption,
      fontWeight: TYPE_WEIGHT.heavy,
    },
    postPreviewLabel: {
      color: C.subtle,
      fontSize: TYPE_SIZE.caption,
      fontWeight: TYPE_WEIGHT.strong,
    },
    postBody: {
      color: C.muted,
      fontSize: TYPE_SIZE.label,
      lineHeight: 17,
      marginTop: SPACE.xs,
    },
    postImage: {
      width: "100%",
      aspectRatio: 4 / 3,
      borderRadius: RADIUS.compact,
      marginTop: SPACE.sm,
      backgroundColor: C.surface,
    },
    commentPreview: {
      borderLeftWidth: 3,
      borderLeftColor: C.primary,
      paddingLeft: 9,
      marginTop: 9,
    },
    commentLabel: {
      color: C.primary,
      fontSize: TYPE_SIZE.caption,
      fontWeight: TYPE_WEIGHT.heavy,
      marginBottom: 2,
    },
    commentBody: {
      color: C.muted,
      fontSize: TYPE_SIZE.label,
      lineHeight: 18,
      marginTop: SPACE.xs,
    },
    timeText: {
      color: C.subtle,
      fontSize: TYPE_SIZE.captionLarge,
      fontWeight: TYPE_WEIGHT.bold,
      marginTop: SPACE.sm,
    },
  });
