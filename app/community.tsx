import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  ScrollView,
  StatusBar,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import BottomNav, { getBottomNavSpace } from "../components/BottomNav";
import { getScreenTopPadding } from "../constants/layout";
import { useMonoTheme } from "../constants/mono";
import {
  CategoryTabs,
  CommentSheet,
  ComposeSheet,
  CommunityHeader,
  LiveStudyPanel,
  PostCard,
  ProfilePreviewModal,
} from "../features/community/components";
import { createStyles } from "../features/community/communityStyles";
import type { CommunityPost } from "../features/community/communityTypes";
import { useCommunityActions } from "../features/community/useCommunityActions";
import { useCommunityAuthorProfile } from "../features/community/useCommunityAuthorProfile";
import { useCommunityBookmarks } from "../features/community/useCommunityBookmarks";
import { useCommunityCategoryFilter } from "../features/community/useCommunityCategoryFilter";
import { useCommunityCommentsSheet } from "../features/community/useCommunityCommentsSheet";
import { useCommunityComposeDraft } from "../features/community/useCommunityComposeDraft";
import { useCommunityFeed } from "../features/community/useCommunityFeed";
import { useCommunityModeration } from "../features/community/useCommunityModeration";
import { useCommunityPostTarget } from "../features/community/useCommunityPostTarget";
import { useCommunityProfilePreview } from "../features/community/useCommunityProfilePreview";
import { useLiveStudyRooms } from "../features/community/useLiveStudyRooms";
import { auth } from "../utils/firebaseConfig";

