import { RADIUS, SPACE, TYPE_SIZE, TYPE_WEIGHT } from "../../constants/designTokens";
import { Ionicons } from "@expo/vector-icons";
import { useMemo } from "react";
import {
  Image,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import {
  getScreenBottomPadding,
  getScreenTopPadding,
  RESPONSIVE_CONTENT_STYLE,
} from "../../constants/layout";
import { useMonoTheme, type MonoTheme } from "../../constants/mono";
import { SettingsHeader } from "../../features/settings/SettingsHeader";
import { SettingsSection } from "../../features/settings/SettingsSection";
import {
  CONTACT_CATEGORIES,
  useContactForm,
} from "../../features/settings/useContactForm";

export default function ContactScreen() {
  const insets = useSafeAreaInsets();
  const { theme: C } = useMonoTheme();
  const s = useMemo(() => createStyles(C), [C]);
  const topPadding = getScreenTopPadding(insets.top);
  const bottomPadding = getScreenBottomPadding(insets.bottom, 40);
  const {
    category,
    setCategory,
    message,
    setMessage,
    replyEmail,
    setReplyEmail,
    photoUri,
    pickPhoto,
    removePhoto,
    sendMail,
  } = useContactForm();

  return (
    <View style={[s.container, { paddingTop: topPadding }]}>
      <StatusBar barStyle={C.statusBar} backgroundColor={C.bg} />
      <SettingsHeader title="문의하기" />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[s.content, { paddingBottom: bottomPadding }]}
      >
        <SettingsSection title="문의 유형">
          <View style={s.categoryGrid}>
            {CONTACT_CATEGORIES.map((item, index) => {
              const active = item === category;
              return (
                <TouchableOpacity
                  key={item}
                  testID={`contact-category-${index}`}
                  style={[s.categoryButton, active && s.categoryButtonActive]}
                  onPress={() => setCategory(item)}
                  activeOpacity={0.82}
                >
                  <Text style={[s.categoryText, active && s.categoryTextActive]}>
                    {item}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </SettingsSection>

        <SettingsSection>
          <Text style={s.inputLabel}>회신 이메일</Text>
          <TextInput
            testID="contact-reply-email-input"
            value={replyEmail}
            onChangeText={setReplyEmail}
            placeholder="name@example.com"
            placeholderTextColor={C.subtle}
            keyboardType="email-address"
            autoCapitalize="none"
            style={s.input}
          />

          <Text style={s.inputLabel}>내용</Text>
          <TextInput
            testID="contact-message-input"
            value={message}
            onChangeText={setMessage}
            placeholder="문제 상황이나 원하는 기능을 적어주세요."
            placeholderTextColor={C.subtle}
            multiline
            textAlignVertical="top"
            style={s.textarea}
          />
        </SettingsSection>

        <View style={s.attachmentSection}>
          <Text style={s.inputLabel}>오류 화면 사진 (선택)</Text>
          {photoUri ? (
            <View style={s.photoRow}>
              <Image source={{ uri: photoUri }} style={s.photoPreview} />
              <Text style={s.photoStatus}>사진 1장이 메일에 첨부돼요.</Text>
              <TouchableOpacity
                testID="contact-remove-photo-button"
                accessibilityRole="button"
                accessibilityLabel="첨부 사진 삭제"
                onPress={removePhoto}
                style={s.removePhotoButton}
              >
                <Ionicons name="close-circle" size={24} color={C.muted} />
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              testID="contact-add-photo-button"
              accessibilityRole="button"
              onPress={pickPhoto}
              style={s.attachButton}
              activeOpacity={0.82}
            >
              <Ionicons name="image-outline" size={20} color={C.primary} />
              <Text style={s.attachButtonText}>사진 선택</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={s.infoBox}>
          <Ionicons name="information-circle-outline" size={18} color={C.primary} />
          <Text style={s.infoText}>
            보내기 버튼을 누르면 기기의 메일 앱이 열립니다.
          </Text>
        </View>

        <TouchableOpacity
          testID="contact-send-button"
          style={s.saveButton}
          onPress={sendMail}
          activeOpacity={0.84}
        >
          <Ionicons name="mail-outline" size={18} color={C.inverse} />
          <Text style={s.saveButtonText}>메일로 보내기</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const createStyles = (C: MonoTheme) =>
  StyleSheet.create({
    container: {
      ...RESPONSIVE_CONTENT_STYLE,
      flex: 1,
      backgroundColor: C.bg,
      paddingHorizontal: 20,
    },
    content: {
      gap: 14,
    },
    categoryGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 9,
    },
    categoryButton: {
      minWidth: "47%",
      flex: 1,
      minHeight: 44,
      borderWidth: 1,
      borderColor: C.border,
      borderRadius: RADIUS.chip,
      backgroundColor: C.surfaceAlt,
      alignItems: "center",
      justifyContent: "center",
    },
    categoryButtonActive: {
      borderColor: C.primary,
      backgroundColor: C.primary,
    },
    categoryText: {
      color: C.text,
      fontSize: TYPE_SIZE.bodySmall,
      fontWeight: TYPE_WEIGHT.heavy,
    },
    categoryTextActive: {
      color: C.inverse,
    },
    inputLabel: {
      color: C.muted,
      fontSize: TYPE_SIZE.label,
      fontWeight: TYPE_WEIGHT.heavy,
      marginBottom: SPACE.sm,
    },
    input: {
      minHeight: 50,
      borderWidth: 1,
      borderColor: C.border,
      borderRadius: RADIUS.chip,
      backgroundColor: C.surfaceAlt,
      color: C.text,
      fontSize: TYPE_SIZE.body,
      fontWeight: TYPE_WEIGHT.bold,
      paddingHorizontal: 13,
      marginBottom: 14,
    },
    textarea: {
      minHeight: 150,
      borderWidth: 1,
      borderColor: C.border,
      borderRadius: RADIUS.chip,
      backgroundColor: C.surfaceAlt,
      color: C.text,
      fontSize: TYPE_SIZE.body,
      lineHeight: 20,
      fontWeight: TYPE_WEIGHT.bold,
      padding: 13,
    },
    attachmentSection: {
      gap: 2,
    },
    attachButton: {
      minHeight: 52,
      borderWidth: 1,
      borderColor: C.border,
      borderStyle: "dashed",
      borderRadius: RADIUS.chip,
      backgroundColor: C.surface,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: SPACE.sm,
    },
    attachButtonText: {
      color: C.primary,
      fontSize: TYPE_SIZE.bodySmall,
      fontWeight: TYPE_WEIGHT.heavy,
    },
    photoRow: {
      minHeight: 72,
      borderWidth: 1,
      borderColor: C.border,
      borderRadius: RADIUS.chip,
      backgroundColor: C.surface,
      flexDirection: "row",
      alignItems: "center",
      gap: SPACE.md,
      padding: SPACE.sm,
    },
    photoPreview: {
      width: 54,
      height: 54,
      borderRadius: RADIUS.sm,
      backgroundColor: C.surfaceAlt,
    },
    photoStatus: {
      flex: 1,
      color: C.text,
      fontSize: TYPE_SIZE.bodySmall,
      fontWeight: TYPE_WEIGHT.strong,
    },
    removePhotoButton: {
      padding: SPACE.xs,
    },
    infoBox: {
      flexDirection: "row",
      alignItems: "center",
      gap: 9,
      borderRadius: RADIUS.badge,
      backgroundColor: C.primarySoft,
      padding: 13,
    },
    infoText: {
      flex: 1,
      color: C.text,
      fontSize: TYPE_SIZE.label,
      fontWeight: TYPE_WEIGHT.strong,
      lineHeight: 18,
    },
    saveButton: {
      minHeight: 54,
      borderRadius: RADIUS.badge,
      backgroundColor: C.primary,
      alignItems: "center",
      justifyContent: "center",
      flexDirection: "row",
      gap: SPACE.sm,
    },
    saveButtonText: {
      color: C.inverse,
      fontSize: TYPE_SIZE.bodyStrong,
      fontWeight: TYPE_WEIGHT.heavy,
    },
  });
