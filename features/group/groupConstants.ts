export const CODE_LENGTH = 6;
export const MEMBER_KEY = "group_member_profile";
export const ACTIVE_SESSION_KEY = "active_session";
export const MAX_GROUP_MEMBERS = 20;
export const MIN_GROUP_MEMBERS = 2;
export const DEFAULT_GROUP_MEMBERS = 12;

export const COLORS = [
  "#4F46E5",
  "#2563EB",
  "#059669",
  "#D97706",
  "#DC2626",
  "#7C3AED",
];

export const ROOM_EMOJIS = ["📚", "✏️", "💻", "🎯", "🧠"];

export const VISIBILITY_OPTIONS = [
  {
    value: "public",
    label: "공개 그룹",
    description: "로비에 표시되고 누구나 바로 들어올 수 있어요.",
  },
  {
    value: "private",
    label: "비공개 코드",
    description: "입장 코드를 아는 사람만 들어올 수 있어요.",
  },
] as const;
