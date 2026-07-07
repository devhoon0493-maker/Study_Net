import { Ionicons } from "@expo/vector-icons";
import { Image, Modal, Text, TouchableOpacity, View } from "react-native";

import type { MonoTheme } from "../../../constants/mono";
import type { CommunityStyles } from "../communityStyles";
import type { ProfilePreview } from "../communityTypes";
import { getInitial } from "../communityUtils";

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
            <Text style={s.profileModalTitle}>프로필</Text>
            <TouchableOpacity style={s.profileModalClose} onPress={onClose}>
              <Ionicons name="close" size={16} color={C.text} />
            </TouchableOpacity>
          </View>

          {profile ? (
            <>
              <View style={s.profileModalAvatar}>
                {profile.image ? (
                  <Image source={{ uri: profile.image }} style={s.profileModalAvatarImage} />
                ) : (
                  <Text style={s.profileModalAvatarText}>{getInitial(profile.name)}</Text>
                )}
              </View>
              <Text style={s.profileModalName}>{profile.name}</Text>
              {profile.userType ? (
                <View style={s.profileModalBadge}>
                  <Text style={s.profileModalBadgeText}>{profile.userType}</Text>
                </View>
              ) : null}
              <Text style={s.profileModalBio}>
                {profile.bio?.trim() || "아직 한줄 소개가 없어요."}
              </Text>
              <View style={s.profileModalStatsGrid}>
                <View style={s.profileModalStatBox}>
                  <Text style={s.profileModalStatValue}>{profile.postCount}</Text>
                  <Text style={s.profileModalStatLabel}>작성한 글</Text>
                </View>
                <View style={s.profileModalStatBox}>
                  <Text style={s.profileModalStatValue}>{profile.cheerCount}</Text>
                  <Text style={s.profileModalStatLabel}>받은 응원</Text>
                </View>
              </View>
            </>
          ) : null}
        </View>
      </View>
    </Modal>
  );
}
