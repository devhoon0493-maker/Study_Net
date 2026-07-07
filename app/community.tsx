import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useFocusEffect, useRouter } from "expo-router";
import { get, onValue, push, ref, remove, set } from "firebase/database";
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
import {
  type Category,
  type PostCategory,
} from "../features/community/communityConstants";
import { createStyles } from "../features/community/communityStyles";
import type {
  CommunityComment,
  CommunityCommentRecord,
  CommunityPost,
  CommunityPostRecord,
  LiveStudyRoom,
  ProfilePreview,
  UserProfileRecord,
} from "../features/community/communityTypes";
import {
  snapshotToCommentsByPost,
  snapshotToPosts,
  snapshotToRooms,
  toEmbeddedImageUri,
} from "../features/community/communityUtils";
import { auth, db } from "../utils/firebaseConfig";

export default function CommunityScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { theme: C } = useMonoTheme();
  const s = useMemo(() => createStyles(C), [C]);
  const bottomSpace = getBottomNavSpace(insets.bottom);

  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<Category>("전체");
  const [composeVisible, setComposeVisible] = useState(false);
  const [draftCategory, setDraftCategory] = useState<PostCategory>("공부 인증");
  const [draftTitle, setDraftTitle] = useState("");
  const [draftBody, setDraftBody] = useState("");
  const [draftImage, setDraftImage] = useState<string | null>(null);
  const [authorName, setAuthorName] = useState("나");
  const [authorType, setAuthorType] = useState("");
  const [authorImage, setAuthorImage] = useState<string | null>(null);
  const [authorBio, setAuthorBio] = useState("");
  const [loadingPosts, setLoadingPosts] = useState(true);
  const [liveRooms, setLiveRooms] = useState<LiveStudyRoom[]>([]);
  const [commentsByPost, setCommentsByPost] = useState<Record<string, CommunityComment[]>>({});
  const [selectedPost, setSelectedPost] = useState<CommunityPost | null>(null);
  const [draftComment, setDraftComment] = useState("");
  const [selectedProfile, setSelectedProfile] = useState<ProfilePreview | null>(null);
  const uid = auth.currentUser?.uid;

  const loadProfile = useCallback(async () => {
    try {
      const profileRaw = await AsyncStorage.getItem("userProfile");

      if (profileRaw) {
        const profile = JSON.parse(profileRaw);
        setAuthorName(profile?.name || "나");
        setAuthorType(profile?.userType || "");
        setAuthorImage(profile?.image || null);
        setAuthorBio(profile?.bio || "");
      } else {
        setAuthorName("나");
        setAuthorType("");
        setAuthorImage(null);
        setAuthorBio("");
      }
    } catch {
      setAuthorName("나");
      setAuthorType("");
      setAuthorImage(null);
      setAuthorBio("");
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadProfile();
    }, [loadProfile]),
  );

  useEffect(() => {
    let rawPosts: Record<string, CommunityPostRecord> | null = null;
    let rawCheers: Record<string, Record<string, boolean>> = {};
    let rawComments: Record<string, Record<string, CommunityCommentRecord>> = {};
    let rawProfiles: Record<string, UserProfileRecord> = {};

    const syncPosts = () => {
      setPosts(snapshotToPosts(rawPosts, rawCheers, rawComments, rawProfiles, uid));
      setLoadingPosts(false);
    };

    const unsubscribePosts = onValue(
      ref(db, "communityPosts"),
      (snapshot) => {
        rawPosts = snapshot.val();
        syncPosts();
      },
      () => {
        setLoadingPosts(false);
        Alert.alert("불러오기 실패", "커뮤니티 게시글을 불러오지 못했어요.");
      },
    );

    const unsubscribeCheers = onValue(
      ref(db, "communityPostCheers"),
      (snapshot) => {
        rawCheers = snapshot.val() ?? {};
        syncPosts();
      },
      () => {
        setLoadingPosts(false);
      },
    );

    const unsubscribeComments = onValue(ref(db, "communityPostComments"), (snapshot) => {
      rawComments = snapshot.val() ?? {};
      setCommentsByPost(snapshotToCommentsByPost(rawComments));
      syncPosts();
    });

    const unsubscribeProfiles = onValue(ref(db, "users"), (snapshot) => {
      rawProfiles = snapshot.val() ?? {};
      syncPosts();
    });

    return () => {
      unsubscribePosts();
      unsubscribeCheers();
      unsubscribeComments();
      unsubscribeProfiles();
    };
  }, [uid]);

  useEffect(() => {
    const unsubscribeRooms = onValue(ref(db, "rooms"), (snapshot) => {
      setLiveRooms(snapshotToRooms(snapshot.val()));
    });

    return unsubscribeRooms;
  }, []);

  const filteredPosts = useMemo(() => {
    if (selectedCategory === "전체") return posts;
    return posts.filter((post) => post.category === selectedCategory);
  }, [posts, selectedCategory]);

  const selectedPostComments = useMemo(() => {
    if (!selectedPost) return [];
    return commentsByPost[selectedPost.id] ?? [];
  }, [commentsByPost, selectedPost]);

  const pickPostImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.45,
      base64: true,
    });

    if (!result.canceled) {
      const asset = result.assets[0];
      setDraftImage(asset.base64 ? toEmbeddedImageUri(asset.base64) : asset.uri);
    }
  };

  const submitPost = async () => {
    const title = draftTitle.trim();
    const body = draftBody.trim();

    if (title.length < 2 || body.length < 4) {
      Alert.alert("입력 확인", "제목과 내용을 조금 더 작성해주세요.");
      return;
    }

    const user = auth.currentUser;
    if (!user) {
      Alert.alert("로그인 필요", "커뮤니티 글을 작성하려면 로그인이 필요해요.");
      return;
    }

    const postRef = push(ref(db, "communityPosts"));
    const newPost: CommunityPostRecord = {
      authorId: user.uid,
      author: authorName,
      authorType,
      authorImage,
      authorBio,
      category: draftCategory,
      title,
      body,
      image: draftImage,
      createdAt: Date.now(),
      cheerCount: 0,
      commentCount: 0,
    };

    try {
      await set(postRef, newPost);
    } catch {
      Alert.alert("저장 실패", "게시글을 저장하지 못했어요.");
      return;
    }

    setDraftTitle("");
    setDraftBody("");
    setDraftImage(null);
    setDraftCategory("공부 인증");
    setComposeVisible(false);
  };

  const toggleLike = async (postId: string) => {
    const user = auth.currentUser;
    if (!user) {
      Alert.alert("로그인 필요", "응원하려면 로그인이 필요해요.");
      return;
    }

    const post = posts.find((item) => item.id === postId);
    const cheerRef = ref(db, `communityPostCheers/${postId}/${user.uid}`);

    try {
      if (post?.liked) {
        await remove(cheerRef);
      } else {
        await set(cheerRef, true);
      }
    } catch {
      Alert.alert("저장 실패", "응원 상태를 저장하지 못했어요.");
    }
  };

  const handleBookmarkPress = () => {
    Alert.alert("준비 중", "저장 기능은 다음 단계에서 연결하면 좋아요.");
  };

  const deletePost = (post: CommunityPost) => {
    if (post.authorId !== uid) return;

    Alert.alert("게시글 삭제", "이 게시글을 삭제할까요?", [
      { text: "취소", style: "cancel" },
      {
        text: "삭제",
        style: "destructive",
        onPress: async () => {
          try {
            await Promise.all([
              remove(ref(db, `communityPosts/${post.id}`)),
              remove(ref(db, `communityPostCheers/${post.id}`)),
              remove(ref(db, `communityPostComments/${post.id}`)),
            ]);
          } catch {
            Alert.alert("삭제 실패", "게시글을 삭제하지 못했어요.");
          }
        },
      },
    ]);
  };

  const openProfilePreview = async (post: CommunityPost) => {
    const fallbackProfile: ProfilePreview = {
      uid: post.authorId,
      name: post.author,
      userType: post.authorType,
      image: post.authorImage ?? null,
      bio: post.authorBio,
      postCount: posts.filter((item) => item.authorId === post.authorId).length,
      cheerCount: posts
        .filter((item) => item.authorId === post.authorId)
        .reduce((sum, item) => sum + item.likes, 0),
    };

    setSelectedProfile(fallbackProfile);

    try {
      const snapshot = await get(ref(db, `users/${post.authorId}`));
      if (!snapshot.exists()) return;

      const profile = snapshot.val();
      setSelectedProfile({
        ...fallbackProfile,
        name: profile.name || fallbackProfile.name,
        userType: profile.userType || fallbackProfile.userType,
        image: profile.image ?? fallbackProfile.image,
        bio: profile.bio || fallbackProfile.bio,
      });
    } catch {
      // The post already carries enough profile data for a compact preview.
    }
  };

  const openComments = (post: CommunityPost) => {
    setSelectedPost(post);
    setDraftComment("");
  };

  const closeComments = () => {
    setSelectedPost(null);
    setDraftComment("");
  };

  const submitComment = async () => {
    const body = draftComment.trim();
    const user = auth.currentUser;

    if (!selectedPost) return;

    if (!user) {
      Alert.alert("로그인 필요", "댓글을 작성하려면 로그인이 필요해요.");
      return;
    }

    if (body.length < 1) {
      Alert.alert("입력 확인", "댓글 내용을 입력해주세요.");
      return;
    }

    const commentRef = push(ref(db, `communityPostComments/${selectedPost.id}`));
    const newComment: CommunityCommentRecord = {
      authorId: user.uid,
      author: authorName,
      authorImage,
      body,
      createdAt: Date.now(),
    };

    try {
      await set(commentRef, newComment);
      setDraftComment("");
    } catch {
      Alert.alert("저장 실패", "댓글을 저장하지 못했어요.");
    }
  };

  const deleteComment = (comment: CommunityComment) => {
    if (comment.authorId !== uid) return;

    Alert.alert("댓글 삭제", "이 댓글을 삭제할까요?", [
      { text: "취소", style: "cancel" },
      {
        text: "삭제",
        style: "destructive",
        onPress: async () => {
          try {
            await remove(ref(db, `communityPostComments/${comment.postId}/${comment.id}`));
          } catch {
            Alert.alert("삭제 실패", "댓글을 삭제하지 못했어요.");
          }
        },
      },
    ]);
  };

  return (
    <View style={[s.container, { paddingTop: insets.top + 12 }]}>
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
        contentContainerStyle={[s.feed, { paddingBottom: bottomSpace + 32 }]}
        showsVerticalScrollIndicator={false}
      >
        <LiveStudyPanel
          liveRooms={liveRooms}
          s={s}
          C={C}
          onOpenGroup={() => router.push("/Group")}
        />

        <View style={s.feedHeader}>
          <View>
            <Text style={s.feedTitle}>커뮤니티 피드</Text>
            <Text style={s.feedMeta}>게시물 {filteredPosts.length}개</Text>
          </View>
          <TouchableOpacity style={s.feedSortButton} activeOpacity={0.8}>
            <Ionicons name="filter-outline" size={14} color={C.text} />
            <Text style={s.feedSortText}>최신</Text>
          </TouchableOpacity>
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
              <Ionicons name="create-outline" size={14} color={C.text} />
              <Text style={s.emptyFeedButtonText}>첫 글 쓰기</Text>
            </TouchableOpacity>
          </View>
        ) : (
          filteredPosts.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              uid={uid}
              s={s}
              C={C}
              onOpenProfile={openProfilePreview}
              onDelete={deletePost}
              onToggleLike={toggleLike}
              onOpenComments={openComments}
              onBookmark={handleBookmarkPress}
              onOpenGroup={() => router.push("/Group")}
            />
          ))
        )}
      </ScrollView>

      <ComposeSheet
        visible={composeVisible}
        bottomInset={insets.bottom}
        topInset={insets.top}
        draftCategory={draftCategory}
        draftTitle={draftTitle}
        draftBody={draftBody}
        draftImage={draftImage}
        s={s}
        C={C}
        onClose={() => setComposeVisible(false)}
        onChangeCategory={setDraftCategory}
        onChangeTitle={setDraftTitle}
        onChangeBody={setDraftBody}
        onRemoveImage={() => setDraftImage(null)}
        onPickImage={pickPostImage}
        onSubmit={submitPost}
      />

      <CommentSheet
        selectedPost={selectedPost}
        comments={selectedPostComments}
        draftComment={draftComment}
        uid={uid}
        bottomInset={insets.bottom}
        topInset={insets.top}
        s={s}
        C={C}
        onClose={closeComments}
        onChangeComment={setDraftComment}
        onSubmit={submitComment}
        onDeleteComment={deleteComment}
      />

      <ProfilePreviewModal
        profile={selectedProfile}
        s={s}
        C={C}
        onClose={() => setSelectedProfile(null)}
      />
      <BottomNav />
    </View>
  );
}
