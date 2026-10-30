import { useLocalSearchParams, useRouter } from "expo-router";
import {
  useCallback,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ActivityIndicator,
  StatusBar,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import BottomNav, { getBottomNavSpace } from "../components/BottomNav";
import PublicProfileModal from "../components/PublicProfileModal";
import { getScreenTopPadding } from "../constants/layout";
import { useMonoTheme } from "../constants/mono";
import {
  CreateGroupModal,
  FloatingCreateGroupButton,
  GroupLobbyContent,
  GroupLobbyHeaderBar,
  GroupRoomContent,
  GroupRoomHeaderBar,
  LeaveGroupConfirmModal,
} from "../features/group/components";
import { createStyles } from "../features/group/groupStyles";
import { createGroupTheme } from "../features/group/groupTheme";
import type {
  Screen,
} from "../features/group/groupTypes";
import { useCreateGroupDraft } from "../features/group/useCreateGroupDraft";
import { useGroupMemberProfile } from "../features/group/useGroupMemberProfile";
import { useGroupJoinActions } from "../features/group/useGroupJoinActions";
import { useGroupLobbyStats } from "../features/group/useGroupLobbyStats";
import { useGroupPresenceSync } from "../features/group/useGroupPresenceSync";
import { useGroupRoomActions } from "../features/group/useGroupRoomActions";
import { useGroupAnnouncement } from "../features/group/useGroupAnnouncement";
import { useRoomJoinRequests } from "../features/group/useRoomJoinRequests";
import { useGroupRoomMemberStats } from "../features/group/useGroupRoomMemberStats";
import { useGroupRooms } from "../features/group/useGroupRooms";
import { useInitialGroupCodeJoin } from "../features/group/useInitialGroupCodeJoin";
import { useLivePulse } from "../features/group/useLivePulse";
import { useNow } from "../features/group/useNow";
import { useSelectedGroupRoom } from "../features/group/useSelectedGroupRoom";

export default function GroupScreen() {
  const router = useRouter();
  const { code: initialCodeParam } = useLocalSearchParams<{ code?: string }>();
  const { theme } = useMonoTheme();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const C = useMemo(() => createGroupTheme(theme), [theme]);
  const s = useMemo(
    () => createStyles(C, { compact: width < 380 }),
    [C, width],
  );
  const bottomSpace = getBottomNavSpace(insets.bottom);
  const topPadding = getScreenTopPadding(insets.top);
  const [screen, setScreen] = useState<Screen>("lobby");
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [profileUid, setProfileUid] = useState<string | null>(null);
  const member = useGroupMemberProfile();
  const [loadError, setLoadError] = useState("");
  const rooms = useGroupRooms(member?.id, setLoadError);

  const now = useNow();
  const livePulse = useLivePulse();
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const codeInputRef = useRef<TextInput>(null);
  const [leaveConfirmVisible, setLeaveConfirmVisible] = useState(false);
  const [transferTargetId, setTransferTargetId] = useState<string | null>(null);
  const {
    roomName,
    setRoomName,
    roomSubjects,
    setRoomSubjects,
    roomMax,
    roomVisibility,
    setRoomVisibility,
    memberSliderPercent,
    memberSliderPanHandlers,
    onSliderLayout,
    resetDraft,
  } = useCreateGroupDraft();

  const selectedRoom = useSelectedGroupRoom({
    selectedRoomId,
    onRoomMissing: useCallback(() => {
      setSelectedRoomId(null);
      setScreen("lobby");
      setLoadError("방장이 나갔거나 모든 사용자가 나가서 방이 종료됐어요.");
    }, []),
    onRoomLoaded: useCallback(() => {
      setLoadError("");
    }, []),
  });
  const announcement = useGroupAnnouncement(selectedRoom?.id);
  const { requests, canReview, reviewRequest } = useRoomJoinRequests(selectedRoom, member?.id);

  useGroupPresenceSync({
    member,
    rooms,
    selectedRoomId,
    screen,
    onError: setLoadError,
  });
  const {
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
  } = useGroupJoinActions({
    member,
    onJoined: useCallback((roomId: string) => {
      setSelectedRoomId(roomId);
      setScreen("room");
    }, []),
    onLobbyError: setLoadError,
  });
  const {
    creating,
    leaving,
    createRoom,
    leaveRoomNow,
    transferOwnershipAndLeave,
  } = useGroupRoomActions({
    member,
    selectedRoom,
    onError: setLoadError,
    onCreated: useCallback((roomId: string) => {
      setCreateModalVisible(false);
      resetDraft();
      setSelectedRoomId(roomId);
      setScreen("room");
    }, [resetDraft]),
    onLeft: useCallback(() => {
      setLeaveConfirmVisible(false);
      setTransferTargetId(null);
      setSelectedRoomId(null);
      setScreen("lobby");
    }, []),
  });

  useInitialGroupCodeJoin({
    initialCodeParam,
    memberReady: Boolean(member),
    joining,
    setCodeError,
    setCodeInput,
    joinByCode,
    onCodePending: useCallback(() => {
      setScreen("lobby");
    }, []),
  });

  const leaveRoom = () => {
    if (!member || !selectedRoom) {
      setScreen("lobby");
      return;
    }

    setTransferTargetId(null);
    setLeaveConfirmVisible(true);
  };

  const {
    publicRooms,
    lobbyRooms,
    lobbyStudyingMembers,
    lobbyStudyingCount,
  } = useGroupLobbyStats(rooms, now, member?.id);
  const {
    myMember,
    memberCountText,
    studyingMembers,
    waitingMemberList,
    waitingMembers,
    offlineMemberList,
    offlineMembers,
  } = useGroupRoomMemberStats(selectedRoom, member?.id, now);

  if (screen === "lobby") {
    return (
      <View style={[s.container, { paddingTop: topPadding }]}>
        <StatusBar barStyle={C.statusBar} backgroundColor={C.bg} />

        <GroupLobbyHeaderBar
          roomsCount={rooms.length}
          onBack={() => router.replace("/main")}
          s={s}
          C={C}
        />

        <GroupLobbyContent
          loadError={loadError}
          bottomSpace={bottomSpace}
          roomsCount={rooms.length}
          publicRoomsCount={publicRooms.length}
          lobbyRooms={lobbyRooms}
          lobbyStudyingMembers={lobbyStudyingMembers}
          lobbyStudyingCount={lobbyStudyingCount}
          codeInput={codeInput}
          codeError={codeError}
          codeNotice={codeNotice}
          joining={joining}
          codeInputRef={codeInputRef}
          livePulse={livePulse}
          onChangeCode={updateCodeInput}
          onJoinCode={handleCodeJoin}
          onJoinRoom={joinLobbyRoom}
          currentMemberId={member?.id}
          s={s}
          C={C}
        />

        <FloatingCreateGroupButton
          bottom={bottomSpace + 14}
          onPress={() => setCreateModalVisible(true)}
          s={s}
          C={C}
        />

        <CreateGroupModal
          visible={createModalVisible}
          onClose={() => setCreateModalVisible(false)}
          roomVisibility={roomVisibility}
          onChangeVisibility={setRoomVisibility}
          roomName={roomName}
          onChangeRoomName={setRoomName}
          roomSubjects={roomSubjects}
          onChangeRoomSubjects={setRoomSubjects}
          roomMax={roomMax}
          memberSliderPercent={memberSliderPercent}
          onSliderLayout={onSliderLayout}
          memberSliderPanHandlers={memberSliderPanHandlers}
          creating={creating}
          onCreate={() =>
            createRoom({
              roomName,
              roomSubjects,
              roomMax,
              roomVisibility,
            })
          }
          s={s}
          C={C}
        />

        <BottomNav />
      </View>
    );
  }

  if (!selectedRoom) {
    return (
      <View style={[s.container, s.center, { paddingTop: topPadding }]}>
        <ActivityIndicator color={C.textAccent} />
        <Text style={s.loadingText}>방 정보를 불러오는 중...</Text>
        <BottomNav />
      </View>
    );
  }

  const isOwner = selectedRoom.ownerId === member?.id;
  return (
    <View style={[s.container, { paddingTop: topPadding }]}>
      <StatusBar barStyle={C.statusBar} backgroundColor={C.bg} />

      <GroupRoomHeaderBar
        roomName={selectedRoom.name}
        roomCode={selectedRoom.code}
        memberCountText={memberCountText}
        livePulse={livePulse}
        onBack={leaveRoom}
        s={s}
        C={C}
      />

      <GroupRoomContent
        room={selectedRoom}
        announcement={announcement}
        joinRequests={requests}
        canReviewJoinRequests={canReview}
        onReviewJoinRequest={reviewRequest}
        currentMemberId={member?.id}
        onOpenProfile={setProfileUid}
        myMember={myMember}
        memberCountText={memberCountText}
        livePulse={livePulse}
        bottomSpace={bottomSpace}
        studyingMembers={studyingMembers}
        waitingMembers={waitingMembers}
        waitingMemberList={waitingMemberList}
        offlineMembers={offlineMembers}
        offlineMemberList={offlineMemberList}
        now={now}
        onLeave={leaveRoom}
        s={s}
        C={C}
      />

      <LeaveGroupConfirmModal
        visible={leaveConfirmVisible}
        isOwner={isOwner}
        members={selectedRoom.members}
        currentMemberId={member?.id ?? ""}
        selectedSuccessorId={transferTargetId}
        leaving={leaving}
        onCancel={() => {
          setLeaveConfirmVisible(false);
          setTransferTargetId(null);
        }}
        onConfirm={leaveRoomNow}
        onSelectSuccessor={setTransferTargetId}
        onTransferAndLeave={() => {
          if (transferTargetId) {
            transferOwnershipAndLeave(transferTargetId);
          }
        }}
        onDeleteGroup={leaveRoomNow}
        s={s}
        C={C}
      />
      <PublicProfileModal uid={profileUid} onClose={() => setProfileUid(null)} />
      <BottomNav />
    </View>
  );
}

