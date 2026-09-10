import {
  equalTo,
  limitToLast,
  onValue,
  orderByChild,
  query,
  ref,
} from "firebase/database";
import { useEffect, useState } from "react";

import { db } from "../../utils/firebaseConfig";
import type { Room, RoomRecord } from "./groupTypes";
import { snapshotToRoom } from "./groupUtils";

const sortRooms = (rooms: Room[]) =>
  rooms.sort((a, b) => (b.createdAt as number) - (a.createdAt as number));

export function useGroupRooms(
  memberId?: string,
  onError?: (message: string) => void,
) {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [publicRooms, setPublicRooms] = useState<Room[]>([]);
  const [joinedRooms, setJoinedRooms] = useState<Room[]>([]);

  useEffect(() => {
    const unsubscribe = onValue(
      query(ref(db, "rooms"), orderByChild("visibility"), equalTo("public"), limitToLast(50)),
      (snapshot) => {
      const rawRooms = snapshot.val() as Record<string, RoomRecord> | null;

      if (!rawRooms) {
        setRooms([]);
        return;
      }

      const nextRooms = Object.entries(rawRooms)
        .map(([id, raw]) => snapshotToRoom(id, raw))
        .sort((a, b) => (b.createdAt as number) - (a.createdAt as number));

      setPublicRooms(nextRooms);
      },
      (error) => {
        onError?.(
          error.message ||
            "그룹 목록을 불러오지 못했어요. Firebase Database Rules 배포 상태를 확인해주세요.",
        );
      },
    );

    return unsubscribe;
  }, [onError]);

  useEffect(() => {
    if (!memberId) {
      setJoinedRooms([]);
      return;
    }

    const roomUnsubscribers = new Map<string, () => void>();
    const roomMap = new Map<string, Room>();

    const syncJoinedRooms = () => {
      setJoinedRooms(sortRooms([...roomMap.values()]));
    };

    const unsubscribeUserRooms = onValue(
      ref(db, `userRooms/${memberId}`),
      (snapshot) => {
        const roomIds = snapshot.val() as Record<string, true> | null;
        const nextIds = new Set(roomIds ? Object.keys(roomIds) : []);

        for (const [roomId, unsubscribe] of roomUnsubscribers) {
          if (!nextIds.has(roomId)) {
            unsubscribe();
            roomUnsubscribers.delete(roomId);
            roomMap.delete(roomId);
          }
        }

        for (const roomId of nextIds) {
          if (roomUnsubscribers.has(roomId)) continue;

          const unsubscribeRoom = onValue(
            ref(db, `rooms/${roomId}`),
            (roomSnapshot) => {
              if (!roomSnapshot.exists()) {
                roomMap.delete(roomId);
                syncJoinedRooms();
                return;
              }

              roomMap.set(roomId, snapshotToRoom(roomId, roomSnapshot.val()));
              syncJoinedRooms();
            },
            (error) => {
              roomMap.delete(roomId);
              syncJoinedRooms();
              onError?.(
                error.message ||
                  "가입한 그룹 정보를 불러오지 못했어요. Firebase Database Rules 배포 상태를 확인해주세요.",
              );
            },
          );
          roomUnsubscribers.set(roomId, unsubscribeRoom);
        }

        syncJoinedRooms();
      },
      (error) => {
        onError?.(
          error.message ||
            "내 그룹 목록을 불러오지 못했어요. Firebase Database Rules 배포 상태를 확인해주세요.",
        );
      },
    );

    return () => {
      unsubscribeUserRooms();
      roomUnsubscribers.forEach((unsubscribe) => unsubscribe());
    };
  }, [memberId, onError]);

  useEffect(() => {
    const merged = new Map<string, Room>();
    for (const room of publicRooms) merged.set(room.id, room);
    for (const room of joinedRooms) merged.set(room.id, room);
    setRooms(sortRooms([...merged.values()]));
  }, [joinedRooms, publicRooms]);

  return rooms;
}
