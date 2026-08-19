import { Ionicons } from "@expo/vector-icons";
import { Image, Modal, Text, TouchableOpacity, View } from "react-native";

import type { MonoTheme } from "../../../constants/mono";
import type { CommunityStyles } from "../communityStyles";
import type { ProfilePreview } from "../communityTypes";
import { getInitial } from "../communityUtils";

const formatCount = (value: number) => {
  if (value >= 10000) return `${(value / 10000).toFixed(1)}만`;
  if (value >= 1000) return `${(value / 1000).toFixed(1)}천`;
  return String(value);
};

export function ProfilePreviewModal({
  profile,
  s,
  C,
  onClose,
}: {
  profile: ProfilePreview | null;
  s: CommunityStyles;
  C: MonoTheme;
  onClose: () => void;
}) {
  const showActivity = profile?.communityActivityPublic === true;

  return (
    <Modal
      visible={!!profile}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={s.profileModalBackdrop}>
        <View style={s.profileModalCard}>
          <View style={s.profileModalHeader}>
            <View>
              <Text style={s.profileModalEyebrow}>PUBLIC PROFILE</Text>
              <Text style={s.profileModalTitle}>프로필</Text>
            </View>
            <TouchableOpacity
              style={s.profileModalClose}
              onPress={onClose}
              activeOpacity={0.75}
            >
              <Ionicons name="close" size={16} color={C.text} />
            </TouchableOpacity>
          </View>

          {profile ? (
            <>
              <View style={s.profileModalHero}>
                <View style={s.profileModalAvatar}>
                  {profile.image ? (
                    <Image
                      source={{ uri: profile.image }}
                      style={s.profileModalAvatarImage}
                    />
                  ) : (
                    <Text style={s.profileModalAvatarText}>
                      {getInitial(profile.name)}
                    </Text>
                  )}
                </View>

                <View style={s.profileModalIdentity}>
                  <Text style={s.profileModalName} numberOfLines={1}>
                    {profile.name}
                  </Text>
                  <View style={s.profileModalBadge}>
                    <Ionicons
                      name="person-outline"
                      size={12}
                      color={C.muted}
                    />
                    <Text style={s.profileModalBadgeText} numberOfLines={1}>
                      {profile.userType || "유형 미설정"}
                    </Text>
                  </View>
                </View>
              </View>

              <View style={s.profileModalStatsGrid}>
                <View style={s.profileModalStatBox}>
                  <Ionicons
                    name={showActivity ? "document-text-outline" : "lock-closed-outline"}
                    size={16}
                    color={C.muted}
                  />
                  <Text style={s.profileModalStatValue}>
                    {showActivity ? formatCount(profile.postCount) : "비공개"}
                  </Text>
                  <Text style={s.profileModalStatLabel}>작성한 글</Text>
                </View>
                <View style={s.profileModalStatBox}>
                  <Ionicons
                    name={showActivity ? "heart-outline" : "lock-closed-outline"}
                    size={16}
                    color={C.muted}
                  />
                  <Text style={s.profileModalStatValue}>
                    {showActivity ? formatCount(profile.cheerCount) : "비공개"}
                  </Text>
                  <Text style={s.profileModalStatLabel}>받은 응원</Text>
                </View>
              </View>

              <View style={s.profileModalInfoBlock}>
                <View style={s.profileModalInfoTitleRow}>
                  <Ionicons name="chatbox-outline" size={16} color={C.subtle} />
                  <Text style={s.profileModalInfoTitle}>한줄소개</Text>
                </View>
                <Text style={s.profileModalBio}>
                  {profile.bio?.trim() || "아직 한줄소개가 없어요."}
                </Text>
              </View>
            </>
          ) : null}
        </View>
      </View>
    </Modal>
  );
}
