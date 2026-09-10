import { onDisconnect, ref, update } from "firebase/database";
import { useCallback, useEffect, useMemo, useRef } from "react";
import { AppState, type AppStateStatus } from "react-native";

import { getErrorMessage } from "../../utils/errorMessages";
import { db } from "../../utils/firebaseConfig";
import { loadStudyStatusPublic } from "../../utils/privacySettings";
import type { Room, Screen, StoredMember } from "./groupTypes";
import { getCurrentStudySession } from "./groupUtils";

type UseGroupPresenceSyncParams = {
  member: StoredMember | null;
  rooms: Room[];
  selectedRoomId: string | null;
  screen: Screen;
  onError: (message: string) => void;
};

const SYNC_ERROR_MESSAGE = "공부 상태 동기화에 실패했어요.";

export function useGroupPresenceSync({
  member,
  rooms,
  selectedRoomId,
  screen,
  onError,
}: UseGroupPresenceSyncParams) {
  const roomsRef = useRef<Room[]>([]);

  useEffect(() => {
    roomsRef.current = rooms;
  }, [rooms]);

  useEffect(() => {
    if (!member || !selectedRoomId || screen !== "room") return;

    let mounted = true;
    const syncMyStudyStatus = async () => {
      try {
        const session = await getCurrentStudySession();
        const studyStatusPublic = await loadStudyStatusPublic();
        /* istanbul ignore next -- prevents updates after an unmount race. */
        if (!mounted) return;
        const previousMember = roomsRef.current
          .find((room) => room.id === selectedRoomId)
          ?.members.find((roomMember) => roomMember.id === member.id);
        const nowMs = Date.now();
        await update(ref(db, `rooms/${selectedRoomId}/members/${member.id}`), {
          name: member.name,
          color: member.color,
          image: member.image ?? null,
          userType: member.userType ?? "",
          bio: member.bio ?? "",
          studyStatusPublic,
          speaking: previousMember?.speaking ?? false,
          online: true,
          lastSeenAt: nowMs,
          joinedAt: previousMember?.joinedAt ?? nowMs,
          ...session,
        });
      } catch (error) {
        /* istanbul ignore next -- prevents error callbacks after an unmount race. */
        if (mounted) onError(getErrorMessage(error) || SYNC_ERROR_MESSAGE);
      }
    };

    syncMyStudyStatus();
    const timer = setInterval(syncMyStudyStatus, 5000);

    return () => {
      mounted = false;
      clearInterval(timer);
    };
  }, [member, onError, screen, selectedRoomId]);

  const syncMyStudyStatusToJoinedRooms = useCallback(async () => {
    if (!member) return;

    const joinedRooms = roomsRef.current.filter((room) =>
      room.members.some((m) => m.id === member.id),
    );
    if (joinedRooms.length === 0) return;

    const session = await getCurrentStudySession();
    const studyStatusPublic = await loadStudyStatusPublic();
    const nowMs = Date.now();
    const memberPresence = {
      name: member.name,
      color: member.color,
      image: member.image ?? null,
      userType: member.userType ?? "",
      bio: member.bio ?? "",
      studyStatusPublic,
      online: true,
      lastSeenAt: nowMs,
      ...session,
    };

    const updates: Record<string, unknown> = {};
    for (const room of joinedRooms) {
      updates[`rooms/${room.id}/members/${member.id}`] = {
        ...memberPresence,
        speaking: false,
        joinedAt:
          room.members.find((m) => m.id === member.id)?.joinedAt ?? nowMs,
      };
    }

    await update(ref(db), updates);
  }, [member]);

  const joinedRoomKey = useMemo(() => {
    if (!member) return "";
    return rooms
      .filter((room) => room.members.some((m) => m.id === member.id))
      .map((room) => room.id)
      .sort()
      .join("|");
  }, [member, rooms]);

  useEffect(() => {
    if (!joinedRoomKey) return;
    syncMyStudyStatusToJoinedRooms().catch((error) => {
      /* istanbul ignore next -- fallback message only applies to non-standard thrown values. */
      onError(getErrorMessage(error) || SYNC_ERROR_MESSAGE);
    });
  }, [joinedRoomKey, onError, syncMyStudyStatusToJoinedRooms]);

  useEffect(() => {
    if (!member || !joinedRoomKey) return;

    const disconnects = roomsRef.current
      .filter((room) => room.members.some((m) => m.id === member.id))
      .map((room) =>
        onDisconnect(ref(db, `rooms/${room.id}/members/${member.id}`)),
      );

    disconnects.forEach((disconnect) => {
      disconnect.update({ online: false, lastSeenAt: Date.now() });
    });

    return () => {
      disconnects.forEach((disconnect) => {
        /* istanbul ignore next -- cancellation failures are intentionally swallowed during cleanup. */
        disconnect.cancel().catch(() => {});
      });
    };
  }, [joinedRoomKey, member]);

  const updateMyPresenceInJoinedRooms = useCallback(
    async (online: boolean) => {
      /* istanbul ignore next -- this callback is only registered while member exists. */
      if (!member) return;

      const joinedRooms = roomsRef.current.filter((room) =>
        room.members.some((m) => m.id === member.id),
      );
      if (joinedRooms.length === 0) return;

      const nowMs = Date.now();
      const updates: Record<string, unknown> = {};
      for (const room of joinedRooms) {
        updates[`rooms/${room.id}/members/${member.id}/online`] = online;
        updates[`rooms/${room.id}/members/${member.id}/lastSeenAt`] = nowMs;
      }

      await update(ref(db), updates);
    },
    [member],
  );

  useEffect(() => {
    if (!member) return;

    const handleAppState = (nextState: AppStateStatus) => {
      updateMyPresenceInJoinedRooms(nextState === "active").catch(() => {});
    };

    const subscription = AppState.addEventListener("change", handleAppState);
    updateMyPresenceInJoinedRooms(AppState.currentState === "active").catch(
      /* istanbul ignore next -- initial presence failures are intentionally non-blocking. */
      () => {},
    );

    return () => subscription.remove();
  }, [member, updateMyPresenceInJoinedRooms]);

  useEffect(() => {
    if (!member) return;

    let mounted = true;
    const sync = async () => {
      try {
        await syncMyStudyStatusToJoinedRooms();
      } catch (error) {
        /* istanbul ignore next -- prevents error callbacks after an unmount race. */
        if (mounted) onError(getErrorMessage(error) || SYNC_ERROR_MESSAGE);
      }
    };

    sync();
    const timer = setInterval(sync, 5000);

    return () => {
      mounted = false;
      clearInterval(timer);
    };
  }, [member, onError, syncMyStudyStatusToJoinedRooms]);

  return {
    syncMyStudyStatusToJoinedRooms,
  };
}
