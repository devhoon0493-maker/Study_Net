import { Ionicons } from "@expo/vector-icons";
import type { Href } from "expo-router";

export type SettingIcon = keyof typeof Ionicons.glyphMap;

export type SettingsLinkItem = {
  icon: SettingIcon;
  label: string;
  description: string;
  route: Href;
};

export type SettingsLinkGroup = {
  title: string;
  icon: SettingIcon;
  items: SettingsLinkItem[];
};

export const SETTINGS_LINK_GROUPS: SettingsLinkGroup[] = [
  {
    title: "계정",
    icon: "person-circle-outline",
    items: [
      {
        icon: "person-outline",
        label: "프로필 관리",
        description: "이름, 이메일, 사용자 유형",
        route: "/setting/profile",
      },
      {
        icon: "id-card-outline",
        label: "공개 프로필",
        description: "다른 사용자에게 보이는 정보",
        route: "/setting/public-profile",
      },
      {
        icon: "lock-closed-outline",
        label: "비밀번호 변경",
        description: "로그인 보안 설정",
        route: "/setting/password",
      },
    ],
  },
  {
    title: "학습",
    icon: "book-outline",
    items: [
      {
        icon: "flag-outline",
        label: "학습 목표",
        description: "일간 목표, 주간 목표, D-Day",
        route: "/setting/goals",
      },
      {
        icon: "cloud-done-outline",
        label: "저장 상태",
        description: "기기와 Firebase 저장 확인",
        route: "/setting/storage",
      },
    ],
  },
  {
    title: "지원 및 정보",
    icon: "help-circle-outline",
    items: [
      {
        icon: "mail-outline",
        label: "문의하기",
        description: "오류 신고와 기능 제안",
        route: "/setting/contact",
      },
      {
        icon: "document-text-outline",
        label: "개인정보 처리방침",
        description: "수집 정보와 이용 목적",
        route: "/setting/privacy",
      },
    ],
  },
];

export const RESET_STUDY_LINK: SettingsLinkItem = {
  icon: "trash-outline",
  label: "학습 데이터 초기화",
  description: "공부 기록, 목표, 그룹 상태 선택 삭제",
  route: "/setting/reset-study",
};
