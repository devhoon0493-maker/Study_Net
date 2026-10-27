import { Ionicons } from "@expo/vector-icons";
import { Alert, Text, TouchableOpacity, View } from "react-native";

import type { GroupStyles } from "../groupStyles";
import type { GroupTheme } from "../groupTheme";
import type { RoomJoinRequest } from "../useRoomJoinRequests";

type Props = {
  requests: RoomJoinRequest[];
  canReview: boolean;
  onReview: (request: RoomJoinRequest, approve: boolean) => void;
  s: GroupStyles;
  C: GroupTheme;
};

export function GroupJoinRequestsCard({ requests, canReview, onReview, s, C }: Props) {
  if (!canReview) return null;

  const confirm = (request: RoomJoinRequest, approve: boolean) => {
    Alert.alert(
      approve ? "가입 신청 승인" : "가입 신청 거절",
      `${request.name}님의 신청을 ${approve ? "승인" : "거절"}할까요?`,
      [
        { text: "취소", style: "cancel" },
        {
          text: approve ? "승인" : "거절",
          style: approve ? "default" : "destructive",
          onPress: () => onReview(request, approve),
        },
      ],
    );
  };

  return (
    <View style={s.joinRequestsCard}>
      <View style={s.announcementHeader}>
        <View style={s.announcementTitleRow}>
          <Ionicons name="person-add-outline" size={17} color={C.primary} />
          <Text style={s.announcementTitle}>가입 승인 대기</Text>
        </View>
        <Text style={s.announcementMeta}>{requests.length}명</Text>
      </View>
      {requests.length === 0 ? (
        <Text style={s.announcementMeta}>대기 중인 가입 신청이 없어요.</Text>
      ) : (
        requests.map((request) => (
          <View key={request.applicantId} style={s.joinRequestRow}>
            <View style={s.joinRequestInfo}>
              <Text style={s.deputyName}>{request.name}</Text>
              <Text style={s.announcementMeta}>
                {request.bio || request.userType || "그룹 가입 신청"}
              </Text>
            </View>
            <TouchableOpacity
              style={s.joinRejectButton}
              onPress={() => confirm(request, false)}
              accessibilityRole="button"
            >
              <Text style={s.joinRejectText}>거절</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={s.joinApproveButton}
              onPress={() => confirm(request, true)}
              accessibilityRole="button"
            >
              <Text style={s.joinApproveText}>승인</Text>
            </TouchableOpacity>
          </View>
        ))
      )}
    </View>
  );
}
