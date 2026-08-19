import { useMemo } from "react";

import type { Room } from "./groupTypes";
import { isMemberOnline, isMemberStudying } from "./groupUtils";

export function useGroupLobbyStats(rooms: Room[], now: number) {
  return useMemo(() => {
    const publicRooms = rooms.filter((room) => room.visibility === "public");
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
      lobbyRooms: publicRooms,
      lobbyStudyingMembers,
      lobbyStudyingCount,
    };
  }, [now, rooms]);
}
