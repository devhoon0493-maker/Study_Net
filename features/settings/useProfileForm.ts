import * as FileSystem from "expo-file-system/legacy";
import * as ImagePicker from "expo-image-picker";
import { updateProfile } from "firebase/auth";
import { ref, update } from "firebase/database";
import {
  deleteObject,
  getDownloadURL,
  ref as storageRef,
  uploadString,
} from "firebase/storage";
import { useEffect, useState } from "react";
import { Alert } from "react-native";

import { auth, db, storage } from "../../utils/firebaseConfig";
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

const toEmbeddedImageUri = (base64: string) => `data:image/jpeg;base64,${base64}`;

const normalizeProfileImage = async (uri: string) => {
  if (isRemoteImageUri(uri) || isEmbeddedImageUri(uri)) return uri;

  const base64 = await FileSystem.readAsStringAsync(uri, {
    encoding: FileSystem.EncodingType.Base64,
  });

  return toEmbeddedImageUri(base64);
};

const getProfileImagePath = (uid: string) => `profileImages/${uid}/avatar.jpg`;

const uploadProfileImage = async (uid: string, uri: string | null) => {
  if (!uri || isRemoteImageUri(uri)) return uri;

  const imageData = await normalizeProfileImage(uri);
  const imageRef = storageRef(storage, getProfileImagePath(uid));
  await uploadString(imageRef, imageData, "data_url", {
    contentType: "image/jpeg",
    customMetadata: { owner: uid },
  });

  return getDownloadURL(imageRef);
};

const deleteProfileImage = async (uid: string) => {
  await deleteObject(storageRef(storage, getProfileImagePath(uid)));
};

type UseProfileFormParams = {
  onSaved: () => void;
};

export function useProfileForm({ onSaved }: UseProfileFormParams) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [image, setImage] = useState<string | null>(null);
  const [userType, setUserType] = useState("");

  useEffect(() => {
    const loadProfile = async () => {
      const parsed = await loadStoredUserProfile();
      if (parsed) {
        setName(parsed.name || "");
        setEmail(parsed.email || "");
        setImage(parsed.image || null);
        setUserType(parsed.userType || "");
      }
    };

    loadProfile();
  }, []);

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
      base64: true,
      quality: 0.35,
    });

    if (!result.canceled) {
      const asset = result.assets[0];
      setImage(asset.base64 ? toEmbeddedImageUri(asset.base64) : asset.uri);
    }
  };

  const handleSave = async () => {
    if (!name || !email) {
      Alert.alert("입력 오류", "이름과 이메일을 입력해주세요.");
      return;
    }

    try {
      const previousProfile = (await loadStoredUserProfile()) ?? {};
      const currentUser = auth.currentUser;
      const uid = currentUser?.uid || previousProfile.uid;
      if (!uid) throw new Error("login-required");

      const previousImage =
        typeof previousProfile.image === "string" ? previousProfile.image : null;
      const nextImage = image
        ? await uploadProfileImage(uid, image)
        : null;
      if (!nextImage && previousImage && isRemoteImageUri(previousImage)) {
        await deleteProfileImage(uid).catch(() => {});
      }

      const profile = {
        ...previousProfile,
        uid,
        name: name.trim(),
        email: email.trim(),
        image: nextImage,
        userType,
        updatedAt: Date.now(),
      };

      await saveStoredUserProfile(profile);

      if (currentUser) {
        await updateProfile(currentUser, {
          displayName: profile.name,
          photoURL: nextImage,
        });
      }

      await update(ref(db), {
        [`users/${uid}`]: profile,
        ...publicProfileUpdate(uid, profile),
      });

      onSaved();
    } catch (error) {
      Alert.alert("저장 실패", getProfileSaveErrorMessage(error));
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
  };
}

const getProfileSaveErrorMessage = (error: unknown) => {
  const code =
    typeof error === "object" && error && "code" in error
      ? String(error.code)
      : "";
  const message = error instanceof Error ? error.message : "";

  if (message === "login-required") {
    return "로그인 정보가 없어 프로필 사진을 업로드할 수 없어요. 다시 로그인한 뒤 시도해주세요.";
  }

  if (message === "image-read-failed") {
    return "선택한 사진을 불러오지 못했어요. 다른 사진으로 다시 시도해주세요.";
  }

  if (code === "storage/unauthorized") {
    return "Firebase Storage 업로드 권한이 막혀 있어요. Storage 보안 규칙을 확인해야 합니다.";
  }

  if (code === "storage/canceled") {
    return "프로필 사진 업로드가 취소됐어요.";
  }

  if (code === "storage/retry-limit-exceeded" || code === "storage/unknown") {
    return "프로필 사진 업로드 중 네트워크 문제가 생겼어요. 잠시 후 다시 시도해주세요.";
  }

  return "프로필을 저장하지 못했어요. 잠시 후 다시 시도해주세요.";
};
