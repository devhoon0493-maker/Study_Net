import { onValue, ref, update } from "firebase/database";
import { useCallback, useEffect, useState } from "react";
import { Alert } from "react-native";

import { db } from "../../utils/firebaseConfig";
import type { Room } from "./groupTypes";

export type RoomJoinRequest = {
  applicantId: string;
  name: string;
  color: string;
  image?: string | null;
  userType?: string;
  bio?: string;
  requestedAt: number;
  status: "pending" | "approved" | "rejected";
};

export function useRoomJoinRequests(room: Room | null, currentMemberId?: string) {
  const [requests, setRequests] = useState<RoomJoinRequest[]>([]);
  const canReview = Boolean(
    room && currentMemberId &&
      (room.ownerId === currentMemberId || room.deputy1Id === currentMemberId || room.deputy2Id === currentMemberId),
  );

  useEffect(() => {
    if (!room || !canReview) {
      setRequests([]);
      return;
    }

    return onValue(ref(db, `roomJoinRequests/${room.id}`), (snapshot) => {
      const records = snapshot.val() as Record<string, Omit<RoomJoinRequest, "applicantId">> | null;
      setRequests(
        Object.entries(records ?? {})
          .filter(([, request]) => request.status === "pending")
          .map(([applicantId, request]) => ({ ...request, applicantId }))
          .sort((a, b) => a.requestedAt - b.requestedAt),
      );
    }, (error) => {
      console.warn("Group join request listener failed:", error);
    });
  }, [canReview, room]);

  const reviewRequest = useCallback(async (request: RoomJoinRequest, approve: boolean) => {
    if (!room || !currentMemberId || !canReview) return;
    if (approve && room.members.length >= room.max) {
      Alert.alert("그룹 인원 초과", "그룹에 빈자리가 없어 신청을 승인할 수 없어요.");
      return;
    }

    const now = Date.now();
    const updates: Record<string, unknown> = {
      [`roomJoinRequests/${room.id}/${request.applicantId}/status`]: approve ? "approved" : "rejected",
      [`roomJoinRequests/${room.id}/${request.applicantId}/reviewedBy`]: currentMemberId,
      [`roomJoinRequests/${room.id}/${request.applicantId}/reviewedAt`]: now,
    };

    if (approve) {
      updates[`rooms/${room.id}/members/${request.applicantId}`] = {
        name: request.name,
        color: request.color,
        image: request.image ?? null,
        userType: request.userType ?? "",
        bio: request.bio ?? "",
        speaking: false,
        status: "접속중",
        studyStartEpoch: null,
        online: false,
        lastSeenAt: now,
        joinedAt: now,
      };
      updates[`userRooms/${request.applicantId}/${room.id}`] = true;
    }

    try {
      await update(ref(db), updates);
    } catch {
      Alert.alert(
        approve ? "가입 승인 실패" : "신청 거절 실패",
        "현재 Firebase 규칙에서 운영진의 요청 처리 권한을 허용하지 않을 수 있어요. 규칙을 업데이트한 뒤 다시 시도해 주세요.",
      );
    }
  }, [canReview, currentMemberId, room]);

  return { requests, canReview, reviewRequest };
}
