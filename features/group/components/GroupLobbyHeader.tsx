import { Text, View } from "react-native";

import type { GroupStyles } from "../groupStyles";

export function GroupLobbyHeader({ s }: { s: GroupStyles }) {
  return (
    <View style={s.lobbyHeaderBlock}>
      <View style={s.lobbyHeaderTextWrap}>
        <Text style={s.lobbyHeaderTitle}>그룹 스터디</Text>
        <Text style={s.lobbyHeaderDesc}>
          혼자 하기 어려운 공부, 지금 같이 시작해요.
        </Text>
      </View>
    </View>
  );
}
