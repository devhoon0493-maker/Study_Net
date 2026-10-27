import { get, push, ref, update } from "firebase/database";
import { useCallback, useState } from "react";
import { Alert } from "react-native";

import { getFirebaseWriteErrorMessage } from "../../utils/errorMessages";
import { db } from "../../utils/firebaseConfig";
import { loadStudyStatusPublic } from "../../utils/privacySettings";
import { COLORS, ROOM_EMOJIS } from "./groupConstants";
import type { Room, RoomVisibility, StoredMember } from "./groupTypes";
import { getCurrentStudySession, makeCode } from "./groupUtils";

type CreateRoomInput = {
  roomName: string;
  roomSubjects: string;
  roomMax: number;
  roomVisibility: RoomVisibility;
};

type UseGroupRoomActionsParams = {
  member: StoredMember | null;
  selectedRoom: Room | null;
  onError: (message: string) => void;
  onCreated: (roomId: string) => void;
  onLeft: () => void;
};

export function useGroupRoomActions({
  member,
  selectedRoom,
  onError,
  onCreated,
  onLeft,
}: UseGroupRoomActionsParams) {
  const [creating, setCreating] = useState(false);
  const [leaving, setLeaving] = useState(false);

  const makeUniqueCode = useCallback(async () => {
    for (let i = 0; i < 8; i += 1) {
      const code = makeCode();
      const codeSnapshot = await get(ref(db, `roomCodes/${code}`));
      if (!codeSnapshot.exists()) return code;
    }
    throw new Error("초대 코드를 만들지 못했어요. 다시 시도해주세요.");
  }, []);

  const createRoom = useCallback(
    async ({
      roomName,
      roomSubjects,
      roomMax,
      roomVisibility,
    }: CreateRoomInput) => {
      if (!member || creating) return;

      const name = roomName.trim();
      const subjects = roomSubjects.trim() || "자유 공부";
      if (name.length < 2) return;

      let createdRoomId: string | null = null;
      try {
        setCreating(true);
        const newRef = push(ref(db, "rooms"));
        const roomId = newRef.key;
        if (!roomId) throw new Error("방 ID를 만들지 못했어요.");

        const code = await makeUniqueCode();
        const createdAt = Date.now();
        const session = await getCurrentStudySession();
        const studyStatusPublic = await loadStudyStatusPublic();
        const room = {
          ownerId: member.id,
          name,
          subjects,
          emoji: ROOM_EMOJIS[Math.floor(Math.random() * ROOM_EMOJIS.length)],
          color: COLORS[Math.floor(Math.random() * COLORS.length)],
          max: roomMax,
          code,
          createdAt,
          mode: "study-status",
          visibility: roomVisibility,
          members: {
            [member.id]: {
              name: member.name,
              color: member.color,
              image: member.image ?? null,
              userType: member.userType ?? "",
              bio: member.bio ?? "",
              studyStatusPublic,
              speaking: false,
              ...session,
              online: true,
              lastSeenAt: createdAt,
              joinedAt: createdAt,
            },
          },
        };

        await update(ref(db), {
          [`rooms/${roomId}`]: room,
        });
        createdRoomId = roomId;
        await update(ref(db), { [`roomCodes/${code}`]: roomId });
        await update(ref(db), {
          [`userRooms/${member.id}/${roomId}`]: true,
        }).catch((error) => {
          console.warn("Created room index sync failed:", error);
        });
        createdRoomId = null;
        onError("");
        onCreated(roomId);
      } catch (error) {
        if (createdRoomId) {
          try {
            await update(ref(db), {
              [`rooms/${createdRoomId}`]: null,
              [`userRooms/${member.id}/${createdRoomId}`]: null,
            });
          } catch {
            // Keep the original create failure as the user-facing error.
          }
        }
        onError(getFirebaseWriteErrorMessage(error, "그룹 만들기에 실패했어요."));
      } finally {
        setCreating(false);
      }
    },
    [creating, makeUniqueCode, member, onCreated, onError],
  );

  const deleteRoom = useCallback(async (room: Room) => {
    await update(ref(db), {
      [`rooms/${room.id}`]: null,
      [`roomCodes/${room.code}`]: null,
      ...Object.fromEntries(
        room.members.map((roomMember) => [
          `userRooms/${roomMember.id}/${room.id}`,
          null,
        ]),
      ),
    });
  }, []);

  const leaveRoomNow = useCallback(async () => {
    if (!member || !selectedRoom || leaving) return;

    try {
      setLeaving(true);
      const isOwner = selectedRoom.ownerId === member.id;
      if (isOwner) {
        await deleteRoom(selectedRoom);
      } else {
        await update(ref(db), {
          [`rooms/${selectedRoom.id}/members/${member.id}`]: null,
          ...(selectedRoom.deputy1Id === member.id
            ? { [`rooms/${selectedRoom.id}/deputy1Id`]: null }
            : {}),
          ...(selectedRoom.deputy2Id === member.id
            ? { [`rooms/${selectedRoom.id}/deputy2Id`]: null }
            : {}),
          [`userRooms/${member.id}/${selectedRoom.id}`]: null,
        });
      }
      onLeft();
    } catch (error) {
      Alert.alert(
        "그룹 처리 실패",
        getFirebaseWriteErrorMessage(error, "그룹 처리에 실패했어요."),
      );
    } finally {
      setLeaving(false);
    }
  }, [deleteRoom, leaving, member, onLeft, selectedRoom]);

  const transferOwnershipAndLeave = useCallback(
    async (newOwnerId: string) => {
      if (!member || !selectedRoom || leaving) return;
      if (selectedRoom.ownerId !== member.id) return;
      if (
        newOwnerId === member.id ||
        !selectedRoom.members.some((roomMember) => roomMember.id === newOwnerId)
      ) {
        Alert.alert("그룹장 확인", "그룹 멤버를 선택해 주세요.");
        return;
      }

      try {
        setLeaving(true);
        await update(ref(db), {
          [`rooms/${selectedRoom.id}/ownerId`]: newOwnerId,
          ...(selectedRoom.deputy1Id === newOwnerId
            ? { [`rooms/${selectedRoom.id}/deputy1Id`]: null }
            : {}),
          ...(selectedRoom.deputy2Id === newOwnerId
            ? { [`rooms/${selectedRoom.id}/deputy2Id`]: null }
            : {}),
          [`rooms/${selectedRoom.id}/members/${member.id}`]: null,
          [`userRooms/${member.id}/${selectedRoom.id}`]: null,
        });
        onLeft();
      } catch (error) {
        Alert.alert(
          "그룹장을 넘기지 못했어요",
          getFirebaseWriteErrorMessage(error, "그룹장을 넘기지 못했어요."),
        );
      } finally {
        setLeaving(false);
      }
    },
    [leaving, member, onLeft, selectedRoom],
  );

  return {
    creating,
    leaving,
    createRoom,
    leaveRoomNow,
    transferOwnershipAndLeave,
  };
}
