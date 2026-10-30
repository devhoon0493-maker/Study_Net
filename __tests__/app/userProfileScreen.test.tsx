import { fireEvent, render, waitFor } from "@testing-library/react-native";
import { get } from "firebase/database";
import { SafeAreaProvider } from "react-native-safe-area-context";

import UserProfileScreen from "../../app/user-profile";
import { auth } from "../../utils/firebaseConfig";

const mockRouter = { back: jest.fn() };
const mockParams: { uid?: string } = { uid: "member-1" };

jest.mock("expo-router", () => ({
  useLocalSearchParams: () => mockParams,
  useRouter: () => mockRouter,
}));

const safeAreaMetrics = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 24, right: 0, bottom: 24, left: 0 },
};

const renderScreen = async () =>
  render(
    <SafeAreaProvider initialMetrics={safeAreaMetrics}>
      <UserProfileScreen />
    </SafeAreaProvider>,
  );

const setCurrentUser = (user: unknown) => {
  Object.defineProperty(auth, "currentUser", {
    configurable: true,
    value: user,
    writable: true,
  });
};

describe("public user profile screen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockParams.uid = "member-1";
    setCurrentUser(null);
  });

  it("loads and displays public profile fields", async () => {
    jest.mocked(get).mockResolvedValueOnce({
      val: () => ({
        name: "Study Friend",
        userType: "Student",
        bio: "Learning every day",
        communityActivityPublic: false,
      }),
    } as never);

    const { getByText } = await renderScreen();

    await waitFor(() => {
      expect(getByText("Study Friend")).toBeTruthy();
      expect(getByText("Learning every day")).toBeTruthy();
      expect(getByText("커뮤니티 활동 비공개")).toBeTruthy();
    });
    expect(get).toHaveBeenCalledWith(
      expect.objectContaining({ path: "publicProfiles/member-1" }),
    );
  });

  it("falls back to the private profile only for the signed-in user's own uid", async () => {
    setCurrentUser({ uid: "member-1" });
    jest.mocked(get)
      .mockResolvedValueOnce({ val: () => null } as never)
      .mockResolvedValueOnce({
        val: () => ({ name: "My Private Profile", bio: "Only me" }),
      } as never);

    const { getByText } = await renderScreen();

    await waitFor(() => expect(getByText("My Private Profile")).toBeTruthy());
    expect(get).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ path: "users/member-1" }),
    );
  });

  it("does not read another user's private profile when their public profile is missing", async () => {
    setCurrentUser({ uid: "viewer" });
    jest.mocked(get).mockResolvedValueOnce({ val: () => null } as never);

    const { getByText } = await renderScreen();

    await waitFor(() =>
      expect(getByText("프로필을 불러오지 못했어요.")).toBeTruthy(),
    );
    expect(get).toHaveBeenCalledTimes(1);
    expect(get).toHaveBeenCalledWith(
      expect.objectContaining({ path: "publicProfiles/member-1" }),
    );
  });

  it("handles missing route uid and supports back navigation", async () => {
    mockParams.uid = undefined;
    const { getByText, getByLabelText } = await renderScreen();

    await waitFor(() =>
      expect(getByText("프로필을 불러오지 못했어요.")).toBeTruthy(),
    );
    expect(get).not.toHaveBeenCalled();

    fireEvent.press(getByLabelText("뒤로 가기"));
    expect(mockRouter.back).toHaveBeenCalled();
  });
});
