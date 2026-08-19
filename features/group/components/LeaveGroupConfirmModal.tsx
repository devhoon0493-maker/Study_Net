import { Ionicons } from "@expo/vector-icons";
import { Modal, Text, TouchableOpacity, View } from "react-native";

import type { GroupStyles } from "../groupStyles";
import type { GroupTheme } from "../groupTheme";

type LeaveGroupConfirmModalProps = {
  visible: boolean;
  isOwner: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  s: GroupStyles;
  C: GroupTheme;
};

export function LeaveGroupConfirmModal({
  visible,
  isOwner,
  onCancel,
  onConfirm,
  s,
  C,
}: LeaveGroupConfirmModalProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
    >
      <View style={s.confirmOverlay}>
        <View style={s.confirmCard}>
          <View style={s.confirmIcon}>
            <Ionicons
              name={isOwner ? "warning-outline" : "log-out-outline"}
              size={22}
              color={isOwner ? C.danger : C.cafe}
            />
          </View>
          <Text style={s.confirmTitle}>
            {isOwner ? "그룹을 종료할까요?" : "그룹에서 나갈까요?"}
          </Text>
          <Text style={s.confirmDesc}>
            {isOwner
              ? "방장이 나가면 이 그룹과 입장 코드가 삭제되고, 참여자도 로비로 돌아가요."
              : "현재 그룹에서 나가도 나중에 입장 코드로 다시 들어올 수 있어요."}
          </Text>
          <View style={s.confirmActions}>
            <TouchableOpacity
              style={s.confirmCancelBtn}
              onPress={onCancel}
              activeOpacity={0.8}
            >
              <Text style={s.confirmCancelText}>취소</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[s.confirmLeaveBtn, isOwner && s.confirmLeaveDangerBtn]}
              onPress={onConfirm}
              activeOpacity={0.8}
            >
              <Text style={s.confirmLeaveText}>
                {isOwner ? "종료하기" : "나가기"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}