export default function CommunityScreen() {
  const router = useRouter();
  const {
    postId: targetPostIdParam,
    openComments: openCommentsParam,
  } = useLocalSearchParams<{ postId?: string; openComments?: string }>();
  const insets = useSafeAreaInsets();
  const { theme: C } = useMonoTheme();
  const s = useMemo(() => createStyles(C), [C]);
  const bottomSpace = getBottomNavSpace(insets.bottom);
  const topPadding = getScreenTopPadding(insets.top);

  const [composeVisible, setComposeVisible] = useState(false);
  const uid = auth.currentUser?.uid;
  const { authorProfile, loadAuthorProfile } = useCommunityAuthorProfile();
  const moderation = useCommunityModeration();
  const composeDraft = useCommunityComposeDraft();
  const { bookmarkedPostIds, loadBookmarks, toggleBookmark } =
    useCommunityBookmarks(uid);
  const { posts, loadingPosts, commentsByPost, loadError } = useCommunityFeed({
    bookmarkedPostIds,
    blockedUserIds: moderation.blockedUserIds,
    uid,
  });

  const openModerationMenu = (
    target: { uid: string; name: string; image?: string | null },
    type: "user" | "post" | "comment",
    targetId?: string,
  ) => {
    if (target.uid === uid) return;
    Alert.alert(target.name, undefined, [
      {
        text: "신고",
        onPress: () => Alert.alert("신고", "이 내용을 신고할까요?", [
          { text: "취소", style: "cancel" },
          { text: "신고", style: "destructive", onPress: () => void moderation.reportUser({ uid: target.uid, type, targetId }).then(() => Alert.alert("접수 완료", "신고가 접수되었습니다.")).catch(() => Alert.alert("오류", "신고를 접수하지 못했어요.")) },
        ]),
      },
      {
        text: moderation.blockedUserIds.has(target.uid) ? "차단 해제" : "차단",
        style: "destructive",
        onPress: () => moderation.blockedUserIds.has(target.uid)
          ? void moderation.unblockUser(target.uid).catch(() => Alert.alert("오류", "차단 해제에 실패했어요."))
          : Alert.alert("사용자 차단", `${target.name}님을 차단할까요?`, [
              { text: "취소", style: "cancel" },
              { text: "차단", style: "destructive", onPress: () => void moderation.blockUser(target).catch(() => Alert.alert("오류", "차단에 실패했어요.")) },
            ]),
      },
      { text: "취소", style: "cancel" },
    ]);
  };
  const {
    selectedCategory,
    setSelectedCategory,
    filteredPosts,
  } = useCommunityCategoryFilter(posts);
  const commentsSheet = useCommunityCommentsSheet(commentsByPost);
  const liveRooms = useLiveStudyRooms();
  const {
    submitPost: submitPostAction,
    toggleLike,
    deletePost,
    submitComment: submitCommentAction,
    deleteComment,
  } = useCommunityActions({ posts, uid });
  const {
    selectedProfile,
    openProfilePreview,
    closeProfilePreview,
  } = useCommunityProfilePreview(posts);

  useFocusEffect(
    useCallback(() => {
      loadAuthorProfile();
      loadBookmarks();
    }, [loadAuthorProfile, loadBookmarks]),
  );

  useEffect(() => {
    if (loadError) Alert.alert("불러오기 실패", loadError);
  }, [loadError]);

  const submitPost = async () => {
    const ok = await submitPostAction({
      ...authorProfile,
      draftCategory: composeDraft.draftCategory,
      draftGroupCode: composeDraft.draftGroupCode,
      draftTitle: composeDraft.draftTitle,
      draftBody: composeDraft.draftBody,
      draftImage: composeDraft.draftImage,
    });
    if (!ok) return;

    composeDraft.resetDraft();
    setComposeVisible(false);
  };

  const {
    feedScrollRef,
    registerPostLayout,
    targetPostId,
  } = useCommunityPostTarget({
    postIdParam: targetPostIdParam,
    openCommentsParam,
    posts,
    loadingPosts,
    onSelectCategory: setSelectedCategory,
    onOpenComments: commentsSheet.openComments,
  });

  const openGroup = (code?: string | null) => {
    if (typeof code === "string" && code.trim()) {
      router.push({ pathname: "/Group", params: { code } });
      return;
    }

    router.push("/Group");
  };

  const openGroupFromPost = (post: CommunityPost) => {
    openGroup(post.groupCode);
  };

  const submitComment = async () => {
    const ok = await submitCommentAction({
      selectedPost: commentsSheet.selectedPost,
      draftComment: commentsSheet.draftComment,
      authorName: authorProfile.authorName,
      authorImage: authorProfile.authorImage,
    });
    if (ok) commentsSheet.resetDraftComment();
  };

  return (
    <View style={[s.container, { paddingTop: topPadding }]}>
      <StatusBar barStyle={C.statusBar} backgroundColor={C.bg} />

      <CommunityHeader
        s={s}
        C={C}
        onBack={() => router.replace("/main")}
        onCompose={() => setComposeVisible(true)}
      />

      <CategoryTabs
        selectedCategory={selectedCategory}
        onSelectCategory={setSelectedCategory}
        s={s}
      />

      <View style={s.divider} />

      <ScrollView
        ref={feedScrollRef}
        contentContainerStyle={[s.feed, { paddingBottom: bottomSpace + 32 }]}
        showsVerticalScrollIndicator={false}
      >
        <LiveStudyPanel
          liveRooms={liveRooms}
          s={s}
          C={C}
          onOpenGroup={openGroup}
        />

        <View style={s.feedHeader}>
          <View>
            <Text style={s.feedTitle}>커뮤니티 피드</Text>
            <Text style={s.feedMeta}>게시물 {filteredPosts.length}개</Text>
          </View>
          <View style={s.feedSortButton}>
            <Ionicons name="filter-outline" size={14} color={C.text} />
            <Text style={s.feedSortText}>최신</Text>
          </View>
        </View>

        {loadingPosts ? (
          <View style={s.emptyFeedCard}>
            <Ionicons name="sync-outline" size={22} color={C.text} />
            <Text style={s.emptyFeedTitle}>게시글을 불러오는 중이에요.</Text>
          </View>
        ) : filteredPosts.length === 0 ? (
          <View style={s.emptyFeedCard}>
            <Ionicons name="chatbubbles-outline" size={22} color={C.text} />
            <Text style={s.emptyFeedTitle}>아직 게시글이 없어요.</Text>
            <Text style={s.emptyFeedText}>첫 공부 인증이나 질문을 남겨 커뮤니티를 시작해보세요.</Text>
            <TouchableOpacity style={s.emptyFeedButton} onPress={() => setComposeVisible(true)} activeOpacity={0.85}>
              <Ionicons name="create-outline" size={14} color={C.inverse} />
              <Text style={s.emptyFeedButtonText}>첫 글 쓰기</Text>
            </TouchableOpacity>
          </View>
        ) : (
          filteredPosts.map((post) => (
            <View
              key={post.id}
              onLayout={(event) => {
                registerPostLayout(post.id, event.nativeEvent.layout.y);
              }}
              style={targetPostId === post.id ? s.targetPostWrap : undefined}
            >
              <PostCard
                post={post}
                uid={uid}
                s={s}
                C={C}
                onOpenProfile={openProfilePreview}
                onDelete={deletePost}
                onToggleLike={toggleLike}
                onOpenComments={commentsSheet.openComments}
                onBookmark={toggleBookmark}
                onOpenGroup={openGroupFromPost}
                onMore={(post) => openModerationMenu({ uid: post.authorId, name: post.author, image: post.authorImage }, "post", post.id)}
              />
            </View>
          ))
        )}
      </ScrollView>

      <ComposeSheet
        visible={composeVisible}
        bottomInset={insets.bottom}
        topInset={insets.top}
        draftCategory={composeDraft.draftCategory}
        draftGroupCode={composeDraft.draftGroupCode}
        draftTitle={composeDraft.draftTitle}
        draftBody={composeDraft.draftBody}
        draftImage={composeDraft.draftImage}
        s={s}
        C={C}
        onClose={() => setComposeVisible(false)}
        onChangeCategory={composeDraft.changeCategory}
        onChangeGroupCode={composeDraft.changeGroupCode}
        onChangeTitle={composeDraft.setDraftTitle}
        onChangeBody={composeDraft.setDraftBody}
        onRemoveImage={composeDraft.removeImage}
        onPickImage={composeDraft.pickImage}
        onSubmit={submitPost}
      />

      <CommentSheet
        selectedPost={commentsSheet.selectedPost}
        comments={commentsSheet.comments}
        draftComment={commentsSheet.draftComment}
        uid={uid}
        bottomInset={insets.bottom}
        topInset={insets.top}
        s={s}
        C={C}
        onClose={commentsSheet.closeComments}
        onChangeComment={commentsSheet.setDraftComment}
        onSubmit={submitComment}
        onDeleteComment={deleteComment}
        onMoreComment={(comment) => openModerationMenu({ uid: comment.authorId, name: comment.author, image: comment.authorImage }, "comment", comment.id)}
      />

      <ProfilePreviewModal
        profile={selectedProfile}
        s={s}
        C={C}
        onClose={closeProfilePreview}
        isBlocked={selectedProfile ? moderation.blockedUserIds.has(selectedProfile.uid) : false}
        onBlock={(profile) => Alert.alert("사용자 차단", `${profile.name}님을 차단할까요?`, [
          { text: "취소", style: "cancel" },
          { text: "차단", style: "destructive", onPress: () => void moderation.blockUser({ uid: profile.uid, name: profile.name, image: profile.image }).catch(() => Alert.alert("오류", "차단에 실패했어요.")) },
        ])}
        onUnblock={(profile) => void moderation.unblockUser(profile.uid).catch(() => Alert.alert("오류", "차단 해제에 실패했어요."))}
        onReport={(profile) => openModerationMenu({ uid: profile.uid, name: profile.name, image: profile.image }, "user")}
      />
      <BottomNav />
    </View>
  );
}
