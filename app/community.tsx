import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useFocusEffect, useRouter } from "expo-router";
import { get, onValue, push, ref, remove, set } from "firebase/database";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import BottomNav, { getBottomNavSpace } from "../components/BottomNav";
import { useMonoTheme, type MonoTheme } from "../constants/mono";
import { auth, db } from "../utils/firebaseConfig";

const categories = ["전체", "공부 인증", "질문", "목표 공유", "그룹 모집"] as const;
type Category = (typeof categories)[number];
type PostCategory = Exclude<Category, "전체">;

const categoryEmoji: Record<PostCategory, string> = {
  "공부 인증": "✏️",
  질문: "❓",
  "목표 공유": "🎯",
  "그룹 모집": "👥",
};

const toEmbeddedImageUri = (base64: string) => `data:image/jpeg;base64,${base64}`;

type CommunityPost = {
  id: string;
  authorId: string;
  author: string;
  authorType?: string;
  authorImage?: string | null;
  authorBio?: string;
  category: PostCategory;
  title: string;
  body: string;
  image?: string | null;
  createdAt: number;
  likes: number;
  comments: number;
  liked?: boolean;
  bookmarked?: boolean;
};

type LiveStudyRoom = {
  id: string;
  name: string;
  subjects: string;
  memberCount: number;
  code: string;
  createdAt: number;
};

type LiveStudyRoomRecord = {
  name?: string;
  subjects?: string;
  members?: Record<string, unknown>;
  code?: string;
  createdAt?: number;
  visibility?: "public" | "private";
};

type CommunityPostRecord = Omit<CommunityPost, "id" | "likes" | "comments" | "liked" | "bookmarked"> & {
  cheerCount?: number;
  commentCount?: number;
};

type CommunityComment = {
  id: string;
  postId: string;
  authorId: string;
  author: string;
  authorImage?: string | null;
  body: string;
  createdAt: number;
};

type CommunityCommentRecord = Omit<CommunityComment, "id" | "postId">;

type UserProfileRecord = {
  name?: string;
  userType?: string;
  image?: string | null;
  bio?: string;
};

type ProfilePreview = {
  uid: string;
  name: string;
  userType?: string;
  image?: string | null;
  bio?: string;
  postCount: number;
  cheerCount: number;
};

const getInitial = (name: string) => name.trim().slice(0, 1).toUpperCase() || "S";

