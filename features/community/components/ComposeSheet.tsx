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
  draftGroupCode,
  draftTitle,
  draftBody,
  draftImage,
  s,
  C,
  onClose,
  onChangeCategory,
  onChangeGroupCode,
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
  draftGroupCode: string;
  draftTitle: string;
  draftBody: string;
  draftImage: string | null;
  s: CommunityStyles;
  C: MonoTheme;
  onClose: () => void;
  onChangeCategory: (category: PostCategory) => void;
  onChangeGroupCode: (value: string) => void;
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

            <TouchableOpacity style={s.sheetCloseButton} onPress={onClose} accessibilityRole="button" accessibilityLabel="글쓰기 닫기" activeOpacity={0.75}>
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
              .filter(
                (category): category is PostCategory =>
                  category !== "전체" && category !== "저장됨",
              )
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
            returnKeyType="next"
            maxLength={80}
          />

          <View style={s.inputDivider} />

          {draftCategory === "그룹 모집" ? (
            <View style={s.groupCodeBox}>
              <View style={s.groupCodeLabelRow}>
                <Ionicons name="keypad-outline" size={15} color={C.text} />
                <Text style={s.groupCodeLabel}>초대 코드</Text>
                <Text style={s.groupCodeOptional}>선택</Text>
              </View>
              <TextInput
                style={s.groupCodeInput}
                value={draftGroupCode}
                onChangeText={onChangeGroupCode}
                placeholder="A7K2Q9"
                placeholderTextColor={C.subtle}
                autoCapitalize="characters"
                autoCorrect={false}
                maxLength={6}
                returnKeyType="next"
              />
            </View>
          ) : null}

          <TextInput
            style={s.inputBody}
            value={draftBody}
            onChangeText={onChangeBody}
            placeholder="공부 인증, 질문, 목표를 자유롭게 남겨보세요."
            placeholderTextColor={C.subtle}
            multiline
            textAlignVertical="top"
            maxLength={1000}
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
            disabled={disabled}
            accessibilityRole="button"
            accessibilityLabel="게시글 등록"
          >
            <Text style={s.submitBtnText}>게시하기</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
