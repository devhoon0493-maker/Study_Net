import { get, ref, set, update } from "firebase/database";
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
  const [codeNotice, setCodeNotice] = useState("");

  const addMeToRoom = useCallback(
    async (
      room: Room,
      onError: (message: string) => void,
      onAlreadyJoined?: () => void,
    ) => {
      /* istanbul ignore next -- public join entrypoints already guard member presence. */
      if (!member) return false;
      const alreadyJoined = room.members.some((m) => m.id === member.id);
      const nowMs = Date.now();

      if (alreadyJoined) {
        onAlreadyJoined?.();
        return true;
      }

      if (room.members.length >= room.max) {
        onError("이 방은 현재 꽉 찼어요.");
        return false;
      }

      const session = await getCurrentStudySession();
      const studyStatusPublic = await loadStudyStatusPublic();
      await update(ref(db, `rooms/${room.id}/members/${member.id}`), {
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
        joinedAt: nowMs,
      });

      await update(ref(db), {
        [`userRooms/${member.id}/${room.id}`]: true,
      }).catch((error) => {
        console.warn("Joined room index sync failed:", error);
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
        setCodeNotice("");

        const codeSnapshot = await get(ref(db, `roomCodes/${trimmed}`));
        if (!codeSnapshot.exists()) {
          setCodeError("존재하지 않는 방 코드예요. 다시 확인해주세요.");
          return;
        }

        const roomId = codeSnapshot.val();
        const roomSnapshot = await get(ref(db, `rooms/${roomId}`));
        if (!roomSnapshot.exists()) {
          await update(ref(db), { [`roomCodes/${trimmed}`]: null }).catch(() => {});
          setCodeError("이미 종료된 방이에요.");
          return;
        }

        const room = snapshotToRoom(roomId, roomSnapshot.val());
        if (room.members.some((roomMember) => roomMember.id === member.id)) {
          onJoined(room.id);
          return;
        }

        if (room.visibility === "private") {
          const requestRef = ref(db, `roomJoinRequests/${room.id}/${member.id}`);
          const existingRequest = await get(requestRef);
          if (existingRequest.val()?.status === "pending") {
            setCodeNotice("이미 가입 승인을 기다리고 있어요.");
            return;
          }

          await set(requestRef, {
            applicantId: member.id,
            name: member.name,
            color: member.color,
            image: member.image ?? null,
            userType: member.userType ?? "",
            bio: member.bio ?? "",
            requestedAt: Date.now(),
            status: "pending",
          });
          setCodeInput("");
          setCodeNotice("가입 신청을 보냈어요. 그룹 운영진의 승인을 기다려 주세요.");
          return;
        }

        let alreadyJoined = false;
        const ok = await addMeToRoom(room, setCodeError, () => {
          alreadyJoined = true;
        });
        if (!ok) return;

        if (!alreadyJoined) {
          setCodeInput("");
        }
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
    setCodeNotice("");
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
        let alreadyJoined = false;
        const ok = await addMeToRoom(latestRoom, onLobbyError, () => {
          alreadyJoined = true;
        });
        if (!ok) return;

        if (!alreadyJoined) {
          onLobbyError("");
        }
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
    codeNotice,
    setCodeError,
    setCodeInput,
    updateCodeInput,
    joinByCode,
    handleCodeJoin,
    joinLobbyRoom,
  };
}
