import { fireEvent, render } from "@testing-library/react-native";

import { monoLight } from "../../../constants/mono";
import { MemberRow } from "../../../features/group/components/MemberRow";
import { createStyles } from "../../../features/group/groupStyles";
import { createGroupTheme } from "../../../features/group/groupTheme";

describe("group member profile navigation", () => {
  it("opens the member's public profile from their name", async () => {
    const onOpenProfile = jest.fn();
    const styles = createStyles(createGroupTheme(monoLight));

    const { getByText } = await render(
      <MemberRow
        member={{
          id: "member-1",
          name: "Min",
          color: "#123456",
          online: true,
          studyStartEpoch: 123,
          status: "Math",
        }}
        isMe={false}
        now={1_000}
        onOpenProfile={onOpenProfile}
        s={styles}
      />,
    );

    await fireEvent.press(getByText("Min"));

    expect(onOpenProfile).toHaveBeenCalledWith("member-1");
  });
});
