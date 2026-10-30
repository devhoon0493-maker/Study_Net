export const SCREEN_TOP_GAP = 14;
export const SCREEN_BOTTOM_GAP = 24;
export const MIN_SCREEN_TOP_PADDING = 44;
export const MIN_SCREEN_BOTTOM_PADDING = 36;
export const RESPONSIVE_CONTENT_STYLE = {
  width: "100%" as const,
  maxWidth: 760,
  alignSelf: "center" as const,
};

export const getScreenTopPadding = (topInset: number, gap = SCREEN_TOP_GAP) =>
  Math.max(topInset + gap, MIN_SCREEN_TOP_PADDING);

export const getScreenBottomPadding = (
  bottomInset: number,
  gap = SCREEN_BOTTOM_GAP,
) => Math.max(bottomInset + gap, MIN_SCREEN_BOTTOM_PADDING);
