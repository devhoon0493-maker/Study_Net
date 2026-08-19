import { fireEvent, render } from "@testing-library/react-native";
import {
  InfoRow,
  SettingGroup,
  SettingRow,
  SwitchRow,
} from "../../../features/settings/SettingsRows";
import { createSettingsStyles } from "../../../features/settings/settingsStyles";
import { monoLight } from "../../../constants/mono";

describe("SettingsRows", () => {
  const styles = createSettingsStyles(monoLight);

  it("renders a setting group with row content", async () => {
    const { getByText } = await render(
      <SettingGroup
        title="Account"
        icon="person-circle-outline"
        styles={styles}
        C={monoLight}
      >
        <SettingRow
          icon="person-outline"
          label="Profile"
          description="Name and email"
          onPress={jest.fn()}
          styles={styles}
          theme={monoLight}
        />
      </SettingGroup>,
    );

    expect(getByText("Account")).toBeTruthy();
    expect(getByText("Profile")).toBeTruthy();
    expect(getByText("Name and email")).toBeTruthy();
  });

  it("calls the row press handler", async () => {
    const onPress = jest.fn();
    const { getByText } = await render(
      <SettingRow
        icon="lock-closed-outline"
        label="Password"
        description="Change password"
        onPress={onPress}
        styles={styles}
        theme={monoLight}
      />,
    );

    await fireEvent.press(getByText("Password"));

    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it("renders readonly info values", async () => {
    const { getByText } = await render(
      <InfoRow
        icon="information-circle-outline"
        label="Version"
        value="1.0.0"
        styles={styles}
        theme={monoLight}
      />,
    );

    expect(getByText("Version")).toBeTruthy();
    expect(getByText("1.0.0")).toBeTruthy();
  });

  it("calls switch change handler", async () => {
    const onChange = jest.fn();
    const { getByRole } = await render(
      <SwitchRow
        icon="moon-outline"
        label="Dark mode"
        description="Theme"
        value={false}
        onChange={onChange}
        styles={styles}
        theme={monoLight}
      />,
    );

    await fireEvent(getByRole("switch"), "valueChange", true);

    expect(onChange).toHaveBeenCalledWith(true);
  });

  it("renders rows without optional descriptions and with last-row styling", async () => {
    const { getByText, queryByText, getByRole } = await render(
      <>
        <SettingRow
          icon="person-outline"
          label="Profile"
          onPress={jest.fn()}
          styles={styles}
          theme={monoLight}
          isLast
        />
        <InfoRow
          icon="information-circle-outline"
          label="Build"
          value="dev"
          styles={styles}
          theme={monoLight}
          isLast
        />
        <SwitchRow
          icon="moon-outline"
          label="Theme"
          value
          onChange={jest.fn()}
          styles={styles}
          theme={monoLight}
          isLast
        />
      </>,
    );

    expect(getByText("Profile")).toBeTruthy();
    expect(getByText("Build")).toBeTruthy();
    expect(getByText("dev")).toBeTruthy();
    expect(getByRole("switch")).toBeTruthy();
    expect(queryByText("Name and email")).toBeNull();
  });
});
