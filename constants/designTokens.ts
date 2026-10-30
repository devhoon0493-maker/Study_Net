import { Platform } from "react-native";

/** Shared visual scales for app-wide typography and layout. */
/** Text without an explicit family uses the platform's system sans font. */
export const TYPE_SIZE = {
  tiny: 7,
  smallIcon: 8,
  micro: 9,
  caption: 10,
  captionLarge: 11,
  label: 12,
  bodySmall: 13,
  body: 14,
  bodyStrong: 15,
  subheading: 16,
  titleSmall: 17,
  title: 18,
  titleMedium: 19,
  titleLarge: 20,
  titleCompact: 21,
  headingSmall: 22,
  heading: 24,
  headingMedium: 25,
  headingLarge: 26,
  displayCompact: 27,
  displaySmall: 28,
  timerDigitCompact: 26,
  timerDigit: 30,
  display: 32,
  stat: 34,
  timerSmall: 38,
  timerMedium: 40,
  timer: 46,
} as const;

export const TYPE_WEIGHT = {
  regular: "400",
  medium: "500",
  semibold: "600",
  bold: "700",
  strong: "800",
  heavy: "900",
} as const;

export const TYPE_FAMILY = {
  numeric: Platform.select({
    ios: "Menlo",
    android: "monospace",
    default: "monospace",
  }),
} as const;

export const SPACE = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

/** Shared minimum sizes for interactive controls, in logical pixels. */
export const CONTROL = {
  icon: 44,
  button: 48,
} as const;

export const RADIUS = {
  sm: 8,
  compact: 10,
  md: 12,
  chip: 13,
  control: 14,
  badge: 15,
  lg: 16,
  card: 18,
  xl: 20,
  sheet: 22,
  xxl: 24,
  pill: 999,
} as const;
