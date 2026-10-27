import { RADIUS, SPACE, TYPE_SIZE, TYPE_WEIGHT } from "../../constants/designTokens";
import { StyleSheet } from "react-native";

import type { MonoTheme } from "../../constants/mono";

export const createSettingsStyles = (C: MonoTheme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: C.bg,
      paddingHorizontal: 18,
    },
    headerRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: SPACE.lg,
    },
    headerSpacer: {
      width: 40,
      height: 40,
    },
    backBtn: {
      width: 40,
      height: 40,
      borderRadius: RADIUS.chip,
      borderWidth: 1,
      borderBottomWidth: 3,
      borderColor: C.border,
      backgroundColor: C.surface,
      justifyContent: "center",
      alignItems: "center",
    },
    headerTitle: {
      color: C.text,
      fontSize: TYPE_SIZE.heading,
      fontWeight: TYPE_WEIGHT.heavy,
    },
    scrollContent: {
      gap: 14,
    },
    profileCard: {
      backgroundColor: C.surface,
      borderWidth: 1,
      borderColor: C.borderSoft,
      borderRadius: RADIUS.sheet,
      padding: SPACE.lg,
      flexDirection: "row",
      alignItems: "center",
      shadowColor: C.shadow,
      shadowOpacity: 0.06,
      shadowRadius: 14,
      shadowOffset: { width: 0, height: 6 },
      elevation: 2,
    },
    profileInfo: {
      flex: 1,
      marginLeft: 13,
      minWidth: 0,
    },
    avatar: {
      width: 58,
      height: 58,
      borderRadius: RADIUS.xl,
      borderWidth: 1,
      borderColor: C.border,
      backgroundColor: C.primarySoft,
      justifyContent: "center",
      alignItems: "center",
      overflow: "hidden",
    },
    avatarImage: {
      width: "100%",
      height: "100%",
    },
    avatarText: {
      color: C.primary,
      fontWeight: TYPE_WEIGHT.heavy,
      fontSize: TYPE_SIZE.headingSmall,
    },
    profileName: {
      color: C.text,
      fontWeight: TYPE_WEIGHT.heavy,
      fontSize: TYPE_SIZE.titleSmall,
    },
    profileEmail: {
      color: C.muted,
      fontSize: TYPE_SIZE.label,
      fontWeight: TYPE_WEIGHT.bold,
      marginTop: 3,
    },
    badge: {
      alignSelf: "flex-start",
      backgroundColor: C.surfaceAlt,
      paddingHorizontal: 9,
      paddingVertical: SPACE.xs,
      borderRadius: RADIUS.pill,
      marginTop: SPACE.sm,
    },
    badgeText: {
      color: C.text,
      fontSize: TYPE_SIZE.captionLarge,
      fontWeight: TYPE_WEIGHT.strong,
    },
    editBtn: {
      width: 38,
      height: 38,
      borderRadius: RADIUS.chip,
      backgroundColor: C.primarySoft,
      alignItems: "center",
      justifyContent: "center",
      marginLeft: 10,
    },
    group: {
      backgroundColor: C.surface,
      borderRadius: RADIUS.sheet,
      borderWidth: 1,
      borderColor: C.borderSoft,
      overflow: "hidden",
    },
    groupHeader: {
      flexDirection: "row",
      alignItems: "center",
      gap: SPACE.sm,
      paddingHorizontal: 15,
      paddingTop: 15,
      paddingBottom: SPACE.sm,
    },
    groupIcon: {
      width: 28,
      height: 28,
      borderRadius: 11,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: C.primarySoft,
    },
    groupTitle: {
      color: C.text,
      fontSize: TYPE_SIZE.bodyStrong,
      fontWeight: TYPE_WEIGHT.heavy,
    },
    groupBody: {
      paddingHorizontal: 15,
      paddingBottom: SPACE.sm,
    },
    row: {
      minHeight: 62,
      paddingVertical: 10,
      flexDirection: "row",
      alignItems: "center",
      borderBottomWidth: 1,
      borderBottomColor: C.borderSoft,
      gap: 11,
    },
    rowLast: {
      borderBottomWidth: 0,
    },
    rowIcon: {
      width: 34,
      height: 34,
      borderRadius: RADIUS.md,
      backgroundColor: C.surfaceAlt,
      alignItems: "center",
      justifyContent: "center",
    },
    rowBody: {
      flex: 1,
      minWidth: 0,
    },
    rowText: {
      color: C.text,
      fontSize: TYPE_SIZE.body,
      fontWeight: TYPE_WEIGHT.heavy,
    },
    rowDesc: {
      color: C.muted,
      fontSize: TYPE_SIZE.captionLarge,
      fontWeight: TYPE_WEIGHT.bold,
      marginTop: 3,
    },
    infoValue: {
      color: C.muted,
      fontSize: TYPE_SIZE.bodySmall,
      fontWeight: TYPE_WEIGHT.heavy,
    },
    dangerGroup: {
      backgroundColor: C.surface,
      borderRadius: RADIUS.sheet,
      borderWidth: 1,
      borderColor: C.borderSoft,
      padding: 15,
      gap: 10,
    },
    dangerTitle: {
      color: C.text,
      fontSize: TYPE_SIZE.bodyStrong,
      fontWeight: TYPE_WEIGHT.heavy,
    },
    accountButton: {
      minHeight: 50,
      borderRadius: RADIUS.badge,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: C.surfaceAlt,
    },
    logoutText: {
      color: C.text,
      fontWeight: TYPE_WEIGHT.heavy,
    },
    deleteAccountBtn: {
      backgroundColor: C.dangerSoft,
    },
    deleteAccountText: {
      color: C.danger,
      fontWeight: TYPE_WEIGHT.heavy,
    },
    accountBtnDisabled: {
      opacity: 0.45,
    },
  });

export type SettingsStyles = ReturnType<typeof createSettingsStyles>;
