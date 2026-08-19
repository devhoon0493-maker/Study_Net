import { useMemo } from "react";

import type { Member, Room } from "./groupTypes";
import { isMemberOnline, isMemberStudying } from "./groupUtils";

export function useGroupRoomMemberStats(
  room: Room | null,
  memberId: string | undefined,
  now: number,
) {
  return useMemo(() => {
    const roomMembers: Member[] = room?.members ?? [];
    const onlineMembers = roomMembers.filter((member) =>
      isMemberOnline(member, now),
    );
    const offlineMemberList = roomMembers.filter(
      (member) => !isMemberOnline(member, now),
    );
    const studyingMembers = onlineMembers.filter(isMemberStudying);
    const waitingMemberList = onlineMembers.filter(
      (member) => !isMemberStudying(member),
    );

    return {
      roomMembers,
      myMember: roomMembers.find((member) => member.id === memberId),
      memberCountText: `${roomMembers.length}/${room?.max ?? 6}`,
      studyingMembers,
      waitingMemberList,
      waitingMembers: waitingMemberList.length,
      offlineMemberList,
      offlineMembers: offlineMemberList.length,
    };
  }, [memberId, now, room]);
}