const formatRelativeTime = (createdAt: number) => {
  const diff = Math.max(0, Date.now() - createdAt);
  const minutes = Math.floor(diff / (1000 * 60));

  if (minutes < 1) return "방금 전";
  if (minutes < 60) return `${minutes}분 전`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}시간 전`;

  return `${Math.floor(hours / 24)}일 전`;
};

const sortPosts = (nextPosts: CommunityPost[]) => {
  return [...nextPosts].sort((a, b) => b.createdAt - a.createdAt);
};

const snapshotToPosts = (
  rawPosts: Record<string, CommunityPostRecord> | null,
  cheers: Record<string, Record<string, boolean>>,
  comments: Record<string, Record<string, CommunityCommentRecord>>,
  profiles: Record<string, UserProfileRecord>,
  uid?: string,
) => {
  if (!rawPosts) return [];

  return sortPosts(
    Object.entries(rawPosts).map(([id, post]) => {
      const postCheers = cheers[id] ?? {};
      const postComments = comments[id] ?? {};
      const likes = Object.values(postCheers).filter(Boolean).length;
      const profile = profiles[post.authorId] ?? {};

      return {
        id,
        authorId: post.authorId,
        author: profile.name || post.author,
        authorType: profile.userType ?? post.authorType,
        authorImage: profile.image ?? post.authorImage ?? null,
        authorBio: profile.bio ?? post.authorBio,
        category: post.category,
        title: post.title,
        body: post.body,
        image: post.image ?? null,
        createdAt: post.createdAt,
        likes,
        comments: Object.keys(postComments).length,
        liked: uid ? !!postCheers[uid] : false,
      };
    }),
  );
};

const snapshotToCommentsByPost = (
  rawComments: Record<string, Record<string, CommunityCommentRecord>> | null,
): Record<string, CommunityComment[]> => {
  if (!rawComments) return {};

  return Object.fromEntries(
    Object.entries(rawComments).map(([postId, comments]) => [
      postId,
      Object.entries(comments)
        .map(([id, comment]) => ({
          id,
          postId,
          authorId: comment.authorId,
          author: comment.author,
          authorImage: comment.authorImage ?? null,
          body: comment.body,
          createdAt: comment.createdAt,
        }))
        .sort((a, b) => a.createdAt - b.createdAt),
    ]),
  );
};

const snapshotToRooms = (rawRooms: Record<string, LiveStudyRoomRecord> | null): LiveStudyRoom[] => {
  if (!rawRooms) return [];

  return Object.entries(rawRooms)
    .filter(([, room]) => (room?.visibility ?? "public") === "public")
    .map(([id, room]) => ({
      id,
      name: room.name ?? "스터디룸",
      subjects: room.subjects ?? "자유 공부",
      memberCount: Object.keys(room.members ?? {}).length,
      code: room.code ?? "",
      createdAt: room.createdAt ?? 0,
    }))
    .filter((room) => room.memberCount > 0)
    .sort((a, b) => b.createdAt - a.createdAt)
    .slice(0, 5);
};

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

      <View style={s.header}>
        <TouchableOpacity style={s.backButton} onPress={() => router.replace("/main")}>
          <Ionicons name="chevron-back" size={20} color={C.text} />
        </TouchableOpacity>

        <View style={s.headerTitleWrap}>
          <Text style={s.headerTitle}>소셜</Text>
          <Text style={s.headerSub}>글도 보고 바로 같이 공부하기</Text>
        </View>

        <TouchableOpacity style={s.composeButton} onPress={() => setComposeVisible(true)}>
          <Ionicons name="create-outline" size={18} color={C.text} />
          <Text style={s.composeButtonText}>글쓰기</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        horizontal
        style={s.tabScroll}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={s.tabBar}
      >
        {categories.map((category) => {
          const active = selectedCategory === category;

          return (
            <TouchableOpacity
              key={category}
              style={[s.tab, active && s.tabActive]}
              onPress={() => setSelectedCategory(category)}
              activeOpacity={0.8}
            >
              <Text style={[s.tabText, active && s.tabTextActive]}>{category}</Text>
              {active && <View style={s.tabUnderline} />}
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <View style={s.divider} />

      <ScrollView
        contentContainerStyle={[s.feed, { paddingBottom: bottomSpace + 32 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={s.livePanel}>
          <View style={s.livePanelHeader}>
            <View>
              <Text style={s.liveEyebrow}>실시간 스터디</Text>
              <Text style={s.liveTitle}>
                {liveRooms.length > 0 ? `지금 ${liveRooms.reduce((sum, room) => sum + room.memberCount, 0)}명이 공부 중` : "실시간 스터디"}
              </Text>
            </View>

            <TouchableOpacity style={s.liveHeaderButton} onPress={() => router.push("/Group")} activeOpacity={0.8}>
              <Text style={s.liveHeaderButtonText}>그룹</Text>
              <Ionicons name="chevron-forward" size={14} color={C.text} />
            </TouchableOpacity>
          </View>

          {liveRooms.length === 0 ? (
            <View style={s.liveEmptyBox}>
              <Ionicons name="people-outline" size={18} color={C.text} />
              <Text style={s.liveEmptyTitle}>아직 표시할 라이브 스터디가 없어요.</Text>
              <Text style={s.liveEmptyText}>그룹 방이 열리면 현재 공부중인 방이 여기에 표시됩니다.</Text>
            </View>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.liveRoomRow}>
              {liveRooms.map((room) => (
                <TouchableOpacity key={room.id} style={s.liveRoomCard} onPress={() => router.push("/Group")} activeOpacity={0.82}>
                  <View style={s.liveRoomTop}>
                    <View style={s.liveDot} />
                    <Text style={s.liveRoomSubject}>{room.subjects}</Text>
                  </View>
                  <Text style={s.liveRoomName} numberOfLines={1}>{room.name}</Text>
                  <View style={s.liveRoomMeta}>
                    <Text style={s.liveRoomMetaText}>{room.memberCount}명 공부 중</Text>
                    <Text style={s.liveRoomCode}>{room.code}</Text>
                  </View>
                  <View style={s.joinRoomButton}>
                    <Ionicons name="enter-outline" size={13} color={C.text} />
                    <Text style={s.joinRoomButtonText}>그룹으로 이동</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}
        </View>

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
            <View key={post.id} style={s.card}>
            <View style={s.cardTop}>
              <TouchableOpacity style={s.avatar} onPress={() => openProfilePreview(post)} activeOpacity={0.8}>
                {post.authorImage ? (
                  <Image source={{ uri: post.authorImage }} style={s.avatarImage} />
                ) : (
                  <Text style={s.avatarText}>{getInitial(post.author)}</Text>
                )}
              </TouchableOpacity>

              <View style={s.cardTopMeta}>
                <TouchableOpacity onPress={() => openProfilePreview(post)} activeOpacity={0.8}>
                  <Text style={s.authorName}>{post.author}</Text>
                </TouchableOpacity>

                <View style={s.metaRow}>
                  <View style={s.categoryTag}>
                    <Text style={s.categoryTagText}>
                      {categoryEmoji[post.category]} {post.category}
                    </Text>
                  </View>

                  <Text style={s.dot}>·</Text>
                  {post.authorType ? (
                    <>
                      <Text style={s.timeText}>{post.authorType}</Text>
                      <Text style={s.dot}>·</Text>
                    </>
                  ) : null}
                  <Text style={s.timeText}>{formatRelativeTime(post.createdAt)}</Text>
                </View>
              </View>
              {post.authorId === uid ? (
                <TouchableOpacity style={s.cardIconButton} onPress={() => deletePost(post)} activeOpacity={0.8}>
                  <Ionicons name="trash-outline" size={16} color={C.text} />
                </TouchableOpacity>
              ) : null}
            </View>

            <Text style={s.cardTitle}>{post.title}</Text>
            <Text style={s.cardBody}>{post.body}</Text>
            {post.image ? (
              <Image source={{ uri: post.image }} style={s.postImage} />
            ) : null}

            <View style={s.cardActions}>
              <TouchableOpacity style={s.actionBtn} onPress={() => toggleLike(post.id)}>
                <Ionicons
                  name={post.liked ? "heart" : "heart-outline"}
                  size={17}
                  color={post.liked ? C.danger : C.muted}
                />

                <Text style={[s.actionCount, post.liked && s.actionCountLiked]}>
                  응원 {post.likes}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity style={s.actionBtn} onPress={() => openComments(post)}>
                <Ionicons name="chatbubble-outline" size={16} color={C.text} />
                <Text style={s.actionCount}>댓글 {post.comments}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[s.actionBtn, s.actionBtnRight, post.category === "그룹 모집" && s.joinStudyAction]}
                onPress={post.category === "그룹 모집" ? () => router.push("/Group") : handleBookmarkPress}
              >
                <Ionicons
                  name={post.category === "그룹 모집" ? "people-outline" : "bookmark-outline"}
                  size={16}
                  color={C.text}
                />
                <Text style={s.actionCount}>{post.category === "그룹 모집" ? "같이 공부" : "저장"}</Text>
              </TouchableOpacity>
            </View>
          </View>
          ))
        )}
      </ScrollView>

      <Modal
        visible={composeVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setComposeVisible(false)}
      >
        <KeyboardAvoidingView
          style={s.modalBackdrop}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          keyboardVerticalOffset={Platform.OS === "ios" ? insets.top : 0}
        >
          <View style={[s.sheet, { paddingBottom: insets.bottom + 24 }]}>
            <View style={s.sheetHandle} />

            <View style={s.sheetHeader}>
              <Text style={s.sheetTitle}>새 글 작성</Text>

              <TouchableOpacity onPress={() => setComposeVisible(false)}>
                <Ionicons name="close" size={22} color={C.text} />
              </TouchableOpacity>
            </View>

            <ScrollView
              horizontal
              style={s.sheetCategoryScroll}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={s.sheetCategoryRow}
            >
              {categories
                .filter((category): category is PostCategory => category !== "전체")
                .map((category) => {
                  const active = draftCategory === category;

                  return (
                    <TouchableOpacity
                      key={category}
                      style={[s.sheetCategoryChip, active && s.sheetCategoryChipActive]}
                      onPress={() => setDraftCategory(category)}
                      activeOpacity={0.8}
                    >
                      <Text style={[s.sheetCategoryText, active && s.sheetCategoryTextActive]}>
                        {categoryEmoji[category]} {category}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
            </ScrollView>

            <TextInput
              style={s.inputTitle}
              value={draftTitle}
              onChangeText={setDraftTitle}
              placeholder="제목을 입력해주세요"
              placeholderTextColor={C.subtle}
            />

            <View style={s.inputDivider} />

            <TextInput
              style={s.inputBody}
              value={draftBody}
              onChangeText={setDraftBody}
              placeholder="공부 인증, 질문, 목표를 자유롭게 남겨보세요."
              placeholderTextColor={C.subtle}
              multiline
              textAlignVertical="top"
            />

            {draftImage ? (
              <View style={s.attachmentPreview}>
                <Image source={{ uri: draftImage }} style={s.attachmentPreviewImage} />
                <TouchableOpacity style={s.attachmentRemoveButton} onPress={() => setDraftImage(null)}>
                  <Ionicons name="close" size={16} color={C.bg} />
                </TouchableOpacity>
              </View>
            ) : null}

            <TouchableOpacity style={s.attachButton} onPress={pickPostImage} activeOpacity={0.85}>
              <Ionicons name="image-outline" size={17} color={C.text} />
              <Text style={s.attachButtonText}>{draftImage ? "사진 변경" : "사진 첨부"}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[s.submitBtn, (!draftTitle.trim() || !draftBody.trim()) && s.submitBtnDisabled]}
              onPress={submitPost}
              activeOpacity={0.85}
            >
              <Text style={s.submitBtnText}>게시하기</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <Modal
        visible={!!selectedPost}
        transparent
        animationType="slide"
        onRequestClose={closeComments}
      >
        <KeyboardAvoidingView
          style={s.modalBackdrop}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          keyboardVerticalOffset={Platform.OS === "ios" ? insets.top : 0}
        >
          <View style={[s.commentSheet, { paddingBottom: insets.bottom + 18 }]}>
            <View style={s.sheetHandle} />

            <View style={s.sheetHeader}>
              <View>
                <Text style={s.sheetTitle}>댓글</Text>
                <Text style={s.commentSheetMeta}>
                  {selectedPost ? `${selectedPostComments.length}개의 댓글` : ""}
                </Text>
              </View>

              <TouchableOpacity onPress={closeComments}>
                <Ionicons name="close" size={22} color={C.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={s.commentList} contentContainerStyle={s.commentListContent}>
              {selectedPostComments.length === 0 ? (
                <View style={s.commentEmpty}>
                  <Ionicons name="chatbubble-ellipses-outline" size={22} color={C.text} />
                  <Text style={s.commentEmptyTitle}>아직 댓글이 없어요.</Text>
                  <Text style={s.commentEmptyText}>첫 댓글로 이야기를 시작해보세요.</Text>
                </View>
              ) : (
                selectedPostComments.map((comment) => (
                  <View key={comment.id} style={s.commentItem}>
                    <TouchableOpacity
                      style={s.commentAvatar}
                      activeOpacity={0.8}
                    >
                      {comment.authorImage ? (
                        <Image source={{ uri: comment.authorImage }} style={s.commentAvatarImage} />
                      ) : (
                        <Text style={s.commentAvatarText}>{getInitial(comment.author)}</Text>
                      )}
                    </TouchableOpacity>

                    <View style={s.commentBubble}>
                      <View style={s.commentHeader}>
                        <Text style={s.commentAuthor}>{comment.author}</Text>
                        <Text style={s.commentTime}>{formatRelativeTime(comment.createdAt)}</Text>
                        {comment.authorId === uid ? (
                          <TouchableOpacity onPress={() => deleteComment(comment)} style={s.commentDeleteButton}>
                            <Ionicons name="trash-outline" size={14} color={C.text} />
                          </TouchableOpacity>
                        ) : null}
                      </View>
                      <Text style={s.commentBody}>{comment.body}</Text>
                    </View>
                  </View>
                ))
              )}
            </ScrollView>

            <View style={s.commentComposer}>
              <TextInput
                style={s.commentInput}
                value={draftComment}
                onChangeText={setDraftComment}
                placeholder="댓글을 입력하세요"
                placeholderTextColor={C.subtle}
                multiline
              />
              <TouchableOpacity
                style={[s.commentSubmitButton, !draftComment.trim() && s.commentSubmitButtonDisabled]}
                onPress={submitComment}
                activeOpacity={0.85}
              >
                <Ionicons name="send" size={17} color={C.bg} />
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <Modal
        visible={!!selectedProfile}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedProfile(null)}
      >
        <View style={s.profileModalBackdrop}>
          <View style={s.profileModalCard}>
            <View style={s.profileModalHeader}>
              <Text style={s.profileModalTitle}>프로필</Text>
              <TouchableOpacity style={s.profileModalClose} onPress={() => setSelectedProfile(null)}>
                <Ionicons name="close" size={16} color={C.text} />
              </TouchableOpacity>
            </View>

            {selectedProfile ? (
              <>
                <View style={s.profileModalAvatar}>
                  {selectedProfile.image ? (
                    <Image source={{ uri: selectedProfile.image }} style={s.profileModalAvatarImage} />
                  ) : (
                    <Text style={s.profileModalAvatarText}>{getInitial(selectedProfile.name)}</Text>
                  )}
                </View>
                <Text style={s.profileModalName}>{selectedProfile.name}</Text>
                {selectedProfile.userType ? (
                  <View style={s.profileModalBadge}>
                    <Text style={s.profileModalBadgeText}>{selectedProfile.userType}</Text>
                  </View>
                ) : null}
                <Text style={s.profileModalBio}>
                  {selectedProfile.bio?.trim() || "아직 한줄 소개가 없어요."}
                </Text>
                <View style={s.profileModalStatsGrid}>
                  <View style={s.profileModalStatBox}>
                    <Text style={s.profileModalStatValue}>{selectedProfile.postCount}</Text>
                    <Text style={s.profileModalStatLabel}>작성한 글</Text>
                  </View>
                  <View style={s.profileModalStatBox}>
                    <Text style={s.profileModalStatValue}>{selectedProfile.cheerCount}</Text>
                    <Text style={s.profileModalStatLabel}>받은 응원</Text>
                  </View>
                </View>
              </>
            ) : null}
          </View>
        </View>
      </Modal>

      <BottomNav />
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
      paddingHorizontal: 16,
      paddingBottom: 12,
    },
    backButton: {
      width: 36,
      height: 36,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: 10,
      backgroundColor: C.surfaceAlt,
    },
    headerTitleWrap: {
      flex: 1,
      alignItems: "center",
    },
    headerTitle: {
      color: C.text,
      fontSize: 18,
      fontWeight: "900",
      letterSpacing: -0.3,
    },
    headerSub: {
      color: C.muted,
      fontSize: 10,
      fontWeight: "700",
      marginTop: 2,
    },
    composeButton: {
      flexDirection: "row",
      alignItems: "center",
      gap: 5,
      paddingHorizontal: 12,
      height: 36,
      borderRadius: 10,
      backgroundColor: C.primary,
    },
    composeButtonText: {
      color: C.inverse,
      fontSize: 12,
      fontWeight: "900",
    },

    tabScroll: {
      flexGrow: 0,
      height: 58,
      maxHeight: 58,
    },
    tabBar: {
      paddingHorizontal: 16,
      gap: 4,
      height: 58,
      alignItems: "center",
    },
    tab: {
      height: 46,
      paddingHorizontal: 14,
      justifyContent: "center",
      position: "relative",
      alignItems: "center",
    },
    tabActive: {
      backgroundColor: C.primarySoft,
      borderRadius: 999,
    },
    tabText: {
      color: C.muted,
      fontSize: 13,
      fontWeight: "700",
    },
    tabTextActive: {
      color: C.primary,
      fontWeight: "900",
    },
    tabUnderline: {
      position: "absolute",
      bottom: 0,
      left: 10,
      right: 10,
      height: 2.5,
      borderRadius: 99,
      backgroundColor: C.primary,
    },

    divider: {
      height: 1,
      backgroundColor: C.border,
      marginBottom: 8,
    },

    feed: {
      paddingHorizontal: 16,
      paddingTop: 4,
    },
    livePanel: {
      backgroundColor: C.surface,
      borderRadius: 18,
      paddingVertical: 15,
      marginBottom: 16,
      shadowColor: C.shadow,
      shadowOpacity: 0.05,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 5 },
      elevation: 2,
    },
    livePanelHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 15,
      marginBottom: 12,
    },
    liveEyebrow: {
      color: C.live,
      fontSize: 10,
      fontWeight: "900",
      letterSpacing: 1.4,
    },
    liveTitle: {
      color: C.text,
      fontSize: 18,
      fontWeight: "900",
      marginTop: 3,
      letterSpacing: -0.2,
    },
    liveHeaderButton: {
      height: 34,
      flexDirection: "row",
      alignItems: "center",
      gap: 3,
      paddingHorizontal: 10,
      borderRadius: 10,
      backgroundColor: C.primarySoft,
    },
    liveHeaderButtonText: {
      color: C.primary,
      fontSize: 11,
      fontWeight: "900",
    },
    liveEmptyBox: {
      marginHorizontal: 15,
      borderWidth: 1,
      borderColor: C.border,
      borderRadius: 14,
      backgroundColor: C.surfaceAlt,
      padding: 16,
      alignItems: "center",
    },
    liveEmptyTitle: {
      color: C.text,
      fontSize: 13,
      fontWeight: "900",
      marginTop: 8,
    },
    liveEmptyText: {
      color: C.muted,
      fontSize: 11,
      lineHeight: 16,
      marginTop: 5,
      textAlign: "center",
    },
    liveRoomRow: {
      gap: 10,
      paddingHorizontal: 15,
    },
    liveRoomCard: {
      width: 178,
      minHeight: 128,
      borderRadius: 14,
      backgroundColor: C.surfaceAlt,
      padding: 12,
      shadowColor: C.shadow,
      shadowOpacity: 0.04,
      shadowRadius: 10,
      shadowOffset: { width: 0, height: 4 },
      elevation: 1,
    },
    liveRoomTop: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      marginBottom: 8,
    },
    liveDot: {
      width: 7,
      height: 7,
      borderRadius: 4,
      backgroundColor: C.primary,
    },
    liveRoomSubject: {
      color: C.success,
      fontSize: 11,
      fontWeight: "900",
    },
    liveRoomName: {
      color: C.text,
      fontSize: 14,
      fontWeight: "900",
      lineHeight: 19,
      marginBottom: 10,
    },
    liveRoomMeta: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      gap: 8,
      marginBottom: 12,
    },
    liveRoomMetaText: {
      color: C.muted,
      fontSize: 11,
      fontWeight: "700",
    },
    liveRoomCode: {
      color: C.text,
      fontSize: 11,
      fontWeight: "900",
    },
    joinRoomButton: {
      height: 30,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 5,
      borderRadius: 9,
      backgroundColor: C.primarySoft,
    },
    joinRoomButtonText: {
      color: C.primary,
      fontSize: 11,
      fontWeight: "900",
    },
    feedHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 12,
    },
    feedTitle: {
      color: C.text,
      fontSize: 15,
      fontWeight: "900",
      marginBottom: 2,
    },
    feedMeta: {
      color: C.subtle,
      fontSize: 11,
      fontWeight: "700",
    },
    feedSortButton: {
      minHeight: 32,
      flexDirection: "row",
      alignItems: "center",
      gap: 5,
      borderRadius: 10,
      paddingHorizontal: 10,
      backgroundColor: C.surface,
    },
    feedSortText: {
      color: C.text,
      fontSize: 11,
      fontWeight: "900",
    },
    emptyFeedCard: {
      borderRadius: 18,
      backgroundColor: C.surface,
      padding: 22,
      alignItems: "center",
      shadowColor: C.shadow,
      shadowOpacity: 0.05,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 5 },
      elevation: 2,
    },
    emptyFeedTitle: {
      color: C.text,
      fontSize: 15,
      fontWeight: "900",
      marginTop: 10,
    },
    emptyFeedText: {
      color: C.muted,
      fontSize: 12,
      lineHeight: 18,
      textAlign: "center",
      marginTop: 6,
    },
    emptyFeedButton: {
      minHeight: 38,
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      borderRadius: 10,
      paddingHorizontal: 13,
      marginTop: 14,
      backgroundColor: C.primary,
    },
    emptyFeedButtonText: {
      color: C.inverse,
      fontSize: 12,
      fontWeight: "900",
    },

    card: {
      backgroundColor: C.surface,
      borderRadius: 18,
      padding: 16,
      marginBottom: 10,
      shadowColor: C.shadow,
      shadowOpacity: 0.05,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 5 },
      elevation: 2,
    },
    cardTop: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      marginBottom: 12,
    },
    avatar: {
      width: 40,
      height: 40,
      borderRadius: 20,
      borderWidth: 1.5,
      borderColor: C.borderSoft,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: C.surfaceAlt,
      overflow: "hidden",
    },
    avatarImage: {
      width: "100%",
      height: "100%",
    },
    avatarText: {
      color: C.text,
      fontSize: 15,
      fontWeight: "900",
    },
    cardTopMeta: {
      flex: 1,
      minWidth: 0,
    },
    authorName: {
      color: C.text,
      fontSize: 13,
      fontWeight: "900",
      marginBottom: 3,
    },
    cardIconButton: {
      width: 32,
      height: 32,
      borderRadius: 9,
      backgroundColor: C.surfaceAlt,
      alignItems: "center",
      justifyContent: "center",
    },
    metaRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 5,
    },
    categoryTag: {
      backgroundColor: C.primarySoft,
      borderRadius: 999,
      paddingHorizontal: 8,
      paddingVertical: 2,
    },
    categoryTagText: {
      color: C.primary,
      fontSize: 10,
      fontWeight: "800",
    },
    dot: {
      color: C.subtle,
      fontSize: 11,
    },
    timeText: {
      color: C.subtle,
      fontSize: 11,
      fontWeight: "600",
    },

    cardTitle: {
      color: C.text,
      fontSize: 15,
      fontWeight: "900",
      lineHeight: 22,
      marginBottom: 6,
      letterSpacing: -0.2,
    },
    cardBody: {
      color: C.muted,
      fontSize: 13,
      lineHeight: 20,
      marginBottom: 14,
    },
    postImage: {
      width: "100%",
      aspectRatio: 4 / 3,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: C.borderSoft,
      marginBottom: 14,
      backgroundColor: C.surfaceAlt,
    },

    cardActions: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      paddingTop: 10,
      borderTopWidth: 1,
      borderTopColor: C.border,
    },
    actionBtn: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 8,
      backgroundColor: C.surfaceAlt,
    },
    actionBtnRight: {
      marginLeft: "auto",
    },
    joinStudyAction: {
      backgroundColor: C.surfaceAlt,
    },
    actionCount: {
      color: C.text,
      fontSize: 12,
      fontWeight: "800",
    },
    actionCountLiked: {
      color: C.danger,
    },

    modalBackdrop: {
      flex: 1,
      backgroundColor: "#00000055",
      justifyContent: "flex-end",
    },
    sheet: {
      backgroundColor: C.surfaceAlt,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      borderWidth: 1,
      borderColor: C.border,
      padding: 20,
    },
    sheetHandle: {
      width: 40,
      height: 4,
      borderRadius: 2,
      backgroundColor: C.border,
      alignSelf: "center",
      marginBottom: 16,
    },
    sheetHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 16,
    },
    sheetTitle: {
      color: C.text,
      fontSize: 17,
      fontWeight: "900",
    },
    sheetCategoryScroll: {
      flexGrow: 0,
      maxHeight: 48,
      marginBottom: 16,
    },
    sheetCategoryRow: {
      gap: 8,
      alignItems: "center",
    },
    sheetCategoryChip: {
      paddingHorizontal: 13,
      paddingVertical: 8,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: C.border,
      backgroundColor: C.surface,
    },
    sheetCategoryChipActive: {
      backgroundColor: C.primary,
    },
    sheetCategoryText: {
      color: C.text,
      fontSize: 12,
      fontWeight: "800",
    },
    sheetCategoryTextActive: {
      color: C.bg,
    },
    inputTitle: {
      color: C.text,
      fontSize: 16,
      fontWeight: "900",
      paddingVertical: 10,
      letterSpacing: -0.2,
    },
    inputDivider: {
      height: 1,
      backgroundColor: C.border,
      marginBottom: 10,
    },
    inputBody: {
      color: C.text,
      fontSize: 14,
      lineHeight: 22,
      minHeight: 120,
      marginBottom: 20,
    },
    attachmentPreview: {
      width: "100%",
      aspectRatio: 4 / 3,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: C.border,
      overflow: "hidden",
      marginBottom: 12,
      backgroundColor: C.surface,
    },
    attachmentPreviewImage: {
      width: "100%",
      height: "100%",
    },
    attachmentRemoveButton: {
      position: "absolute",
      top: 10,
      right: 10,
      width: 30,
      height: 30,
      borderRadius: 15,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: C.muted,
    },
    attachButton: {
      minHeight: 44,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 7,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: C.border,
      backgroundColor: C.surface,
      marginBottom: 12,
    },
    attachButtonText: {
      color: C.text,
      fontSize: 13,
      fontWeight: "900",
    },
    submitBtn: {
      backgroundColor: C.primary,
      borderRadius: 14,
      height: 52,
      alignItems: "center",
      justifyContent: "center",
    },
    submitBtnDisabled: {
      opacity: 0.35,
    },
    submitBtnText: {
      color: C.bg,
      fontSize: 15,
      fontWeight: "900",
    },
    commentSheet: {
      backgroundColor: C.surfaceAlt,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      borderWidth: 1,
      borderColor: C.border,
      paddingHorizontal: 18,
      paddingTop: 18,
      maxHeight: "82%",
    },
    commentSheetMeta: {
      color: C.subtle,
      fontSize: 11,
      fontWeight: "700",
      marginTop: 3,
    },
    commentList: {
      maxHeight: 420,
    },
    commentListContent: {
      paddingBottom: 14,
      gap: 12,
    },
    commentEmpty: {
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: 36,
      borderWidth: 1,
      borderColor: C.border,
      borderRadius: 14,
      backgroundColor: C.surface,
    },
    commentEmptyTitle: {
      color: C.text,
      fontSize: 14,
      fontWeight: "900",
      marginTop: 10,
    },
    commentEmptyText: {
      color: C.muted,
      fontSize: 12,
      fontWeight: "700",
      marginTop: 4,
    },
    commentItem: {
      flexDirection: "row",
      gap: 10,
      alignItems: "flex-start",
    },
    commentAvatar: {
      width: 34,
      height: 34,
      borderRadius: 17,
      borderWidth: 1,
      borderColor: C.border,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: C.surface,
      overflow: "hidden",
    },
    commentAvatarImage: {
      width: "100%",
      height: "100%",
    },
    commentAvatarText: {
      color: C.text,
      fontSize: 12,
      fontWeight: "900",
    },
    commentBubble: {
      flex: 1,
      borderWidth: 1,
      borderColor: C.border,
      borderRadius: 12,
      padding: 10,
      backgroundColor: C.surface,
    },
    commentHeader: {
      flexDirection: "row",
      alignItems: "center",
      gap: 7,
      marginBottom: 5,
    },
    commentAuthor: {
      color: C.text,
      fontSize: 12,
      fontWeight: "900",
      flexShrink: 1,
    },
    commentTime: {
      color: C.subtle,
      fontSize: 10,
      fontWeight: "700",
    },
    commentDeleteButton: {
      marginLeft: "auto",
      width: 24,
      height: 24,
      alignItems: "center",
      justifyContent: "center",
    },
    commentBody: {
      color: C.muted,
      fontSize: 13,
      lineHeight: 19,
    },
    commentComposer: {
      flexDirection: "row",
      alignItems: "flex-end",
      gap: 8,
      paddingTop: 12,
      borderTopWidth: 1,
      borderTopColor: C.border,
    },
    commentInput: {
      flex: 1,
      minHeight: 44,
      maxHeight: 92,
      borderWidth: 1,
      borderColor: C.border,
      borderRadius: 12,
      paddingHorizontal: 12,
      paddingVertical: 10,
      color: C.text,
      backgroundColor: C.surface,
      fontSize: 13,
      fontWeight: "700",
    },
    commentSubmitButton: {
      width: 44,
      height: 44,
      borderRadius: 12,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: C.primary,
    },
    commentSubmitButtonDisabled: {
      opacity: 0.35,
    },
    profileModalBackdrop: {
      flex: 1,
      backgroundColor: "#00000055",
      justifyContent: "center",
      paddingHorizontal: 24,
    },
    profileModalCard: {
      backgroundColor: C.surface,
      borderWidth: 1,
      borderColor: C.border,
      borderRadius: 18,
      padding: 20,
      alignItems: "center",
    },
    profileModalHeader: {
      width: "100%",
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 14,
    },
    profileModalTitle: {
      color: C.text,
      fontSize: 16,
      fontWeight: "900",
    },
    profileModalClose: {
      width: 30,
      height: 30,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: C.border,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: C.surfaceAlt,
    },
    profileModalAvatar: {
      width: 72,
      height: 72,
      borderRadius: 36,
      borderWidth: 1,
      borderColor: C.border,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: C.surfaceAlt,
      overflow: "hidden",
      marginBottom: 12,
    },
    profileModalAvatarImage: {
      width: "100%",
      height: "100%",
    },
    profileModalAvatarText: {
      color: C.text,
      fontSize: 24,
      fontWeight: "900",
    },
    profileModalName: {
      color: C.text,
      fontSize: 18,
      fontWeight: "900",
    },
    profileModalBadge: {
      borderWidth: 1,
      borderColor: C.border,
      borderRadius: 999,
      paddingHorizontal: 10,
      paddingVertical: 4,
      marginTop: 8,
    },
    profileModalBadgeText: {
      color: C.text,
      fontSize: 11,
      fontWeight: "800",
    },
    profileModalBio: {
      color: C.text,
      fontSize: 13,
      fontWeight: "700",
      lineHeight: 19,
      textAlign: "center",
      marginTop: 12,
    },
    profileModalStatsGrid: {
      width: "100%",
      flexDirection: "row",
      gap: 10,
      marginTop: 16,
    },
    profileModalStatBox: {
      flex: 1,
      borderWidth: 1,
      borderColor: C.border,
      borderRadius: 12,
      paddingVertical: 12,
      alignItems: "center",
      backgroundColor: C.surfaceAlt,
    },
    profileModalStatValue: {
      color: C.text,
      fontSize: 18,
      fontWeight: "900",
    },
    profileModalStatLabel: {
      color: C.text,
      fontSize: 11,
      fontWeight: "700",
      marginTop: 3,
    },
  });
