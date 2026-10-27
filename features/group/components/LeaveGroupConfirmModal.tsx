import { Ionicons } from "@expo/vector-icons";
import { Modal, ScrollView, Text, TouchableOpacity, View } from "react-native";

import type { GroupStyles } from "../groupStyles";
import type { GroupTheme } from "../groupTheme";
import type { Member } from "../groupTypes";

type LeaveGroupConfirmModalProps = {
  visible: boolean;
  isOwner: boolean;
  members: Member[];
  currentMemberId: string;
  selectedSuccessorId: string | null;
  leaving: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  onSelectSuccessor: (memberId: string) => void;
  onTransferAndLeave: () => void;
  onDeleteGroup: () => void;
  s: GroupStyles;
  C: GroupTheme;
};

export function LeaveGroupConfirmModal({
  visible,
  isOwner,
  members,
  currentMemberId,
  selectedSuccessorId,
  leaving,
  onCancel,
  onConfirm,
  onSelectSuccessor,
  onTransferAndLeave,
  onDeleteGroup,
  s,
  C,
}: LeaveGroupConfirmModalProps) {
  const candidates = members.filter((member) => member.id !== currentMemberId);

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
            {isOwner ? "그룹장을 넘기고 나가기" : "그룹에서 나갈까요?"}
          </Text>
          <Text style={s.confirmDesc}>
            {isOwner
              ? "다른 멤버에게 그룹장을 넘기면 그룹은 유지됩니다. 그룹을 삭제하면 그룹이 해체되고 모든 멤버가 방에서 나가게 됩니다."
              : "나가면 이 그룹의 멤버 목록에서 제거됩니다."}
          </Text>

          {isOwner ? (
            <>
              {candidates.length > 0 ? (
                <ScrollView style={{ width: "100%", maxHeight: 220 }}>
                  {candidates.map((member) => {
                    const selected = selectedSuccessorId === member.id;
                    return (
                      <TouchableOpacity
                        key={member.id}
                        accessibilityRole="radio"
                        accessibilityState={{ selected }}
                        onPress={() => onSelectSuccessor(member.id)}
                        activeOpacity={0.8}
                        style={{
                          width: "100%",
                          padding: 12,
                          marginTop: 8,
                          borderWidth: 1,
                          borderColor: selected ? C.primary : C.border,
                          borderRadius: 10,
                          backgroundColor: selected ? C.primarySoft : C.surface,
                        }}
                      >
                        <Text style={{ color: C.textPrimary, fontWeight: "600" }}>
                          {member.name}
                        </Text>
                        {member.userType ? (
                          <Text style={{ color: C.textSecondary, marginTop: 3 }}>
                            {member.userType}
                          </Text>
                        ) : null}
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              ) : (
                <Text style={[s.confirmDesc, { marginTop: 0 }]}>
                  넘길 멤버가 없어요. 그룹을 삭제하면 그룹이 해체되고 모든 멤버가 방에서 나가게 됩니다.
                </Text>
              )}
              <View style={[s.confirmActions, { marginTop: 18 }]}>
                <TouchableOpacity
                  style={s.confirmCancelBtn}
                  onPress={onCancel}
                  disabled={leaving}
                  activeOpacity={0.8}
                >
                  <Text style={s.confirmCancelText}>취소</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[s.confirmLeaveBtn, !selectedSuccessorId && { opacity: 0.45 }]}
                  onPress={onTransferAndLeave}
                  disabled={!selectedSuccessorId || leaving}
                  activeOpacity={0.8}
                >
                  <Text style={s.confirmLeaveText}>
                    {leaving ? "처리 중..." : "양도 후 나가기"}
                  </Text>
                </TouchableOpacity>
              </View>
              <TouchableOpacity
                style={[s.confirmLeaveBtn, { width: "100%", flex: 0, marginTop: 10 }]}
                onPress={onDeleteGroup}
                disabled={leaving}
                activeOpacity={0.8}
              >
                <Text style={[s.confirmLeaveText, { color: C.danger }]}>
                  {leaving ? "처리 중..." : "그룹 해체 및 나가기"}
                </Text>
              </TouchableOpacity>
            </>
          ) : (
            <View style={s.confirmActions}>
              <TouchableOpacity
                style={s.confirmCancelBtn}
                onPress={onCancel}
                disabled={leaving}
                activeOpacity={0.8}
              >
                <Text style={s.confirmCancelText}>취소</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={s.confirmLeaveBtn}
                onPress={onConfirm}
                disabled={leaving}
                activeOpacity={0.8}
              >
                <Text style={s.confirmLeaveText}>
                  {leaving ? "처리 중..." : "나가기"}
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}
