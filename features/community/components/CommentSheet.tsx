import { Ionicons } from "@expo/vector-icons";
import {
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import type { MonoTheme } from "../../../constants/mono";
import type { CommunityStyles } from "../communityStyles";
import type { CommunityComment, CommunityPost } from "../communityTypes";
import { formatRelativeTime, getInitial } from "../communityUtils";

export function CommentSheet({
  selectedPost,
  comments,
  draftComment,
  uid,
  bottomInset,
  topInset,
  s,
  C,
  onClose,
  onChangeComment,
  onSubmit,
  onDeleteComment,
}: {
  selectedPost: CommunityPost | null;
  comments: CommunityComment[];
  draftComment: string;
  uid?: string;
  bottomInset: number;
  topInset: number;
  s: CommunityStyles;
  C: MonoTheme;
  onClose: () => void;
  onChangeComment: (value: string) => void;
  onSubmit: () => void;
  onDeleteComment: (comment: CommunityComment) => void;
}) {
  const submitDisabled = !draftComment.trim();

  return (
    <Modal
      visible={!!selectedPost}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={s.modalBackdrop}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? topInset : 0}
      >
        <View style={[s.commentSheet, { paddingBottom: bottomInset + 18 }]}>
          <View style={s.sheetHandle} />

          <View style={s.sheetHeader}>
            <View>
              <Text style={s.sheetTitle}>댓글</Text>
              <Text style={s.commentSheetMeta}>
                {selectedPost ? `${comments.length}개의 댓글` : ""}
              </Text>
            </View>

            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={22} color={C.text} />
            </TouchableOpacity>
          </View>

          <ScrollView style={s.commentList} contentContainerStyle={s.commentListContent}>
            {comments.length === 0 ? (
              <View style={s.commentEmpty}>
                <Ionicons name="chatbubble-ellipses-outline" size={22} color={C.text} />
                <Text style={s.commentEmptyTitle}>아직 댓글이 없어요.</Text>
                <Text style={s.commentEmptyText}>첫 댓글로 이야기를 시작해보세요.</Text>
              </View>
            ) : (
              comments.map((comment) => (
                <View key={comment.id} style={s.commentItem}>
                  <TouchableOpacity style={s.commentAvatar} activeOpacity={0.8}>
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
                        <TouchableOpacity
                          onPress={() => onDeleteComment(comment)}
                          style={s.commentDeleteButton}
                        >
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
              onChangeText={onChangeComment}
              placeholder="댓글을 입력하세요"
              placeholderTextColor={C.subtle}
              multiline
              maxLength={500}
            />
            <TouchableOpacity
              style={[
                s.commentSubmitButton,
                submitDisabled && s.commentSubmitButtonDisabled,
              ]}
              onPress={onSubmit}
              disabled={submitDisabled}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel="댓글 등록"
            >
              <Ionicons name="send" size={17} color={C.bg} />
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
