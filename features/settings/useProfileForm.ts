import { manipulateAsync, SaveFormat } from "expo-image-manipulator";
import * as ImagePicker from "expo-image-picker";
import { updateProfile } from "firebase/auth";
import { ref, update } from "firebase/database";
import { useCallback, useEffect, useRef, useState } from "react";
import { Alert } from "react-native";

import { auth, db } from "../../utils/firebaseConfig";
import { syncCurrentMemberToJoinedRooms } from "../group/groupPresence";
import { publicProfileUpdate } from "../../utils/publicProfile";
import {
  loadStoredUserProfile,
  saveStoredUserProfile,
} from "../../utils/userProfileStorage";

export const USER_TYPE_OPTIONS = [
  "초등학생",
  "중학생",
  "고등학생",
  "대학생",
  "취준생",
  "직장인",
];

const isRemoteImageUri = (uri: string | null) =>
  !!uri && (uri.startsWith("http://") || uri.startsWith("https://"));

const isEmbeddedImageUri = (uri: string | null) =>
  !!uri && uri.startsWith("data:image/");

const PROFILE_IMAGE_MAX_DATA_URL_LENGTH = 700_000;

const normalizeProfileImage = async (uri: string) => {
  if (isRemoteImageUri(uri)) return uri;
  if (isEmbeddedImageUri(uri)) {
    if (uri.length > PROFILE_IMAGE_MAX_DATA_URL_LENGTH) {
      throw new Error("profile-image-too-large");
    }
    return uri;
  }

  const resized = await manipulateAsync(
    uri,
    [{ resize: { width: 256, height: 256 } }],
    { compress: 0.7, format: SaveFormat.JPEG, base64: true },
  );
  const imageData = resized.base64
    ? `data:image/jpeg;base64,${resized.base64}`
    : null;
  if (!imageData) throw new Error("profile-image-processing-failed");
  if (imageData.length > PROFILE_IMAGE_MAX_DATA_URL_LENGTH) {
    throw new Error("profile-image-too-large");
  }
  return imageData;
};

type ProfileDraft = {
  name: string;
  email: string;
  image: string | null;
  userType: string;
};

type UseProfileFormParams = {
  onSaved?: () => void;
};

type ProfileSaveState = "saved" | "editing" | "saving" | "error";

const profileDraftKey = (draft: ProfileDraft) =>
  JSON.stringify([
    draft.name.trim(),
    draft.email.trim(),
    draft.image,
    draft.userType,
  ]);

export function useProfileForm({ onSaved }: UseProfileFormParams = {}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [image, setImage] = useState<string | null>(null);
  const [userType, setUserType] = useState("");
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [saveState, setSaveState] = useState<ProfileSaveState>("saved");
  const lastSavedDraftKeyRef = useRef("");
  const latestDraftRef = useRef<ProfileDraft | null>(null);
  const saveQueueRef = useRef<Promise<void>>(Promise.resolve());

  useEffect(() => {
    const loadProfile = async () => {
      const parsed = await loadStoredUserProfile();
      const draft: ProfileDraft = {
        name: parsed?.name || "",
        email: parsed?.email || "",
        image: parsed?.image || null,
        userType: parsed?.userType || "",
      };
      if (parsed) {
        setName(draft.name);
        setEmail(draft.email);
        setImage(draft.image);
        setUserType(draft.userType);
      }
      lastSavedDraftKeyRef.current = profileDraftKey(draft);
      latestDraftRef.current = draft;
      setProfileLoaded(true);
    };

    loadProfile();
  }, []);

  const saveDraft = useCallback((draft: ProfileDraft, onComplete?: () => void) => {
    const snapshot = { ...draft };
    const snapshotKey = profileDraftKey(snapshot);
    if (
      !snapshot.name.trim() ||
      !snapshot.email.trim() ||
      snapshot.name.trim().length > 40 ||
      snapshot.email.trim().length > 120
    ) {
      return Promise.resolve();
    }

    setSaveState("saving");
    saveQueueRef.current = saveQueueRef.current
      .catch(() => {})
      .then(async () => {
        if (snapshotKey === lastSavedDraftKeyRef.current) {
          if (
            latestDraftRef.current &&
            profileDraftKey(latestDraftRef.current) === snapshotKey
          ) {
            setSaveState("saved");
          }
          onComplete?.();
          return;
        }

        try {
          const previousProfile = (await loadStoredUserProfile()) ?? {};
          const currentUser = auth.currentUser;
          const uid = currentUser?.uid || previousProfile.uid;
          if (!uid) throw new Error("login-required");

          const nextImage = snapshot.image
            ? await normalizeProfileImage(snapshot.image)
            : null;
          const profile = {
            ...previousProfile,
            uid,
            name: snapshot.name.trim(),
            email: snapshot.email.trim(),
            image: nextImage,
            userType: snapshot.userType,
            updatedAt: Date.now(),
          };

          await update(ref(db), {
            [`users/${uid}`]: profile,
            ...publicProfileUpdate(uid, profile),
          });

          await saveStoredUserProfile(profile).catch((error) => {
            console.warn("Local profile cache update failed:", error);
          });
          if (currentUser) {
            await updateProfile(currentUser, {
              displayName: profile.name,
              photoURL: isRemoteImageUri(nextImage) ? nextImage : null,
            }).catch((error) => {
              console.warn("Firebase Auth profile cache update failed:", error);
            });
          }
          await syncCurrentMemberToJoinedRooms().catch((error) => {
            console.warn("Group member profile sync failed:", error);
          });
          const savedDraft = { ...snapshot, image: nextImage };
          lastSavedDraftKeyRef.current = profileDraftKey(savedDraft);
          const isStillLatest =
            latestDraftRef.current !== null &&
            profileDraftKey(latestDraftRef.current) === snapshotKey;
          if (isStillLatest) {
            latestDraftRef.current = savedDraft;
            if (snapshot.image !== nextImage) setImage(nextImage);
            setSaveState("saved");
          } else {
            setSaveState("editing");
          }
          onComplete?.();
        } catch (error) {
          console.error("Profile save failed:", error);
          if (error instanceof Error && error.message === "profile-image-too-large") {
            Alert.alert(
              "사진을 저장할 수 없어요",
              "사진 크기를 줄여 다시 선택해 주세요.",
            );
          }
          setSaveState("error");
        }
      });

    return saveQueueRef.current;
  }, []);

  useEffect(() => {
    if (!profileLoaded) return;

    const draft = { name, email, image, userType };
    const draftKey = profileDraftKey(draft);
    latestDraftRef.current = draft;
    if (draftKey === lastSavedDraftKeyRef.current) return;

    setSaveState("editing");
  }, [email, image, name, profileLoaded, userType]);

  const handleSave = async () => {
    if (!name.trim() || !email.trim()) {
      Alert.alert("입력 오류", "이름과 이메일을 입력해주세요.");
      return;
    }
    latestDraftRef.current = { name, email, image, userType };
    await saveDraft({ name, email, image, userType }, onSaved);
  };

  const pickImage = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(
        "권한 필요",
        "프로필 사진을 선택하려면 사진 보관함 권한이 필요합니다.",
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });

    if (!result.canceled) {
      const asset = result.assets[0];
      setImage(asset.uri);
    }
  };

  return {
    name,
    setName,
    email,
    setEmail,
    image,
    userType,
    setUserType,
    pickImage,
    handleSave,
    saveState,
  };
}

