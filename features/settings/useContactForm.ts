import * as Linking from "expo-linking";
import * as ImagePicker from "expo-image-picker";
import * as MailComposer from "expo-mail-composer";
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
  const [photoUri, setPhotoUri] = useState<string | null>(null);

  const pickPhoto = async () => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert("사진 권한 필요", "오류 화면을 첨부하려면 사진 보관함 접근을 허용해주세요.");
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.7,
      });

      if (!result.canceled) setPhotoUri(result.assets[0]?.uri ?? null);
    } catch {
      Alert.alert("사진 선택 실패", "사진을 불러오지 못했어요. 잠시 후 다시 시도해주세요.");
    }
  };

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

    if (photoUri) {
      try {
        if (!(await MailComposer.isAvailableAsync())) {
          Alert.alert(
            "메일 앱을 사용할 수 없어요",
            "사진을 첨부하려면 기기에 메일 앱을 설정한 뒤 다시 시도해주세요.",
          );
          return;
        }

        await MailComposer.composeAsync({
          recipients: [SUPPORT_EMAIL],
          subject,
          body: mailBody,
          attachments: [photoUri],
        });
      } catch {
        Alert.alert("메일 작성 실패", "사진을 첨부한 메일을 열지 못했어요. 다시 시도해주세요.");
      }
      return;
    }

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
    photoUri,
    pickPhoto,
    removePhoto: () => setPhotoUri(null),
    sendMail,
  };
}
