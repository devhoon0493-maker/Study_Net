import { Ionicons } from "@expo/vector-icons";
import type { RefObject } from "react";
import {
  ActivityIndicator,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { CODE_LENGTH } from "../groupConstants";
import type { GroupStyles } from "../groupStyles";
import type { GroupTheme } from "../groupTheme";

export function QuickJoinCard({
  codeInput,
  codeError,
  codeNotice,
  joining,
  codeInputRef,
  onChangeCode,
  onJoin,
  s,
  C,
}: {
  codeInput: string;
  codeError: string;
  codeNotice: string;
  joining: boolean;
  codeInputRef: RefObject<TextInput | null>;
  onChangeCode: (value: string) => void;
  onJoin: () => void;
  s: GroupStyles;
  C: GroupTheme;
}) {
  return (
    <View style={s.quickJoinCard}>
      <Text style={s.quickJoinTitle}>초대 코드</Text>
      <View style={s.quickJoinInputRow}>
        <TextInput
          ref={codeInputRef}
          style={s.quickJoinInput}
          value={codeInput}
          onChangeText={onChangeCode}
          placeholder="A7K2Q9"
          placeholderTextColor={C.textTertiary}
          autoCapitalize="characters"
          autoCorrect={false}
          maxLength={CODE_LENGTH}
          selectionColor={C.purple}
          returnKeyType="join"
          onSubmitEditing={codeInput.length === CODE_LENGTH && !joining ? onJoin : undefined}
          accessibilityLabel="초대 코드 입력"
        />
        <TouchableOpacity
          style={[
            s.quickJoinButton,
            codeInput.length === CODE_LENGTH
              ? s.quickJoinButtonActive
              : s.quickJoinButtonDisabled,
          ]}
          disabled={codeInput.length < CODE_LENGTH || joining}
          onPress={onJoin}
          activeOpacity={0.84}
          accessibilityRole="button"
          accessibilityLabel="초대 코드로 그룹 입장"
        >
          {joining ? (
            <ActivityIndicator color={C.inverse} />
          ) : (
            <Text
              style={[
                s.quickJoinButtonText,
                codeInput.length < CODE_LENGTH && s.quickJoinButtonTextDisabled,
              ]}
            >
              입장
            </Text>
          )}
        </TouchableOpacity>
      </View>

      {codeError !== "" && (
        <View style={s.inlineErrorRow}>
          <Ionicons
            name="alert-circle-outline"
            size={13}
            color={C.danger}
            style={{ marginRight: 5 }}
          />
          <Text style={s.errorText}>{codeError}</Text>
        </View>
      )}
      {codeNotice !== "" && (
        <View style={s.inlineNoticeRow}>
          <Ionicons name="time-outline" size={13} color={C.primary} style={{ marginRight: 5 }} />
          <Text style={s.noticeText}>{codeNotice}</Text>
        </View>
      )}
    </View>
  );
}
