import { Stack } from "expo-router";
import { MonoThemeProvider, useMonoTheme } from "../constants/mono";

function RootStack() {
  const { theme } = useMonoTheme();

  return (
    <Stack
      screenOptions={{
        headerShown: false,

        // ✅ 기본 전환 애니메이션
        animation: "slide_from_right",
        animationDuration: 220,
        gestureEnabled: true,

        // ✅ 화면 전환 중 배경 플래시 방지
        contentStyle: { backgroundColor: theme.bg },
      }}
    >
      {/* 로그인 — 로그아웃 시 자연스럽게 “뒤로 복귀” 느낌 */}
      <Stack.Screen
        name="login"
        options={{
          animation: "slide_from_left",
          contentStyle: { backgroundColor: theme.bg },
        }}
      />

      {/* 메인 탭 */}
      {/* 모달 */}
      <Stack.Screen
        name="modal"
        options={{
          presentation: "modal",
          animation: "slide_from_bottom",
          contentStyle: { backgroundColor: theme.bg },
        }}
      />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <MonoThemeProvider>
      <RootStack />
    </MonoThemeProvider>
  );
}
