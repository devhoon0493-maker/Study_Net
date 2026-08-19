import { useEffect, useState } from "react";
import { Alert } from "react-native";
import { ref, update } from "firebase/database";

import { auth, db } from "../../utils/firebaseConfig";
import { publicProfileUpdate } from "../../utils/publicProfile";
import {
  loadStoredUserProfile,
  saveStoredUserProfile,
  type StoredUserProfile,
} from "../../utils/userProfileStorage";

export const PUBLIC_PROFILE_BIO_MAX_LENGTH = 60;

type UsePublicProfileFormParams = {
  onSaved: () => void;
};

export function usePublicProfileForm({ onSaved }: UsePublicProfileFormParams) {
  const [profile, setProfile] = useState<StoredUserProfile>({});
  const [bio, setBio] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const loadProfile = async () => {
      const parsed = (await loadStoredUserProfile()) ?? {};
      setProfile(parsed);
      setBio(parsed.bio || "");
    };

    loadProfile();
  }, []);

  const updateBio = (value: string) => {
    setBio(value.slice(0, PUBLIC_PROFILE_BIO_MAX_LENGTH));
  };

  const savePublicProfile = async () => {
    if (saving) return;

    const trimmedBio = bio.trim();
    if (trimmedBio.length > PUBLIC_PROFILE_BIO_MAX_LENGTH) {
      Alert.alert(
        "글자 수 확인",
        `한줄 소개는 ${PUBLIC_PROFILE_BIO_MAX_LENGTH}자 이내로 입력해주세요.`,
      );
      return;
    }

    try {
      setSaving(true);
      const currentUser = auth.currentUser;
      const uid = currentUser?.uid || profile.uid;
      const nextProfile = {
        ...profile,
        uid,
        bio: trimmedBio,
        updatedAt: Date.now(),
      };

      await saveStoredUserProfile(nextProfile);

      if (uid) {
        await update(ref(db), {
          [`users/${uid}/bio`]: trimmedBio,
          [`users/${uid}/updatedAt`]: nextProfile.updatedAt,
          ...publicProfileUpdate(uid, nextProfile),
        });
      }

      onSaved();
    } catch {
      Alert.alert("저장 실패", "공개 프로필을 저장하지 못했어요.");
    } finally {
      setSaving(false);
    }
  };

  return {
    profile,
    bio,
    saving,
    updateBio,
    savePublicProfile,
  };
}
