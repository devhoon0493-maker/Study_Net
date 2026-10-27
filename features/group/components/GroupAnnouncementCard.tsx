import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import { Alert, Text, TextInput, TouchableOpacity, View } from "react-native";

import type { GroupStyles } from "../groupStyles";
import type { GroupTheme } from "../groupTheme";
import {
  saveGroupAnnouncement,
  type GroupAnnouncement,
} from "../useGroupAnnouncement";

type Props = {
  roomId: string;
  ownerId: string;
  deputy1Id?: string;
  deputy2Id?: string;
  currentMemberId?: string;
  memberName: string;
  announcement: GroupAnnouncement | null;
  s: GroupStyles;
  C: GroupTheme;
};

export function GroupAnnouncementCard({
  roomId,
  ownerId,
  deputy1Id,
  deputy2Id,
  currentMemberId,
  memberName,
  announcement,
  s,
  C,
}: Props) {
  const canManage = Boolean(
    currentMemberId &&
      (currentMemberId === ownerId || currentMemberId === deputy1Id || currentMemberId === deputy2Id),
  );
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(announcement?.text ?? "");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!editing) setText(announcement?.text ?? "");
  }, [announcement, editing]);

  const save = async () => {
    const trimmed = text.trim();
    if (!trimmed || !currentMemberId || saving) return;
    try {
      setSaving(true);
      await saveGroupAnnouncement(roomId, {
        text: trimmed.slice(0, 300),
        authorId: currentMemberId,
        authorName: memberName.slice(0, 40),
        updatedAt: Date.now(),
      });
      setEditing(false);
    } catch {
      Alert.alert("공지 저장 실패", "그룹 공지를 저장하지 못했어요. 권한 규칙을 확인해 주세요.");
    } finally {
      setSaving(false);
    }
  };

  const remove = () => {
    Alert.alert("공지 삭제", "그룹 공지를 삭제할까요?", [
      { text: "취소", style: "cancel" },
      {
        text: "삭제",
        style: "destructive",
        onPress: async () => {
          try {
            await saveGroupAnnouncement(roomId, null);
          } catch {
            Alert.alert("공지 삭제 실패", "그룹 공지를 삭제하지 못했어요.");
          }
        },
      },
    ]);
  };

  return (
    <View style={s.announcementCard}>
      <View style={s.announcementHeader}>
        <View style={s.announcementTitleRow}>
          <Ionicons name="megaphone-outline" size={17} color={C.primary} />
          <Text style={s.announcementTitle}>그룹 공지</Text>
        </View>
        {canManage && !editing ? (
          <TouchableOpacity onPress={() => setEditing(true)} accessibilityRole="button">
            <Text style={s.announcementAction}>{announcement ? "수정" : "작성"}</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      {editing ? (
        <>
          <TextInput
            value={text}
            onChangeText={(value) => setText(value.slice(0, 300))}
            placeholder="그룹원에게 전할 공지를 적어주세요"
            placeholderTextColor={C.textTertiary}
            multiline
            maxLength={300}
            style={s.announcementInput}
            textAlignVertical="top"
          />
          <View style={s.announcementFooter}>
            <Text style={s.announcementMeta}>{text.length}/300</Text>
            <View style={s.announcementButtons}>
              <TouchableOpacity onPress={() => setEditing(false)} disabled={saving}>
                <Text style={s.announcementAction}>취소</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={save} disabled={saving || !text.trim()}>
                <Text style={s.announcementAction}>{saving ? "저장 중…" : "저장"}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </>
      ) : announcement ? (
        <>
          <Text style={s.announcementText}>{announcement.text}</Text>
          <View style={s.announcementFooter}>
            <Text style={s.announcementMeta}>
              {announcement.authorName} · {new Date(announcement.updatedAt).toLocaleDateString()}
            </Text>
            {canManage ? (
              <TouchableOpacity onPress={remove}>
                <Text style={s.announcementAction}>삭제</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        </>
      ) : (
        <Text style={s.announcementMeta}>아직 등록된 공지가 없어요.</Text>
      )}
    </View>
  );
}
