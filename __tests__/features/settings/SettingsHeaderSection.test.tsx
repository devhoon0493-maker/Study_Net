import { fireEvent, render } from "@testing-library/react-native";
import { Text } from "react-native";

import {
  SettingsHeader,
  SettingsHeaderIconButton,
} from "../../../features/settings/SettingsHeader";
import { SettingsSection } from "../../../features/settings/SettingsSection";

const mockBack = jest.fn();

jest.mock("expo-router", () => ({
  useRouter: () => ({
    back: mockBack,
  }),
}));

describe("SettingsHeader and SettingsSection", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders header controls and handles back/right actions", async () => {
    const onRightPress = jest.fn();
    const { getByTestId, getByText } = await render(
      <SettingsHeader
        title="Profile"
        compactTitle
        right={
          <SettingsHeaderIconButton
            icon="checkmark"
            onPress={onRightPress}
          />
        }
      />,
    );

    expect(getByText("Profile")).toBeTruthy();
    await fireEvent.press(getByTestId("settings-header-back-button"));
    expect(mockBack).toHaveBeenCalled();

    await fireEvent.press(getByTestId("settings-header-icon-checkmark"));
    expect(onRightPress).toHaveBeenCalled();
  });

  it("renders the default spacer when no right action is supplied", async () => {
    const { getByText } = await render(<SettingsHeader title="Settings" />);

    expect(getByText("Settings")).toBeTruthy();
  });

  it("renders settings sections with and without titles", async () => {
    const { getByText } = await render(
      <>
        <SettingsSection title="Account" variant="primary">
          <Text>Profile</Text>
        </SettingsSection>
        <SettingsSection>
          <Text>Untitled content</Text>
        </SettingsSection>
      </>,
    );

    expect(getByText("Account")).toBeTruthy();
    expect(getByText("Profile")).toBeTruthy();
    expect(getByText("Untitled content")).toBeTruthy();
  });
});
