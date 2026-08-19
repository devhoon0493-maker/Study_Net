import { act, renderHook, waitFor } from "@testing-library/react-native";
import { onValue, ref } from "firebase/database";

import { useLiveStudyRooms } from "../../../features/community/useLiveStudyRooms";

describe("useLiveStudyRooms", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("subscribes to public live rooms and cleans up", async () => {
    const unsubscribe = jest.fn();
    jest.mocked(onValue).mockImplementation((roomsRef, callback) => {
      callback({
        val: () => ({
          private: {
            visibility: "private",
            members: { user: {} },
          },
          public: {
            visibility: "public",
            name: "Public Room",
            subjects: "Math",
            code: "ABC123",
            createdAt: 10,
            members: {
              visible: {},
              hidden: { studyStatusPublic: false },
            },
          },
        }),
      } as never);
      return unsubscribe;
    });

    const { result, unmount } = await renderHook(() => useLiveStudyRooms());

    await waitFor(() => {
      expect(result.current).toEqual([
        expect.objectContaining({
          id: "public",
          name: "Public Room",
          memberCount: 1,
        }),
      ]);
    });

    expect(ref).toHaveBeenCalledWith(expect.anything(), "rooms");

    await act(async () => {
      unmount();
    });
    expect(unsubscribe).toHaveBeenCalled();
  });

  it("uses an empty list when the rooms snapshot is empty", async () => {
    jest.mocked(onValue).mockImplementation((roomsRef, callback) => {
      callback({ val: () => null } as never);
      return jest.fn();
    });

    const { result } = await renderHook(() => useLiveStudyRooms());

    await waitFor(() => {
      expect(result.current).toEqual([]);
    });
  });
});
