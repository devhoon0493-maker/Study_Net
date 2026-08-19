import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
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
} from "../constants/layout";
import { useMonoTheme, type MonoTheme } from "../constants/mono";
import { loadStoredUserProfile } from "../utils/userProfileStorage";

const SUBJECT_MAP: Record<string, string[]> = {
  초등학생: ["국어", "수학", "영어", "사회", "과학", "체육", "음악", "미술"],
  중학생: ["국어", "수학", "영어", "과학", "사회"],
  고등학생: ["국어", "수학", "영어", "물리", "화학", "생명과학"],
  대학생: ["전공", "교양", "과제", "시험 대비"],
  취준생: ["자격증", "면접 준비", "어학"],
  직장인: ["자기계발", "자격증", "업무"],
};

export default function SubjectSelect() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { theme: C } = useMonoTheme();
  const styles = useMemo(() => createStyles(C), [C]);
  const topPadding = getScreenTopPadding(insets.top);
  const bottomPadding = getScreenBottomPadding(insets.bottom);

  const [subjects, setSubjects] = useState<string[]>([]);
  const [customSubjects, setCustomSubjects] = useState<string[]>([]);
  const [newSubject, setNewSubject] = useState("");
  const [userType, setUserType] = useState("");
  const [showInput, setShowInput] = useState(false);

  useEffect(() => {
    loadSubjects();
  }, []);

  const loadSubjects = async () => {
    const profile = await loadStoredUserProfile();
    const currentUserType = profile?.userType || "";

    const storageKey = `custom_subjects_${currentUserType || "default"}`;
    const customRaw = await AsyncStorage.getItem(storageKey);
    let custom: string[] = [];
    try {
      const parsed = customRaw ? JSON.parse(customRaw) : [];
      custom = Array.isArray(parsed)
        ? parsed.filter((item): item is string => typeof item === "string")
        : [];
    } catch {
      custom = [];
    }
    const baseSubjects = currentUserType
      ? SUBJECT_MAP[currentUserType] || []
      : ["자유 공부", "국어", "수학", "영어"];

    setUserType(currentUserType);
    setCustomSubjects(custom);
    setSubjects([...baseSubjects, ...custom]);
  };

  const addCustomSubject = async () => {
    const subject = newSubject.trim();
    if (!subject) return;
    if (subjects.some((item) => item.trim().toLowerCase() === subject.toLowerCase())) {
      Alert.alert("중복 과목", "이미 목록에 있는 과목이에요.");
      return;
    }

    const storageKey = `custom_subjects_${userType || "default"}`;
    const updated = [...customSubjects, subject];

    await AsyncStorage.setItem(storageKey, JSON.stringify(updated));
    setCustomSubjects(updated);
    setSubjects((prev) => [...prev, subject]);
    setNewSubject("");
    setShowInput(false);
  };

  const deleteSubject = async (subject: string) => {
    Alert.alert("삭제", `${subject} 과목을 삭제할까요?`, [
      { text: "취소", style: "cancel" },
      {
        text: "삭제",
        style: "destructive",
        onPress: async () => {
          const updated = customSubjects.filter((item) => item !== subject);
          const storageKey = `custom_subjects_${userType || "default"}`;
          await AsyncStorage.setItem(storageKey, JSON.stringify(updated));

          setCustomSubjects(updated);
          setSubjects([...(SUBJECT_MAP[userType] || []), ...updated]);
        },
      },
    ]);
  };

  const selectSubject = (subject: string) => {
    router.replace({
      pathname: "/study",
      params: { subject },
    });
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { paddingTop: topPadding }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.title}>과목 선택</Text>
          {userType ? (
            <Text style={styles.subtitle}>{userType} 맞춤 과목</Text>
          ) : null}
        </View>

        <TouchableOpacity
          testID="subject-add-open-button"
          style={styles.plusButton}
          onPress={() => setShowInput(true)}
        >
          <Text style={styles.plus}>+</Text>
        </TouchableOpacity>
      </View>

      {showInput && (
        <View style={styles.inputCard}>
          <TextInput
            testID="subject-custom-input"
            placeholder="새 과목 입력"
            placeholderTextColor={C.subtle}
            value={newSubject}
            onChangeText={setNewSubject}
            style={styles.input}
            autoFocus
          />

          <View style={styles.inputButtons}>
            <TouchableOpacity
              testID="subject-custom-cancel-button"
              style={styles.cancelBtn}
              onPress={() => {
                setNewSubject("");
                setShowInput(false);
              }}
            >
              <Text style={styles.cancelText}>취소</Text>
            </TouchableOpacity>

            <TouchableOpacity
              testID="subject-custom-add-button"
              style={styles.addButton}
              onPress={addCustomSubject}
            >
              <Text style={styles.addButtonText}>추가</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      <FlatList
        data={subjects}
        keyExtractor={(item, index) => item + index}
        contentContainerStyle={[styles.listContent, { paddingBottom: bottomPadding }]}
        renderItem={({ item, index }) => {
          const isCustom = customSubjects.includes(item);

          return (
            <TouchableOpacity
              testID={`subject-card-${index}`}
              style={styles.subjectCard}
              onPress={() => selectSubject(item)}
              onLongPress={() => isCustom && deleteSubject(item)}
            >
              <Text style={styles.subjectText}>{item}</Text>
              {isCustom && <Text style={styles.deleteHint}>길게 눌러 삭제</Text>}
            </TouchableOpacity>
          );
        }}
      />
    </KeyboardAvoidingView>
  );
}

const createStyles = (C: MonoTheme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: C.bg,
      paddingHorizontal: 20,
    },
    headerRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 20,
    },
    title: {
      fontSize: 26,
      fontWeight: "bold",
      color: C.text,
    },
    subtitle: {
      color: C.text,
      marginTop: 6,
    },
    plusButton: {
      width: 44,
      height: 44,
      borderWidth: 1,
      borderBottomWidth: 3,
      borderColor: C.border,
      borderRadius: 12,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: C.surface,
    },
    plus: {
      color: C.text,
      fontSize: 28,
      fontWeight: "bold",
      lineHeight: 30,
    },
    inputCard: {
      backgroundColor: C.surface,
      padding: 16,
      borderRadius: 16,
      marginBottom: 20,
      borderWidth: 1,
      borderBottomWidth: 3,
      borderColor: C.border,
    },
    input: {
      backgroundColor: C.surface,
      color: C.text,
      paddingHorizontal: 14,
      paddingVertical: 12,
      borderRadius: 12,
      borderWidth: 1,
      borderBottomWidth: 4,
      borderColor: C.border,
    },
    inputButtons: {
      flexDirection: "row",
      justifyContent: "flex-end",
      marginTop: 12,
      gap: 12,
    },
    cancelBtn: {
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderWidth: 1,
      borderBottomWidth: 4,
      borderColor: C.border,
      borderRadius: 10,
    },
    cancelText: {
      color: C.text,
    },
    addButton: {
      backgroundColor: C.surface,
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: C.border,
    },
    addButtonText: {
      color: C.text,
      fontWeight: "bold",
    },
    listContent: {
      paddingBottom: 40,
    },
    subjectCard: {
      backgroundColor: C.surface,
      paddingVertical: 18,
      paddingHorizontal: 20,
      borderRadius: 16,
      marginBottom: 14,
      borderWidth: 1,
      borderColor: C.border,
    },
    subjectText: {
      color: C.text,
      fontSize: 18,
      fontWeight: "500",
    },
    deleteHint: {
      color: C.text,
      fontSize: 12,
      marginTop: 6,
    },
  });
