import type { MonoTheme } from "../../constants/mono";

export const createGroupTheme = (theme: MonoTheme) => {
  return {
    bg: theme.bg,
    surface: theme.surface,
    surfaceAlt: theme.surfaceAlt,
    elevated: theme.elevated,
    border: theme.border,
    borderMid: theme.borderSoft,
    primary: theme.primary,
    primarySoft: theme.primarySoft,
    success: theme.success,
    successSoft: theme.successSoft,
    warning: theme.warning,
    warningSoft: theme.warningSoft,
    danger: theme.danger,
    dangerSoft: theme.dangerSoft,
    live: theme.live,
    liveSoft: theme.liveSoft,
    textPrimary: theme.text,
    textSecondary: theme.muted,
    textTertiary: theme.subtle,
    textAccent: theme.primary,
    accent: theme.primary,
    cafe: theme.primary,
    cafeSoft: theme.primarySoft,
    purple: "#7C3AED",
    inverse: theme.inverse,
    shadow: theme.shadow,
    statusBar: theme.statusBar,
  };
};

export type GroupTheme = ReturnType<typeof createGroupTheme>;
