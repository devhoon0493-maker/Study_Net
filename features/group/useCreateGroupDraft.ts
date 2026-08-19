import { useCallback, useMemo, useRef, useState } from "react";
import { PanResponder, type LayoutChangeEvent } from "react-native";

import {
  DEFAULT_GROUP_MEMBERS,
  MAX_GROUP_MEMBERS,
  MIN_GROUP_MEMBERS,
} from "./groupConstants";
import type { RoomVisibility } from "./groupTypes";
import { getMemberSliderRatio } from "./groupUtils";

export function useCreateGroupDraft() {
  const memberSliderPageX = useRef(0);
  const [roomName, setRoomName] = useState("");
  const [roomSubjects, setRoomSubjects] = useState("");
  const [roomMax, setRoomMax] = useState(DEFAULT_GROUP_MEMBERS);
  const [memberSliderWidth, setMemberSliderWidth] = useState(0);
  const [memberSliderRatio, setMemberSliderRatio] = useState(
    getMemberSliderRatio(DEFAULT_GROUP_MEMBERS),
  );
  const [roomVisibility, setRoomVisibility] =
    useState<RoomVisibility>("public");

  const resetDraft = useCallback(() => {
    setRoomName("");
    setRoomSubjects("");
    setRoomMax(DEFAULT_GROUP_MEMBERS);
    setMemberSliderRatio(getMemberSliderRatio(DEFAULT_GROUP_MEMBERS));
    setRoomVisibility("public");
  }, []);

  const updateRoomMaxFromSlider = useCallback(
    (x: number) => {
      if (memberSliderWidth <= 0) return;

      const ratio = Math.max(0, Math.min(1, x / memberSliderWidth));
      setMemberSliderRatio(ratio);
      const next = Math.round(
        MIN_GROUP_MEMBERS + ratio * (MAX_GROUP_MEMBERS - MIN_GROUP_MEMBERS),
      );
      setRoomMax(next);
    },
    [memberSliderWidth],
  );

  const memberSliderPanResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: (event) => {
          memberSliderPageX.current =
            event.nativeEvent.pageX - event.nativeEvent.locationX;
          updateRoomMaxFromSlider(event.nativeEvent.locationX);
        },
        onPanResponderMove: (_event, gestureState) => {
          updateRoomMaxFromSlider(
            gestureState.moveX - memberSliderPageX.current,
          );
        },
      }),
    [updateRoomMaxFromSlider],
  );

  const onSliderLayout = useCallback((event: LayoutChangeEvent) => {
    setMemberSliderWidth(event.nativeEvent.layout.width);
  }, []);

  return {
    roomName,
    setRoomName,
    roomSubjects,
    setRoomSubjects,
    roomMax,
    roomVisibility,
    setRoomVisibility,
    memberSliderPercent: memberSliderRatio * 100,
    memberSliderPanHandlers: memberSliderPanResponder.panHandlers,
    onSliderLayout,
    resetDraft,
  };
}
