import { fireEvent, render, waitFor } from "@testing-library/react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";

import GroupScreen from "../../app/Group";

const mockRouter = {
  replace: jest.fn(),
};
const mockUpdateCodeInput = jest.fn();
const mockHandleCodeJoin = jest.fn();
const mockJoinLobbyRoom = jest.fn();
const mockCreateRoom = jest.fn();
const mockSetCreateRoomName = jest.fn();
const mockSetCreateRoomSubjects = jest.fn();
const mockSetCreateRoomVisibility = jest.fn();
const mockResetDraft = jest.fn();

jest.mock("expo-router", () => ({
  useLocalSearchParams: jest.fn(() => ({})),
  useRouter: () => mockRouter,
}));

jest.mock("../../components/BottomNav", () => ({
  __esModule: true,
  default: () => null,
  getBottomNavSpace: jest.fn((bottomInset: number) => 80 + bottomInset),
}));

jest.mock("../../features/group/components", () => {
  const React = require("react");
  const { Text, TouchableOpacity, View } = require("react-native");

  return {
    CreateGroupModal: ({
      visible,
      onCreate,
    }: {
      visible: boolean;
      onCreate: () => void;
    }) =>
      visible ? (
        <TouchableOpacity testID="group-create-submit-button" onPress={onCreate}>
          <Text>Create Group Modal</Text>
        </TouchableOpacity>
      ) : null,
    FloatingCreateGroupButton: ({ onPress }: { onPress: () => void }) => (
      <TouchableOpacity testID="group-open-create-button" onPress={onPress}>
        <Text>Open Create</Text>
      </TouchableOpacity>
    ),
    GroupLobbyContent: ({
      onChangeCode,
      onJoinCode,
      onJoinRoom,
    }: {
      onChangeCode: (value: string) => void;
      onJoinCode: () => void;
      onJoinRoom: (roomId: string) => void;
    }) => (
      <View>
        <Text>Group Lobby</Text>
        <TouchableOpacity
          testID="group-code-change-button"
          onPress={() => onChangeCode("ABC123")}
        >
          <Text>Change Code</Text>
        </TouchableOpacity>
        <TouchableOpacity testID="group-join-code-button" onPress={onJoinCode}>
          <Text>Join Code</Text>
        </TouchableOpacity>
        <TouchableOpacity
          testID="group-join-room-button"
          onPress={() => onJoinRoom("room-1")}
        >
          <Text>Join Room</Text>
        </TouchableOpacity>
      </View>
    ),
    GroupLobbyHeaderBar: ({ onBack }: { onBack: () => void }) => (
      <TouchableOpacity testID="group-back-button" onPress={onBack}>
        <Text>Back</Text>
      </TouchableOpacity>
    ),
    GroupRoomContent: () => <Text>Group Room Content</Text>,
    GroupRoomHeaderBar: () => <Text>Group Room Header</Text>,
    LeaveGroupConfirmModal: () => null,
    MemberSection: () => null,
  };
});

jest.mock("../../features/group/useCreateGroupDraft", () => ({
  useCreateGroupDraft: () => ({
    memberSliderPanHandlers: {},
    memberSliderPercent: 50,
    onSliderLayout: jest.fn(),
    resetDraft: mockResetDraft,
    roomMax: 10,
    roomName: "Algorithms",
    roomSubjects: "CS",
    roomVisibility: "public",
    setRoomMax: jest.fn(),
    setRoomName: mockSetCreateRoomName,
    setRoomSubjects: mockSetCreateRoomSubjects,
    setRoomVisibility: mockSetCreateRoomVisibility,
  }),
}));

jest.mock("../../features/group/useGroupJoinActions", () => ({
  useGroupJoinActions: () => ({
    codeError: "",
    codeInput: "",
    handleCodeJoin: mockHandleCodeJoin,
    joinByCode: jest.fn(),
    joinLobbyRoom: mockJoinLobbyRoom,
    joining: false,
    setCodeError: jest.fn(),
    setCodeInput: jest.fn(),
    updateCodeInput: mockUpdateCodeInput,
  }),
}));

jest.mock("../../features/group/useGroupLobbyStats", () => ({
  useGroupLobbyStats: () => ({
    lobbyRooms: [{ id: "room-1", name: "Algorithms" }],
    lobbyStudyingCount: 1,
    lobbyStudyingMembers: [],
    publicRooms: [{ id: "room-1", name: "Algorithms" }],
  }),
}));

jest.mock("../../features/group/useGroupMemberProfile", () => ({
  useGroupMemberProfile: () => ({
    color: "#4F46E5",
    id: "member-1",
    name: "Tester",
  }),
}));

jest.mock("../../features/group/useGroupPresenceSync", () => ({
  useGroupPresenceSync: jest.fn(),
}));

jest.mock("../../features/group/useGroupRoomActions", () => ({
  useGroupRoomActions: () => ({
    createRoom: mockCreateRoom,
    creating: false,
    leaveRoomNow: jest.fn(),
  }),
}));

jest.mock("../../features/group/useGroupRoomMemberStats", () => ({
  useGroupRoomMemberStats: () => ({
    memberCountText: "1/10",
    myMember: null,
    offlineMemberList: [],
    offlineMembers: [],
    studyingMembers: [],
    waitingMemberList: [],
    waitingMembers: [],
  }),
}));

jest.mock("../../features/group/useGroupRooms", () => ({
  useGroupRooms: () => [{ id: "room-1", name: "Algorithms" }],
}));

jest.mock("../../features/group/useInitialGroupCodeJoin", () => ({
  useInitialGroupCodeJoin: jest.fn(),
}));

jest.mock("../../features/group/useLivePulse", () => ({
  useLivePulse: () => true,
}));

jest.mock("../../features/group/useNow", () => ({
  useNow: () => Date.now(),
}));

jest.mock("../../features/group/useSelectedGroupRoom", () => ({
  useSelectedGroupRoom: () => null,
}));

const safeAreaMetrics = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 24, right: 0, bottom: 24, left: 0 },
};

describe("GroupScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders lobby and wires core lobby actions", async () => {
    const { getByTestId, getByText } = await render(
      <SafeAreaProvider initialMetrics={safeAreaMetrics}>
        <GroupScreen />
      </SafeAreaProvider>,
    );

    await waitFor(() => {
      expect(getByText("Group Lobby")).toBeTruthy();
    });

    await fireEvent.press(getByTestId("group-back-button"));
    await fireEvent.press(getByTestId("group-code-change-button"));
    await fireEvent.press(getByTestId("group-join-code-button"));
    await fireEvent.press(getByTestId("group-join-room-button"));

    expect(mockRouter.replace).toHaveBeenCalledWith("/main");
    expect(mockUpdateCodeInput).toHaveBeenCalledWith("ABC123");
    expect(mockHandleCodeJoin).toHaveBeenCalled();
    expect(mockJoinLobbyRoom).toHaveBeenCalledWith("room-1");
  });

  it("opens create modal and submits draft values", async () => {
    const { getByTestId } = await render(
      <SafeAreaProvider initialMetrics={safeAreaMetrics}>
        <GroupScreen />
      </SafeAreaProvider>,
    );

    await fireEvent.press(getByTestId("group-open-create-button"));
    await fireEvent.press(getByTestId("group-create-submit-button"));

    expect(mockCreateRoom).toHaveBeenCalledWith({
      roomName: "Algorithms",
      roomSubjects: "CS",
      roomMax: 10,
      roomVisibility: "public",
    });
  });
});
