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
import {
  categories,
  categoryEmoji,
  type PostCategory,
} from "../communityConstants";
import type { CommunityStyles } from "../communityStyles";

export function ComposeSheet({
  visible,
  bottomInset,
  topInset,
  draftCategory,
  draftTitle,
  draftBody,
  draftImage,
  s,
  C,
  onClose,
  onChangeCategory,
  onChangeTitle,
  onChangeBody,
  onRemoveImage,
  onPickImage,
  onSubmit,
}: {
  visible: boolean;
  bottomInset: number;
  topInset: number;
  draftCategory: PostCategory;
  draftTitle: string;
  draftBody: string;
  draftImage: string | null;
  s: CommunityStyles;
  C: MonoTheme;
  onClose: () => void;
  onChangeCategory: (category: PostCategory) => void;
  onChangeTitle: (value: string) => void;
  onChangeBody: (value: string) => void;
  onRemoveImage: () => void;
  onPickImage: () => void;
  onSubmit: () => void;
}) {
  const disabled = !draftTitle.trim() || !draftBody.trim();

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={s.modalBackdrop}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? topInset : 0}
      >
        <View style={[s.sheet, { paddingBottom: bottomInset + 24 }]}>
          <View style={s.sheetHandle} />

          <View style={s.sheetHeader}>
            <Text style={s.sheetTitle}>새 글 작성</Text>

            <TouchableOpacity onPress={onClose}>
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
                    onPress={() => onChangeCategory(category)}
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
            onChangeText={onChangeTitle}
            placeholder="제목을 입력해주세요"
            placeholderTextColor={C.subtle}
          />

          <View style={s.inputDivider} />

          <TextInput
            style={s.inputBody}
            value={draftBody}
            onChangeText={onChangeBody}
            placeholder="공부 인증, 질문, 목표를 자유롭게 남겨보세요."
            placeholderTextColor={C.subtle}
            multiline
            textAlignVertical="top"
          />

          {draftImage ? (
            <View style={s.attachmentPreview}>
              <Image source={{ uri: draftImage }} style={s.attachmentPreviewImage} />
              <TouchableOpacity style={s.attachmentRemoveButton} onPress={onRemoveImage}>
                <Ionicons name="close" size={16} color={C.bg} />
              </TouchableOpacity>
            </View>
          ) : null}

          <TouchableOpacity style={s.attachButton} onPress={onPickImage} activeOpacity={0.85}>
            <Ionicons name="image-outline" size={17} color={C.text} />
            <Text style={s.attachButtonText}>{draftImage ? "사진 변경" : "사진 첨부"}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[s.submitBtn, disabled && s.submitBtnDisabled]}
            onPress={onSubmit}
            activeOpacity={0.85}
          >
            <Text style={s.submitBtnText}>게시하기</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
