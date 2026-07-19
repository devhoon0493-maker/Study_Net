import AsyncStorage from "@react-native-async-storage/async-storage";
import * as FileSystem from "expo-file-system/legacy";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import { updateProfile } from "firebase/auth";
import { ref, update } from "firebase/database";
import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import {
  getScreenBottomPadding,
  getScreenTopPadding,
} from "../../constants/layout";
import { useMonoTheme, type MonoTheme } from "../../constants/mono";
import { auth, db } from "../../utils/firebaseConfig";

const userTypes = ["초등학생", "중학생", "고등학생", "대학생", "취준생", "직장인"];

const isRemoteImageUri = (uri: string | null) =>
  !!uri && (uri.startsWith("http://") || uri.startsWith("https://"));

const isEmbeddedImageUri = (uri: string | null) => !!uri && uri.startsWith("data:image/");

const toEmbeddedImageUri = (base64: string) => `data:image/jpeg;base64,${base64}`;

const normalizeProfileImage = async (uri: string) => {
  if (isRemoteImageUri(uri) || isEmbeddedImageUri(uri)) return uri;

  const base64 = await FileSystem.readAsStringAsync(uri, {
    encoding: FileSystem.EncodingType.Base64,
  });

  return toEmbeddedImageUri(base64);
};

const getProfileSaveErrorMessage = (error: unknown) => {
  const code = typeof error === "object" && error && "code" in error ? String(error.code) : "";
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

export default function ProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { theme: C } = useMonoTheme();
  const styles = useMemo(() => createStyles(C), [C]);
  const topPadding = getScreenTopPadding(insets.top);
  const bottomPadding = getScreenBottomPadding(insets.bottom, 44);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [image, setImage] = useState<string | null>(null);
  const [userType, setUserType] = useState("");

  useEffect(() => {
    const loadProfile = async () => {
      const saved = await AsyncStorage.getItem("userProfile");
      if (saved) {
        const parsed = JSON.parse(saved);
        setName(parsed.name || "");
        setEmail(parsed.email || "");
        setImage(parsed.image || null);
        setUserType(parsed.userType || "");
      }
    };

    loadProfile();
  }, []);

  const pickImage = async () => {
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
      const saved = await AsyncStorage.getItem("userProfile");
      const previousProfile = saved ? JSON.parse(saved) : {};
      const currentUser = auth.currentUser;
      const uid = currentUser?.uid || previousProfile.uid;
      const nextImage = image ? await normalizeProfileImage(image) : image;
      const profile = {
        ...previousProfile,
        uid,
        name: name.trim(),
        email: email.trim(),
        image: nextImage,
        userType,
        updatedAt: Date.now(),
      };

      await AsyncStorage.setItem("userProfile", JSON.stringify(profile));

      if (currentUser) {
        await updateProfile(currentUser, {
          displayName: profile.name,
          ...(isRemoteImageUri(nextImage) ? { photoURL: nextImage } : {}),
        });
      }

      if (uid) {
        await update(ref(db, `users/${uid}`), profile);
      }

      router.back();
    } catch (error) {
      Alert.alert("저장 실패", getProfileSaveErrorMessage(error));
    }
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[
        styles.content,
        { paddingTop: topPadding, paddingBottom: bottomPadding },
      ]}
    >
      <Text style={styles.title}>프로필 설정</Text>

      <TouchableOpacity style={styles.imageWrapper} onPress={pickImage}>
        {image ? (
          <Image source={{ uri: image }} style={styles.profileImage} />
        ) : (
          <View style={styles.placeholder}>
            <Text style={styles.placeholderText}>이미지 선택</Text>
          </View>
        )}
      </TouchableOpacity>

      <Text style={styles.label}>이름</Text>
      <TextInput
        style={styles.input}
        value={name}
        onChangeText={setName}
        placeholder="이름 입력"
        placeholderTextColor={C.text}
      />

      <Text style={styles.label}>이메일</Text>
      <TextInput
        style={styles.input}
        value={email}
        onChangeText={setEmail}
        placeholder="이메일 입력"
        placeholderTextColor={C.text}
        keyboardType="email-address"
        autoCapitalize="none"
      />

      <Text style={styles.label}>사용자</Text>
      <View style={styles.typeContainer}>
        {userTypes.map((type) => {
          const active = userType === type;
          return (
            <TouchableOpacity
              key={type}
              style={[styles.typeButton, active && styles.typeButtonActive]}
              onPress={() => setUserType(type)}
            >
              <Text style={[styles.typeText, active && styles.typeTextActive]}>
                {type}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
        <Text style={styles.saveButtonText}>저장하기</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const createStyles = (C: MonoTheme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: C.bg,
    },
    content: {
      padding: 20,
    },
    title: {
      fontSize: 22,
      fontWeight: "bold",
      color: C.text,
      marginBottom: 30,
    },
    imageWrapper: {
      alignSelf: "center",
      marginBottom: 25,
    },
    profileImage: {
      width: 120,
      height: 120,
      borderRadius: 60,
      borderWidth: 1,
      borderBottomWidth: 3,
      borderColor: C.border,
    },
    placeholder: {
      width: 120,
      height: 120,
      borderRadius: 60,
      backgroundColor: C.surface,
      justifyContent: "center",
      alignItems: "center",
      borderWidth: 1,
      borderBottomWidth: 4,
      borderColor: C.border,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.16,
      shadowRadius: 2,
      elevation: 2,
    },
    placeholderText: {
      color: C.text,
    },
    label: {
      color: C.text,
      marginBottom: 8,
      marginTop: 15,
      fontSize: 14,
    },
    input: {
      backgroundColor: C.surface,
      borderRadius: 10,
      padding: 12,
      color: C.text,
      borderWidth: 1,
      borderBottomWidth: 4,
      borderColor: C.border,
    },
    typeContainer: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
      marginTop: 5,
      marginBottom: 20,
    },
    typeButton: {
      minHeight: 44,
      flexBasis: "31%",
      flexGrow: 1,
      paddingHorizontal: 14,
      borderRadius: 12,
      backgroundColor: C.surface,
      borderWidth: 1,
      borderBottomWidth: 3,
      borderColor: C.border,
      alignItems: "center",
      justifyContent: "center",
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.14,
      shadowRadius: 2,
      elevation: 2,
    },
    typeButtonActive: {
      borderWidth: 2,
      borderBottomWidth: 4,
    },
    typeText: {
      color: C.text,
      fontSize: 14,
    },
    typeTextActive: {
      color: C.text,
      fontWeight: "600",
    },
    saveButton: {
      backgroundColor: C.surface,
      minHeight: 56,
      borderRadius: 12,
      alignItems: "center",
      justifyContent: "center",
      marginTop: 10,
      borderWidth: 1,
      borderBottomWidth: 4,
      borderColor: C.border,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.14,
      shadowRadius: 2,
      elevation: 2,
    },
    saveButtonText: {
      color: C.text,
      fontSize: 16,
      fontWeight: "bold",
    },
  });
