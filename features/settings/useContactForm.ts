import * as Linking from "expo-linking";
import { useState } from "react";
import { Alert } from "react-native";

import { auth } from "../../utils/firebaseConfig";

const SUPPORT_EMAIL = "support@studynet.app";
const APP_VERSION = "1.0.0";

export const CONTACT_CATEGORIES = [
  "오류 신고",
  "기능 제안",
  "계정 문의",
  "기타",
] as const;

export function useContactForm() {
  const [category, setCategory] =
    useState<(typeof CONTACT_CATEGORIES)[number]>("오류 신고");
  const [message, setMessage] = useState("");
  const [replyEmail, setReplyEmail] = useState(auth.currentUser?.email ?? "");

  const sendMail = async () => {
    const body = message.trim();
    if (body.length < 5) {
      Alert.alert("내용 확인", "문의 내용을 조금 더 자세히 적어주세요.");
      return;
    }

    const subject = `[StudyNet] ${category}`;
    const mailBody = [
      body,
      "",
      "---",
      `회신 이메일: ${replyEmail.trim() || "미입력"}`,
      `사용자 ID: ${auth.currentUser?.uid ?? "로그인 정보 없음"}`,
      `앱 버전: ${APP_VERSION}`,
    ].join("\n");
    const url = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(mailBody)}`;

    try {
      const supported = await Linking.canOpenURL(url);
      if (!supported) {
        Alert.alert(
          "메일 앱 없음",
          "기기에 연결된 메일 앱이 없어요. 문의 내용을 복사해 메일로 보내주세요.",
        );
        return;
      }

      await Linking.openURL(url);
    } catch {
      Alert.alert("실행 실패", "메일 앱을 열지 못했어요.");
    }
  };

  return {
    category,
    setCategory,
    message,
    setMessage,
    replyEmail,
    setReplyEmail,
    sendMail,
  };
}
