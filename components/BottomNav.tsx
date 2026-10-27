import { RADIUS, SPACE, TYPE_SIZE, TYPE_WEIGHT } from "../constants/designTokens";
import { Ionicons } from "@expo/vector-icons";
import { usePathname, useRouter } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useMonoTheme, type MonoTheme } from "../constants/mono";

export const BOTTOM_NAV_HEIGHT = 66;
export const BOTTOM_NAV_GAP = 10;

type NavKey = "record" | "group" | "home" | "community" | "setting";

const navItems: {
  key: NavKey;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  route: "/calendar" | "/Group" | "/main" | "/community" | "/setting";
}[] = [
  {
    key: "record",
    label: "기록",
    icon: "calendar-outline",
    route: "/calendar",
  },
  { key: "group", label: "그룹", icon: "people-outline", route: "/Group" },
  { key: "home", label: "홈", icon: "home-outline", route: "/main" },
  {
    key: "community",
    label: "소셜",
    icon: "chatbubbles-outline",
    route: "/community",
  },
  {
    key: "setting",
    label: "설정",
    icon: "settings-outline",
    route: "/setting",
  },
];

const getActiveKey = (pathname: string): NavKey => {
  if (pathname.includes("Group")) return "group";
  if (pathname.includes("community")) return "community";
  if (pathname.includes("setting")) return "setting";
  if (pathname.includes("calendar") || pathname.includes("statistics"))
    return "record";
  return "home";
};

export const getBottomNavSpace = (bottomInset: number) =>
  BOTTOM_NAV_HEIGHT + Math.max(bottomInset, BOTTOM_NAV_GAP) + BOTTOM_NAV_GAP;

export default function BottomNav() {
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const { theme } = useMonoTheme();
  const activeKey = getActiveKey(pathname);
  const bottom = Math.max(insets.bottom, BOTTOM_NAV_GAP);
  const s = createStyles(theme);

  return (
    <View style={[s.wrap, { bottom }]}>
      {navItems.map((item) => {
        const active = item.key === activeKey;
        const isHome = item.key === "home";

        return (
          <Pressable
            key={item.key}
            style={({ pressed }) => [
              s.item,
              isHome && s.homeItem,
              active && s.itemActive,
              pressed && s.itemPressed,
            ]}
            onPress={() => router.replace(item.route)}
          >
            <Ionicons
              name={item.icon}
              size={isHome ? 21 : 19}
              color={active ? theme.primary : theme.muted}
            />
            <Text
              style={[s.label, isHome && s.homeLabel, active && s.labelActive]}
            >
              {item.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const createStyles = (C: MonoTheme) =>
  StyleSheet.create({
    wrap: {
      position: "absolute",
      left: 14,
      right: 14,
      height: BOTTOM_NAV_HEIGHT,
      backgroundColor: C.surface,
      borderWidth: 1,
      borderColor: C.border,
      borderRadius: RADIUS.sheet,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 7,
      shadowColor: C.shadow,
      shadowOpacity: 0.1,
      shadowRadius: 14,
      shadowOffset: { width: 0, height: 6 },
      elevation: 6,
      zIndex: 50,
    },
    item: {
      flex: 1,
      height: 46,
      borderRadius: RADIUS.control,
      alignItems: "center",
      justifyContent: "center",
      gap: 2,
    },
    homeItem: {
      height: 52,
      marginHorizontal: SPACE.xs,
      transform: [{ translateY: -5 }],
    },
    itemActive: {
      backgroundColor: C.primarySoft,
    },
    itemPressed: {
      transform: [{ translateY: 1 }],
      opacity: 0.76,
    },
    label: {
      color: C.muted,
      fontSize: TYPE_SIZE.caption,
      fontWeight: TYPE_WEIGHT.strong,
    },
    labelActive: {
      color: C.primary,
    },
    homeLabel: {
      fontSize: TYPE_SIZE.captionLarge,
      fontWeight: TYPE_WEIGHT.heavy,
    },
  });
