import { Ionicons } from "@expo/vector-icons";
import { useMemo } from "react";
import {
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
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

const sections = [
  {
    title: "수집하는 정보",
    body: "StudyNet은 회원가입과 앱 사용을 위해 이름, 이메일, 프로필 이미지, 사용자 유형, 공개 프로필 소개, 공부 기록, 목표 설정, 그룹 참여 정보, 커뮤니티 게시글과 댓글 정보를 저장할 수 있습니다.",
  },
  {
    title: "이용 목적",
    body: "수집한 정보는 로그인, 프로필 표시, 공부 기록 관리, 목표와 D-Day 표시, 그룹 스터디 상태 공유, 커뮤니티 기능 제공, 계정 보안과 서비스 품질 개선에 사용됩니다.",
  },
  {
    title: "저장 위치",
    body: "계정과 커뮤니티, 그룹 관련 정보는 Firebase에 저장됩니다. 공부 세션, 목표, 알림 설정처럼 기기 중심으로 동작하는 일부 정보는 AsyncStorage를 통해 현재 기기에 저장됩니다.",
  },
  {
    title: "공개 범위",
    body: "커뮤니티 게시글, 댓글, 공개 프로필, 그룹 내 공부 상태는 다른 로그인 사용자에게 보일 수 있습니다. 설정 화면의 공개 범위 옵션은 앱 화면 표시 정책에 반영하기 위해 사용됩니다.",
  },
  {
    title: "보관 및 삭제",
    body: "사용자는 설정에서 로컬 학습 데이터를 초기화하거나 회원 탈퇴를 요청할 수 있습니다. 회원 탈퇴 시 기본 계정 정보는 삭제되며, 커뮤니티와 그룹에 이미 남은 활동 데이터는 별도 정리 정책에 따라 처리될 수 있습니다.",
  },
  {
    title: "문의",
    body: "개인정보 관련 문의는 설정의 문의하기 화면을 통해 보낼 수 있습니다. 앱 개선 과정에서 본 처리방침은 업데이트될 수 있습니다.",
  },
];

export default function PrivacyPolicyScreen() {
  const insets = useSafeAreaInsets();
  const { theme: C } = useMonoTheme();
  const s = useMemo(() => createStyles(C), [C]);
  const topPadding = getScreenTopPadding(insets.top);
  const bottomPadding = getScreenBottomPadding(insets.bottom, 40);

  return (
    <View style={[s.container, { paddingTop: topPadding }]}>
      <StatusBar barStyle={C.statusBar} backgroundColor={C.bg} />
      <SettingsHeader title="개인정보 처리방침" compactTitle />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[s.content, { paddingBottom: bottomPadding }]}
      >
        <View style={s.notice}>
          <Ionicons name="shield-checkmark-outline" size={20} color={C.primary} />
          <View style={s.noticeTextWrap}>
            <Text style={s.noticeTitle}>StudyNet 개인정보 안내</Text>
            <Text style={s.noticeText}>시행일: 2026-07-21</Text>
          </View>
        </View>

        {sections.map((section) => (
          <SettingsSection key={section.title} title={section.title}>
            <Text style={s.sectionBody}>{section.body}</Text>
          </SettingsSection>
        ))}
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
    notice: {
      borderWidth: 1,
      borderColor: C.borderSoft,
      borderRadius: 18,
      padding: 15,
      backgroundColor: C.primarySoft,
      flexDirection: "row",
      alignItems: "center",
      gap: 11,
    },
    noticeTextWrap: {
      flex: 1,
      minWidth: 0,
    },
    noticeTitle: {
      color: C.text,
      fontSize: 15,
      fontWeight: "900",
    },
    noticeText: {
      color: C.muted,
      fontSize: 12,
      fontWeight: "800",
      marginTop: 3,
    },
    sectionBody: {
      color: C.text,
      fontSize: 13,
      fontWeight: "700",
      lineHeight: 21,
    },
  });
