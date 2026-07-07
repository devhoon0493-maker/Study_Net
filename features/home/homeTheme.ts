import type { MonoTheme } from "../../constants/mono";

export const createHomeTheme = (theme: MonoTheme) => ({
  bg: theme.bg,
  surface: theme.surface,
  surfaceAlt: theme.surfaceAlt,
  surfaceElevated: theme.elevated,
  border: theme.border,
  borderSoft: theme.borderSoft,
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
  shadow: theme.shadow,
  inverse: theme.inverse,
});

export type HomeTheme = ReturnType<typeof createHomeTheme>;
