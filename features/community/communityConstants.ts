export const categories = ["전체", "저장됨", "공부 인증", "질문", "목표 공유", "그룹 모집"] as const;

export type Category = (typeof categories)[number];
export type PostCategory = Exclude<Category, "전체" | "저장됨">;

export const categoryEmoji: Record<PostCategory, string> = {
  "공부 인증": "✏️",
  질문: "❓",
  "목표 공유": "🎯",
  "그룹 모집": "👥",
};
