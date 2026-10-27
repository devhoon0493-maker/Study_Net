import { Ionicons } from "@expo/vector-icons";
import { Image, Text, TouchableOpacity, View } from "react-native";

import type { MonoTheme } from "../../../constants/mono";
import { categoryEmoji } from "../communityConstants";
import type { CommunityStyles } from "../communityStyles";
import type { CommunityPost } from "../communityTypes";
import { formatRelativeTime, getInitial } from "../communityUtils";

export function PostCard({
  post,
  uid,
  s,
  C,
  onOpenProfile,
  onDelete,
  onToggleLike,
  onOpenComments,
  onBookmark,
  onOpenGroup,
  onMore,
}: {
  post: CommunityPost;
  uid?: string;
  s: CommunityStyles;
  C: MonoTheme;
  onOpenProfile: (post: CommunityPost) => void;
  onDelete: (post: CommunityPost) => void;
  onToggleLike: (postId: string) => void;
  onOpenComments: (post: CommunityPost) => void;
  onBookmark: (postId: string) => void;
  onOpenGroup: (post: CommunityPost) => void;
  onMore: (post: CommunityPost) => void;
}) {
  const isRecruiting = post.category === "그룹 모집";

  return (
    <View style={s.card}>
      <View style={s.cardTop}>
        <TouchableOpacity
          style={s.avatar}
          onPress={() => onOpenProfile(post)}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel={`${post.author} 프로필 열기`}
        >
          {post.authorImage ? (
            <Image source={{ uri: post.authorImage }} style={s.avatarImage} />
          ) : (
            <Text style={s.avatarText}>{getInitial(post.author)}</Text>
          )}
        </TouchableOpacity>

        <View style={s.cardTopMeta}>
          <TouchableOpacity
            onPress={() => onOpenProfile(post)}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel={`${post.author} 프로필 열기`}
          >
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
          <TouchableOpacity
            style={s.cardIconButton}
            onPress={() => onDelete(post)}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel="게시글 삭제"
          >
            <Ionicons name="trash-outline" size={16} color={C.text} />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={s.cardIconButton} onPress={() => onMore(post)} activeOpacity={0.8} accessibilityLabel="게시글 메뉴">
            <Ionicons name="ellipsis-horizontal" size={18} color={C.text} />
          </TouchableOpacity>
        )}
      </View>

      <Text style={s.cardTitle}>{post.title}</Text>
      <Text style={s.cardBody}>{post.body}</Text>
      {post.image ? (
        <Image source={{ uri: post.image }} style={s.postImage} />
      ) : null}

      <View style={s.cardActions}>
        <TouchableOpacity
          style={s.actionBtn}
          onPress={() => onToggleLike(post.id)}
          accessibilityRole="button"
          accessibilityLabel="게시글 응원"
        >
          <Ionicons
            name={post.liked ? "heart" : "heart-outline"}
            size={17}
            color={post.liked ? C.danger : C.muted}
          />

          <Text style={[s.actionCount, post.liked && s.actionCountLiked]}>
            응원 {post.likes}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={s.actionBtn}
          onPress={() => onOpenComments(post)}
          accessibilityRole="button"
          accessibilityLabel="댓글 열기"
        >
          <Ionicons name="chatbubble-outline" size={16} color={C.text} />
          <Text style={s.actionCount}>댓글 {post.comments}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[s.actionBtn, s.actionBtnRight, isRecruiting && s.joinStudyAction]}
          onPress={isRecruiting ? () => onOpenGroup(post) : () => onBookmark(post.id)}
          accessibilityRole="button"
          accessibilityLabel={isRecruiting ? "그룹 입장" : "게시글 저장"}
        >
          <Ionicons
            name={
              isRecruiting
                ? "people-outline"
                : post.bookmarked
                  ? "bookmark"
                  : "bookmark-outline"
            }
            size={16}
            color={C.text}
          />
          <Text style={s.actionCount}>
            {isRecruiting
              ? post.groupCode
                ? "바로 입장"
                : "같이 공부"
              : post.bookmarked
                ? "저장됨"
                : "저장"}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
