import { get, ref, update } from "firebase/database";
import { useCallback, useState } from "react";

import { getGroupJoinErrorMessage } from "../../utils/errorMessages";
import { db } from "../../utils/firebaseConfig";
import { loadStudyStatusPublic } from "../../utils/privacySettings";
import { CODE_LENGTH } from "./groupConstants";
import type { Room, StoredMember } from "./groupTypes";
import { getCurrentStudySession, snapshotToRoom } from "./groupUtils";

type UseGroupJoinActionsParams = {
  member: StoredMember | null;
  onJoined: (roomId: string) => void;
  onLobbyError: (message: string) => void;
};

export function useGroupJoinActions({
  member,
  onJoined,
  onLobbyError,
}: UseGroupJoinActionsParams) {
  const [joining, setJoining] = useState(false);
  const [codeInput, setCodeInput] = useState("");
  const [codeError, setCodeError] = useState("");

  const addMeToRoom = useCallback(
    async (room: Room, onError: (message: string) => void) => {
      /* istanbul ignore next -- public join entrypoints already guard member presence. */
      if (!member) return false;
      const alreadyJoined = room.members.some((m) => m.id === member.id);
      const nowMs = Date.now();
      if (room.members.length >= room.max && !alreadyJoined) {
        onError("이 방은 현재 꽉 찼어요.");
        return false;
      }

      const session = await getCurrentStudySession();
      const studyStatusPublic = await loadStudyStatusPublic();
      await update(ref(db), {
        [`rooms/${room.id}/members/${member.id}`]: {
          name: member.name,
          color: member.color,
          image: member.image ?? null,
          userType: member.userType ?? "",
          bio: member.bio ?? "",
          studyStatusPublic,
          speaking: false,
          ...session,
          online: true,
          lastSeenAt: nowMs,
          joinedAt: alreadyJoined
            ? (room.members.find((m) => m.id === member.id)?.joinedAt ?? nowMs)
            : nowMs,
        },
        [`userRooms/${member.id}/${room.id}`]: true,
      });
      return true;
    },
    [member],
  );

  const joinByCode = useCallback(
    async (code: string) => {
      if (!member || joining) return;

      const trimmed = code.trim().toUpperCase();
      if (trimmed.length < CODE_LENGTH) {
        setCodeError("6자리 코드를 모두 입력해주세요.");
        return;
      }

      try {
        setJoining(true);
        setCodeError("");

        const codeSnapshot = await get(ref(db, `roomCodes/${trimmed}`));
        if (!codeSnapshot.exists()) {
          setCodeError("존재하지 않는 방 코드예요. 다시 확인해주세요.");
          return;
        }

        const roomId = codeSnapshot.val();
        const roomSnapshot = await get(ref(db, `rooms/${roomId}`));
        if (!roomSnapshot.exists()) {
          await update(ref(db), { [`roomCodes/${trimmed}`]: null });
          setCodeError("이미 종료된 방이에요.");
          return;
        }

        const room = snapshotToRoom(roomId, roomSnapshot.val());
        const ok = await addMeToRoom(room, setCodeError);
        if (!ok) return;

        setCodeInput("");
        onJoined(room.id);
      } catch (error) {
        setCodeError(getGroupJoinErrorMessage(error));
      } finally {
        setJoining(false);
      }
    },
    [addMeToRoom, joining, member, onJoined],
  );

  const handleCodeJoin = useCallback(async () => {
    await joinByCode(codeInput);
  }, [codeInput, joinByCode]);

  const updateCodeInput = useCallback((value: string) => {
    setCodeError("");
    setCodeInput(
      value
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, "")
        .slice(0, CODE_LENGTH),
    );
  }, []);

  const joinLobbyRoom = useCallback(
    async (room: Room) => {
      if (!member || joining) return;

      try {
        setJoining(true);
        onLobbyError("");

        const roomSnapshot = await get(ref(db, `rooms/${room.id}`));
        if (!roomSnapshot.exists()) {
          onLobbyError("이미 종료된 방이에요.");
          return;
        }

        const latestRoom = snapshotToRoom(room.id, roomSnapshot.val());
        const ok = await addMeToRoom(latestRoom, onLobbyError);
        if (!ok) return;

        onJoined(latestRoom.id);
      } catch (error) {
        onLobbyError(getGroupJoinErrorMessage(error));
      } finally {
        setJoining(false);
      }
    },
    [addMeToRoom, joining, member, onJoined, onLobbyError],
  );

  return {
    joining,
    codeInput,
    codeError,
    setCodeError,
    setCodeInput,
    updateCodeInput,
    joinByCode,
    handleCodeJoin,
    joinLobbyRoom,
  };
}
