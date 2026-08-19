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
      marginBottom: 16,
    },
    headerSpacer: {
      width: 40,
      height: 40,
    },
    backBtn: {
      width: 40,
      height: 40,
      borderRadius: 13,
      borderWidth: 1,
      borderBottomWidth: 3,
      borderColor: C.border,
      backgroundColor: C.surface,
      justifyContent: "center",
      alignItems: "center",
    },
    headerTitle: {
      color: C.text,
      fontSize: 24,
      fontWeight: "900",
    },
    scrollContent: {
      gap: 14,
    },
    profileCard: {
      backgroundColor: C.surface,
      borderWidth: 1,
      borderColor: C.borderSoft,
      borderRadius: 22,
      padding: 16,
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
      borderRadius: 20,
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
      fontWeight: "900",
      fontSize: 22,
    },
    profileName: {
      color: C.text,
      fontWeight: "900",
      fontSize: 17,
    },
    profileEmail: {
      color: C.muted,
      fontSize: 12,
      fontWeight: "700",
      marginTop: 3,
    },
    badge: {
      alignSelf: "flex-start",
      backgroundColor: C.surfaceAlt,
      paddingHorizontal: 9,
      paddingVertical: 4,
      borderRadius: 999,
      marginTop: 8,
    },
    badgeText: {
      color: C.text,
      fontSize: 11,
      fontWeight: "800",
    },
    editBtn: {
      width: 38,
      height: 38,
      borderRadius: 13,
      backgroundColor: C.primarySoft,
      alignItems: "center",
      justifyContent: "center",
      marginLeft: 10,
    },
    group: {
      backgroundColor: C.surface,
      borderRadius: 22,
      borderWidth: 1,
      borderColor: C.borderSoft,
      overflow: "hidden",
    },
    groupHeader: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      paddingHorizontal: 15,
      paddingTop: 15,
      paddingBottom: 8,
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
      fontSize: 15,
      fontWeight: "900",
    },
    groupBody: {
      paddingHorizontal: 15,
      paddingBottom: 8,
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
      borderRadius: 12,
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
      fontSize: 14,
      fontWeight: "900",
    },
    rowDesc: {
      color: C.muted,
      fontSize: 11,
      fontWeight: "700",
      marginTop: 3,
    },
    infoValue: {
      color: C.muted,
      fontSize: 13,
      fontWeight: "900",
    },
    dangerGroup: {
      backgroundColor: C.surface,
      borderRadius: 22,
      borderWidth: 1,
      borderColor: C.borderSoft,
      padding: 15,
      gap: 10,
    },
    dangerTitle: {
      color: C.text,
      fontSize: 15,
      fontWeight: "900",
    },
    accountButton: {
      minHeight: 50,
      borderRadius: 15,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: C.surfaceAlt,
    },
    logoutText: {
      color: C.text,
      fontWeight: "900",
    },
    deleteAccountBtn: {
      backgroundColor: C.dangerSoft,
    },
    deleteAccountText: {
      color: C.danger,
      fontWeight: "900",
    },
    accountBtnDisabled: {
      opacity: 0.45,
    },
  });

export type SettingsStyles = ReturnType<typeof createSettingsStyles>;
