import { Ionicons } from "@expo/vector-icons";
import type { GestureResponderHandlers, LayoutChangeEvent } from "react-native";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import {
  MAX_GROUP_MEMBERS,
  MIN_GROUP_MEMBERS,
  VISIBILITY_OPTIONS,
} from "../groupConstants";
import type { GroupStyles } from "../groupStyles";
import type { GroupTheme } from "../groupTheme";
import type { RoomVisibility } from "../groupTypes";

type CreateGroupModalProps = {
  visible: boolean;
  onClose: () => void;
  roomVisibility: RoomVisibility;
  onChangeVisibility: (value: RoomVisibility) => void;
  roomName: string;
  onChangeRoomName: (value: string) => void;
  roomSubjects: string;
  onChangeRoomSubjects: (value: string) => void;
  roomMax: number;
  memberSliderPercent: number;
  onSliderLayout: (event: LayoutChangeEvent) => void;
  memberSliderPanHandlers: GestureResponderHandlers;
  creating: boolean;
  onCreate: () => void;
  s: GroupStyles;
  C: GroupTheme;
};

export function CreateGroupModal({
  visible,
  onClose,
  roomVisibility,
  onChangeVisibility,
  roomName,
  onChangeRoomName,
  roomSubjects,
  onChangeRoomSubjects,
  roomMax,
  memberSliderPercent,
  onSliderLayout,
  memberSliderPanHandlers,
  creating,
  onCreate,
  s,
  C,
}: CreateGroupModalProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={s.modalOverlay}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <View style={s.modalCard}>
          <View style={s.sheetHandle} />
          <View style={s.modalHeader}>
            <View style={s.modalIconWrap}>
              <Ionicons name="people-outline" size={20} color={C.primary} />
            </View>
            <TouchableOpacity style={s.modalCloseBtn} onPress={onClose}>
              <Ionicons name="close" size={15} color={C.textTertiary} />
            </TouchableOpacity>
          </View>

          <Text style={s.modalTitle}>새 그룹</Text>
          <Text style={s.modalSubtitle}>
            방을 만들면 친구에게 공유할 입장 코드가 생성돼요. 그룹 안에서
            실시간 공부 상태를 함께 볼 수 있어요.
          </Text>
          <View>
            <Text style={s.fieldLabel}>공개 설정</Text>
            <View style={s.visibilityRow}>
              {VISIBILITY_OPTIONS.map((option) => {
                const active = option.value === roomVisibility;
                return (
                  <TouchableOpacity
                    key={option.value}
                    style={[
                      s.visibilityOption,
                      active && s.visibilityOptionActive,
                    ]}
                    onPress={() => onChangeVisibility(option.value)}
                    activeOpacity={0.8}
                  >
                    <View style={s.visibilityTitleRow}>
                      <View
                        style={[
                          s.visibilityIconBox,
                          active && s.visibilityIconBoxActive,
                        ]}
                      >
                        <Ionicons
                          name={
                            option.value === "public"
                              ? "earth-outline"
                              : "lock-closed-outline"
                          }
                          size={15}
                          color={active ? C.inverse : C.textPrimary}
                        />
                      </View>
                      <Text
                        style={[
                          s.visibilityLabel,
                          active && s.visibilityLabelActive,
                        ]}
                      >
                        {option.label}
                      </Text>
                    </View>
                    <Text style={s.visibilityDesc}>{option.description}</Text>
                    <View
                      style={[
                        s.visibilityCheck,
                        active && s.visibilityCheckActive,
                      ]}
                    >
                      {active && (
                        <Ionicons name="checkmark" size={13} color={C.inverse} />
                      )}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
          <TextInput
            style={s.formInput}
            value={roomName}
            onChangeText={onChangeRoomName}
            placeholder="방 이름"
            placeholderTextColor={C.textTertiary}
          />
          <TextInput
            style={s.formInput}
            value={roomSubjects}
            onChangeText={onChangeRoomSubjects}
            placeholder="과목 예: 수학 · 영어"
            placeholderTextColor={C.textTertiary}
          />
          <View>
            <Text style={s.fieldLabel}>최대 인원</Text>
            <View style={s.memberSliderBox}>
              <View style={s.memberSliderHeader}>
                <View>
                  <Text style={s.memberSliderTitle}>그룹 정원</Text>
                  <Text style={s.memberSliderSub}>
                    2명부터 20명까지 설정할 수 있어요.
                  </Text>
                </View>
                <View style={s.memberSliderValueWrap}>
                  <Text style={s.memberSliderValue}>{roomMax}</Text>
                  <Text style={s.memberSliderUnit}>명</Text>
                </View>
              </View>
              <View
                style={s.memberSliderTrackWrap}
                onLayout={onSliderLayout}
                {...memberSliderPanHandlers}
              >
                <View style={s.memberSliderTrack}>
                  <View
                    style={[
                      s.memberSliderFill,
                      { width: `${memberSliderPercent}%` },
                    ]}
                  />
                </View>
                <View
                  style={[
                    s.memberSliderThumb,
                    { left: `${memberSliderPercent}%` },
                  ]}
                />
              </View>
              <View style={s.memberSliderRange}>
                <Text style={s.memberSliderRangeText}>
                  {MIN_GROUP_MEMBERS}명
                </Text>
                <Text style={s.memberSliderRangeText}>
                  {MAX_GROUP_MEMBERS}명
                </Text>
              </View>
            </View>
          </View>
          <TouchableOpacity
            style={[
              s.enterBtn,
              roomName.trim().length < 2 && { opacity: 0.45 },
            ]}
            disabled={roomName.trim().length < 2 || creating}
            onPress={onCreate}
            activeOpacity={0.8}
          >
            {creating ? (
              <ActivityIndicator color={C.inverse} />
            ) : (
              <Text style={s.enterBtnText}>만들고 입장하기</Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
