import { useMemo } from "react";

import type { Room } from "./groupTypes";
import { isMemberOnline, isMemberStudying } from "./groupUtils";

export function useGroupLobbyStats(
  rooms: Room[],
  now: number,
  memberId?: string,
) {
  return useMemo(() => {
    const publicRooms = rooms.filter((room) => room.visibility === "public");
    const joinedPrivateRooms = rooms.filter(
      (room) =>
        room.visibility === "private" &&
        Boolean(memberId) &&
        room.members.some((member) => member.id === memberId),
    );
    const lobbyRooms = [...publicRooms, ...joinedPrivateRooms];
    const lobbyStudyingMembers = rooms.flatMap((room) =>
      room.members.filter((m) => isMemberOnline(m, now) && isMemberStudying(m)),
    );
    const lobbyStudyingCount = rooms.reduce(
      (sum, room) =>
        sum +
        room.members.filter((m) => isMemberOnline(m, now) && isMemberStudying(m))
          .length,
      0,
    );

    return {
      publicRooms,
      lobbyRooms,
      lobbyStudyingMembers,
      lobbyStudyingCount,
    };
  }, [memberId, now, rooms]);
}
