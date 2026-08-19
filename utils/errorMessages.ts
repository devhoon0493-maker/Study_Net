export const getErrorCode = (error: unknown) =>
  typeof error === "object" && error && "code" in error
    ? String(error.code)
    : undefined;

export const getErrorMessage = (error: unknown) =>
  error instanceof Error ? error.message : "";

export const getFirebaseWriteErrorMessage = (
  error: unknown,
  fallback: string,
) => {
  const code = getErrorCode(error) ?? "";
  const message = getErrorMessage(error);
  const lowerMessage = message.toLowerCase();

  if (code === "PERMISSION_DENIED" || message.includes("Permission denied")) {
    return "권한이 거부되었어요. Firebase 규칙이 배포되어 있는지 확인해주세요.";
  }

  if (
    code === "NETWORK_ERROR" ||
    code === "auth/network-request-failed" ||
    lowerMessage.includes("network")
  ) {
    return "네트워크 연결을 확인하고 다시 시도해주세요.";
  }

  if (lowerMessage.includes("offline")) {
    return "오프라인 상태에서는 저장할 수 없어요. 연결 후 다시 시도해주세요.";
  }

  return message || fallback;
};

export const getGroupJoinErrorMessage = (error: unknown) => {
  const base = getFirebaseWriteErrorMessage(error, "방 입장에 실패했어요.");

  if (base.startsWith("권한이 거부")) {
    return "방 입장 권한이 거부되었어요. 앱의 database.rules.json을 배포한 뒤 다시 시도해주세요.";
  }

  return base;
};
