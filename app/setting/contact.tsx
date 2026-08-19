import { Ionicons } from "@expo/vector-icons";
import { useMemo } from "react";
import {
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
      borderRadius: 13,
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
      fontSize: 13,
      fontWeight: "900",
    },
    categoryTextActive: {
      color: C.inverse,
    },
    inputLabel: {
      color: C.muted,
      fontSize: 12,
      fontWeight: "900",
      marginBottom: 8,
    },
    input: {
      minHeight: 50,
      borderWidth: 1,
      borderColor: C.border,
      borderRadius: 13,
      backgroundColor: C.surfaceAlt,
      color: C.text,
      fontSize: 14,
      fontWeight: "700",
      paddingHorizontal: 13,
      marginBottom: 14,
    },
    textarea: {
      minHeight: 150,
      borderWidth: 1,
      borderColor: C.border,
      borderRadius: 13,
      backgroundColor: C.surfaceAlt,
      color: C.text,
      fontSize: 14,
      lineHeight: 20,
      fontWeight: "700",
      padding: 13,
    },
    infoBox: {
      flexDirection: "row",
      alignItems: "center",
      gap: 9,
      borderRadius: 15,
      backgroundColor: C.primarySoft,
      padding: 13,
    },
    infoText: {
      flex: 1,
      color: C.text,
      fontSize: 12,
      fontWeight: "800",
      lineHeight: 18,
    },
    saveButton: {
      minHeight: 54,
      borderRadius: 15,
      backgroundColor: C.primary,
      alignItems: "center",
      justifyContent: "center",
      flexDirection: "row",
      gap: 8,
    },
    saveButtonText: {
      color: C.inverse,
      fontSize: 15,
      fontWeight: "900",
    },
  });
