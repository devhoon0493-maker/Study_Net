import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import { onAuthStateChanged } from "firebase/auth";
import { get, onDisconnect, onValue, push, ref, update } from "firebase/database";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ActivityIndicator,
  Animated,
  AppState,
  type AppStateStatus,
  KeyboardAvoidingView,
  Modal,
  PanResponder,
  Platform,
  ScrollView,
  StatusBar,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import BottomNav, { getBottomNavSpace } from "../components/BottomNav";
import { getScreenTopPadding } from "../constants/layout";
import { useMonoTheme } from "../constants/mono";
import {
  EmptyState,
  FocusSummaryCard,
  GroupHeroCard,
  GroupLobbyHeader,
  InviteCodeCard,
  MemberRow,
  PublicGroupCard,
  QuickJoinCard,
  RoomHero,
} from "../features/group/components";
import {
  CODE_LENGTH,
  COLORS,
  DEFAULT_GROUP_MEMBERS,
  MAX_GROUP_MEMBERS,
  MEMBER_KEY,
  MIN_GROUP_MEMBERS,
  ROOM_EMOJIS,
  VISIBILITY_OPTIONS,
} from "../features/group/groupConstants";
import { createStyles } from "../features/group/groupStyles";
import { createGroupTheme } from "../features/group/groupTheme";
import type {
  Room,
  RoomRecord,
  RoomVisibility,
  Screen,
  StoredMember,
} from "../features/group/groupTypes";
import {
  formatTimer,
  getColorFromId,
  getCurrentStudySession,
  getMemberSliderRatio,
  isMemberOnline,
  isMemberStudying,
  makeCode,
  snapshotToRoom,
} from "../features/group/groupUtils";
import { auth, db } from "../utils/firebaseConfig";

export default function GroupScreen() {
  const router = useRouter();
  const { theme } = useMonoTheme();
  const insets = useSafeAreaInsets();
  const C = useMemo(() => createGroupTheme(theme), [theme]);
  const s = useMemo(() => createStyles(C), [C]);
  const bottomSpace = getBottomNavSpace(insets.bottom);
  const topPadding = getScreenTopPadding(insets.top);
  const [screen, setScreen] = useState<Screen>("lobby");
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [member, setMember] = useState<StoredMember | null>(null);
  const [loadError, setLoadError] = useState("");
  const [joining, setJoining] = useState(false);
  const [tick, setTick] = useState(0);

  const livePulse = useRef(new Animated.Value(1)).current;
  const memberSliderPageX = useRef(0);
  const roomsRef = useRef<Room[]>([]);

  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [codeInput, setCodeInput] = useState("");
  const [codeError, setCodeError] = useState("");
  const codeInputRef = useRef<TextInput>(null);

  const [roomName, setRoomName] = useState("");
  const [roomSubjects, setRoomSubjects] = useState("");
  const [roomMax, setRoomMax] = useState(DEFAULT_GROUP_MEMBERS);
  const [memberSliderWidth, setMemberSliderWidth] = useState(0);
  const [memberSliderRatio, setMemberSliderRatio] = useState(
    getMemberSliderRatio(DEFAULT_GROUP_MEMBERS),
  );
  const [roomVisibility, setRoomVisibility] =
    useState<RoomVisibility>("public");
  const [creating, setCreating] = useState(false);
  const [leaveConfirmVisible, setLeaveConfirmVisible] = useState(false);

  useEffect(() => {
    let profileUnsubscribe: (() => void) | null = null;

    const loadLocalMember = async () => {
      const raw = await AsyncStorage.getItem(MEMBER_KEY);
      if (raw) {
        setMember(JSON.parse(raw));
        return;
      }

      const newMember = {
        id: `member-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        name: `학생${Math.floor(Math.random() * 900 + 100)}`,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
        image: null,
        userType: "",
        bio: "",
      };
      await AsyncStorage.setItem(MEMBER_KEY, JSON.stringify(newMember));
      setMember(newMember);
    };

    const authUnsubscribe = onAuthStateChanged(auth, (user) => {
      profileUnsubscribe?.();
      profileUnsubscribe = null;

      if (!user) {
        loadLocalMember();
        return;
      }

      profileUnsubscribe = onValue(ref(db, `users/${user.uid}`), (snapshot) => {
        const profile = snapshot.val() ?? {};
        const nextMember = {
          id: user.uid,
          name:
            profile.name ||
            user.displayName ||
            user.email?.split("@")[0] ||
            "학생",
          color: profile.color || getColorFromId(user.uid),
          image: profile.image ?? user.photoURL ?? null,
          userType: profile.userType || "",
          bio: profile.bio || "",
        };
        AsyncStorage.setItem(MEMBER_KEY, JSON.stringify(nextMember));
        setMember(nextMember);
      });
    });

    return () => {
      authUnsubscribe();
      profileUnsubscribe?.();
    };
  }, []);

  useEffect(() => {
    const unsubscribe = onValue(ref(db, "rooms"), (snapshot) => {
      const rawRooms = snapshot.val() as Record<string, RoomRecord> | null;

      if (!rawRooms) {
        setRooms([]);
        return;
      }

      const nextRooms = Object.entries(rawRooms)
        .map(([id, raw]) => snapshotToRoom(id, raw))
        .sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0));

      setRooms(nextRooms);
    });

    return unsubscribe;
  }, []);

  useEffect(() => {
    if (!selectedRoomId) {
      setSelectedRoom(null);
      return;
    }

    const roomRef = ref(db, `rooms/${selectedRoomId}`);
    const unsubscribe = onValue(roomRef, (snapshot) => {
      if (!snapshot.exists()) {
        setSelectedRoom(null);
        setSelectedRoomId(null);
        setScreen("lobby");
        setLoadError("방장이 나갔거나 모든 사용자가 나가서 방이 종료됐어요.");
        return;
      }

      setSelectedRoom(snapshotToRoom(selectedRoomId, snapshot.val()));
      setLoadError("");
    });

    return unsubscribe;
  }, [selectedRoomId]);

  useEffect(() => {
    const timer = setInterval(() => setTick((v) => v + 1), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    roomsRef.current = rooms;
  }, [rooms]);

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(livePulse, {
          toValue: 0.3,
          duration: 700,
          useNativeDriver: true,
        }),
        Animated.timing(livePulse, {
          toValue: 1,
          duration: 700,
          useNativeDriver: true,
        }),
      ]),
    ).start();
  }, [livePulse]);

  useEffect(() => {
    if (!member || !selectedRoomId || screen !== "room") return;

    let mounted = true;
    const syncMyStudyStatus = async () => {
      try {
        const session = await getCurrentStudySession();
        if (!mounted) return;
        await update(ref(db, `rooms/${selectedRoomId}/members/${member.id}`), {
          name: member.name,
          color: member.color,
          image: member.image ?? null,
          userType: member.userType ?? "",
          bio: member.bio ?? "",
          online: true,
          lastSeenAt: Date.now(),
          ...session,
        });
      } catch (error: any) {
        if (mounted)
          setLoadError(error?.message ?? "공부 상태 동기화에 실패했어요.");
      }
    };

    syncMyStudyStatus();
    const timer = setInterval(syncMyStudyStatus, 5000);

    return () => {
      mounted = false;
      clearInterval(timer);
    };
  }, [member, screen, selectedRoomId]);

  const syncMyStudyStatusToJoinedRooms = useCallback(async () => {
    if (!member) return;

    const joinedRooms = roomsRef.current.filter((room) =>
      room.members.some((m) => m.id === member.id),
    );
    if (joinedRooms.length === 0) return;

    const session = await getCurrentStudySession();
    const nowMs = Date.now();
    const memberPresence = {
      name: member.name,
      color: member.color,
      image: member.image ?? null,
      userType: member.userType ?? "",
      bio: member.bio ?? "",
      online: true,
      lastSeenAt: nowMs,
      ...session,
    };

    const updates: Record<string, unknown> = {};
    for (const room of joinedRooms) {
      updates[`rooms/${room.id}/members/${member.id}`] = {
        ...memberPresence,
        speaking: false,
        joinedAt:
          room.members.find((m) => m.id === member.id)?.joinedAt ?? nowMs,
      };
    }

    await update(ref(db), updates);
  }, [member]);

  const joinedRoomKey = useMemo(() => {
    if (!member) return "";
    return rooms
      .filter((room) => room.members.some((m) => m.id === member.id))
      .map((room) => room.id)
      .sort()
      .join("|");
  }, [member, rooms]);

  useEffect(() => {
    if (!joinedRoomKey) return;
    syncMyStudyStatusToJoinedRooms().catch((error: any) => {
      setLoadError(error?.message ?? "공부 상태 동기화에 실패했어요.");
    });
  }, [joinedRoomKey, syncMyStudyStatusToJoinedRooms]);

  useEffect(() => {
    if (!member || !joinedRoomKey) return;

    const disconnects = roomsRef.current
      .filter((room) => room.members.some((m) => m.id === member.id))
      .map((room) =>
        onDisconnect(ref(db, `rooms/${room.id}/members/${member.id}`)),
      );

    disconnects.forEach((disconnect) => {
      disconnect.update({ online: false, lastSeenAt: Date.now() });
    });

    return () => {
      disconnects.forEach((disconnect) => {
        disconnect.cancel().catch(() => {});
      });
    };
  }, [joinedRoomKey, member]);

  const updateMyPresenceInJoinedRooms = useCallback(
    async (online: boolean) => {
      if (!member) return;

      const joinedRooms = roomsRef.current.filter((room) =>
        room.members.some((m) => m.id === member.id),
      );
      if (joinedRooms.length === 0) return;

      const nowMs = Date.now();
      const updates: Record<string, unknown> = {};
      for (const room of joinedRooms) {
        updates[`rooms/${room.id}/members/${member.id}/online`] = online;
        updates[`rooms/${room.id}/members/${member.id}/lastSeenAt`] = nowMs;
      }

      await update(ref(db), updates);
    },
    [member],
  );

  useEffect(() => {
    if (!member) return;

    const handleAppState = (nextState: AppStateStatus) => {
      updateMyPresenceInJoinedRooms(nextState === "active").catch(() => {});
    };

    const subscription = AppState.addEventListener("change", handleAppState);
    updateMyPresenceInJoinedRooms(AppState.currentState === "active").catch(
      () => {},
    );

    return () => subscription.remove();
  }, [member, updateMyPresenceInJoinedRooms]);

  useEffect(() => {
    if (!member) return;

    let mounted = true;
    const sync = async () => {
      try {
        await syncMyStudyStatusToJoinedRooms();
      } catch (error: any) {
        if (mounted)
          setLoadError(error?.message ?? "공부 상태 동기화에 실패했어요.");
      }
    };

    sync();
    const timer = setInterval(sync, 5000);

    return () => {
      mounted = false;
      clearInterval(timer);
    };
  }, [member, syncMyStudyStatusToJoinedRooms]);

  const makeUniqueCode = async () => {
    for (let i = 0; i < 8; i += 1) {
      const code = makeCode();
      const codeSnapshot = await get(ref(db, `roomCodes/${code}`));
      if (!codeSnapshot.exists()) return code;
    }
    throw new Error("초대 코드를 만들지 못했어요. 다시 시도해주세요.");
  };

  const addMeToRoom = async (room: Room) => {
    if (!member) return false;
    const alreadyJoined = room.members.some((m) => m.id === member.id);
    const nowMs = Date.now();
    if (room.members.length >= room.max && !alreadyJoined) {
      setCodeError("이 방은 현재 꽉 찼어요.");
      return false;
    }

    const session = await getCurrentStudySession();
    await update(ref(db, `rooms/${room.id}/members/${member.id}`), {
      name: member.name,
      color: member.color,
      image: member.image ?? null,
      userType: member.userType ?? "",
      bio: member.bio ?? "",
      speaking: false,
      ...session,
      online: true,
      lastSeenAt: nowMs,
      joinedAt: alreadyJoined
        ? (room.members.find((m) => m.id === member.id)?.joinedAt ?? nowMs)
        : nowMs,
    });
    return true;
  };

  const handleCodeJoin = async () => {
    if (!member || joining) return;

    const trimmed = codeInput.trim().toUpperCase();
    if (trimmed.length < CODE_LENGTH) {
      setCodeError("6자리 코드를 모두 입력해주세요.");
      return;
    }

    try {
      setJoining(true);
      setCodeError("");

      const codeSnapshot = await get(ref(db, `roomCodes/${trimmed}`));
      if (!codeSnapshot.exists()) {
        setCodeError("존재하지 않는 방 코드예요. 다시 확인해주세요.");
        return;
      }

      const roomId = codeSnapshot.val();
      const roomSnapshot = await get(ref(db, `rooms/${roomId}`));
      if (!roomSnapshot.exists()) {
        await update(ref(db), { [`roomCodes/${trimmed}`]: null });
        setCodeError("이미 종료된 방이에요.");
        return;
      }

      const room = snapshotToRoom(roomId, roomSnapshot.val());
      const ok = await addMeToRoom(room);
      if (!ok) return;

      setCodeInput("");
      setSelectedRoomId(room.id);
      setScreen("room");
    } catch (error: any) {
      setCodeError(error?.message ?? "방 입장에 실패했어요.");
    } finally {
      setJoining(false);
    }
  };

  const createRoom = async () => {
    if (!member || creating) return;

    const name = roomName.trim();
    const subjects = roomSubjects.trim() || "자유 공부";
    if (name.length < 2) return;

    try {
      setCreating(true);
      const newRef = push(ref(db, "rooms"));
      const roomId = newRef.key;
      if (!roomId) throw new Error("방 ID를 만들지 못했어요.");

      const code = await makeUniqueCode();
      const createdAt = Date.now();
      const session = await getCurrentStudySession();
      const room = {
        ownerId: member.id,
        name,
        subjects,
        emoji: ROOM_EMOJIS[Math.floor(Math.random() * ROOM_EMOJIS.length)],
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
        max: roomMax,
        code,
        createdAt,
        mode: "study-status",
        visibility: roomVisibility,
        members: {
          [member.id]: {
            name: member.name,
            color: member.color,
            image: member.image ?? null,
            userType: member.userType ?? "",
            bio: member.bio ?? "",
            speaking: false,
            ...session,
            online: true,
            lastSeenAt: createdAt,
            joinedAt: createdAt,
          },
        },
      };

      await update(ref(db), { [`rooms/${roomId}`]: room });
      await update(ref(db), { [`roomCodes/${code}`]: roomId });

      setLoadError("");
      setCreateModalVisible(false);
      setRoomName("");
      setRoomSubjects("");
      setRoomMax(DEFAULT_GROUP_MEMBERS);
      setMemberSliderRatio(getMemberSliderRatio(DEFAULT_GROUP_MEMBERS));
      setRoomVisibility("public");
      setSelectedRoomId(roomId);
      setScreen("room");
    } catch (error: any) {
      setLoadError(error?.message ?? "그룹 만들기에 실패했어요.");
    } finally {
      setCreating(false);
    }
  };

  const deleteRoom = async (room: Room) => {
    await update(ref(db), {
      [`rooms/${room.id}`]: null,
      [`roomCodes/${room.code}`]: null,
    });
  };

  const leaveRoomNow = async () => {
    if (!member || !selectedRoom) {
      setScreen("lobby");
      return;
    }

    try {
      const isOwner = selectedRoom.ownerId === member.id;
      if (isOwner) {
        await deleteRoom(selectedRoom);
      } else {
        await update(ref(db), {
          [`rooms/${selectedRoom.id}/members/${member.id}`]: null,
        });
      }
    } catch (error: any) {
      setLoadError(error?.message ?? "퇴장 처리에 실패했어요.");
    } finally {
      setLeaveConfirmVisible(false);
      setSelectedRoomId(null);
      setSelectedRoom(null);
      setScreen("lobby");
    }
  };

  const leaveRoom = () => {
    if (!member || !selectedRoom) {
      setScreen("lobby");
      return;
    }

    setLeaveConfirmVisible(true);
  };

  const updateRoomMaxFromSlider = useCallback(
    (x: number) => {
      if (memberSliderWidth <= 0) return;

      const ratio = Math.max(0, Math.min(1, x / memberSliderWidth));
      setMemberSliderRatio(ratio);
      const next = Math.round(
        MIN_GROUP_MEMBERS + ratio * (MAX_GROUP_MEMBERS - MIN_GROUP_MEMBERS),
      );
      setRoomMax(next);
    },
    [memberSliderWidth],
  );

  const memberSliderPanResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: (event) => {
          memberSliderPageX.current =
            event.nativeEvent.pageX - event.nativeEvent.locationX;
          updateRoomMaxFromSlider(event.nativeEvent.locationX);
        },
        onPanResponderMove: (_event, gestureState) => {
          updateRoomMaxFromSlider(
            gestureState.moveX - memberSliderPageX.current,
          );
        },
      }),
    [updateRoomMaxFromSlider],
  );

  const roomMembers = selectedRoom?.members ?? [];
  const myMember = roomMembers.find((m) => m.id === member?.id);
  const memberCountText = `${roomMembers.length}/${selectedRoom?.max ?? 6}`;
  const memberSliderPercent = memberSliderRatio * 100;
  const publicRooms = rooms.filter((room) => room.visibility === "public");
  const lobbyRooms = publicRooms;
  const now = Date.now();
  const lobbyStudyingMembers = rooms.flatMap((room) =>
    room.members.filter((m) => isMemberOnline(m, now) && isMemberStudying(m)),
  );
  const lobbyStudyingCount = rooms.reduce(
    (sum, room) =>
      sum +
      room.members.filter((m) => isMemberOnline(m, now) && isMemberStudying(m))
        .length,
    0,
  );
  void tick;

  const joinLobbyRoom = async (room: Room) => {
    if (!member || joining) return;

    try {
      setJoining(true);
      setLoadError("");

      const roomSnapshot = await get(ref(db, `rooms/${room.id}`));
      if (!roomSnapshot.exists()) {
        setLoadError("이미 종료된 방이에요.");
        return;
      }

      const latestRoom = snapshotToRoom(room.id, roomSnapshot.val());
      const ok = await addMeToRoom(latestRoom);
      if (!ok) return;

      setSelectedRoomId(latestRoom.id);
      setScreen("room");
    } catch (error: any) {
      setLoadError(error?.message ?? "방 입장에 실패했어요.");
    } finally {
      setJoining(false);
    }
  };

  if (screen === "lobby") {
    return (
      <View style={[s.container, { paddingTop: topPadding }]}>
        <StatusBar barStyle={C.statusBar} backgroundColor={C.bg} />

        <View style={s.header}>
          <TouchableOpacity
            style={s.backBtn}
            onPress={() => router.replace("/main")}
          >
            <Ionicons name="chevron-down" size={18} color={C.textSecondary} />
          </TouchableOpacity>
          <View style={s.roomCountBadge}>
            <Text style={s.roomCountText}>{rooms.length}개 그룹</Text>
          </View>
        </View>

        <ScrollView
          contentContainerStyle={[
            s.lobbyContent,
            { paddingBottom: bottomSpace + 96 },
          ]}
          showsVerticalScrollIndicator={false}
        >
          {loadError !== "" && (
            <View style={s.errorBanner}>
              <Ionicons
                name="alert-circle-outline"
                size={14}
                color={C.danger}
                style={{ marginRight: 6 }}
              />
              <Text style={s.errorText}>{loadError}</Text>
            </View>
          )}

          <GroupLobbyHeader s={s} />
          <GroupHeroCard
            studyingCount={lobbyStudyingCount}
            openCount={rooms.length}
            publicCount={publicRooms.length}
            studyingMembers={lobbyStudyingMembers}
            livePulse={livePulse}
            s={s}
          />
          <QuickJoinCard
            codeInput={codeInput}
            codeError={codeError}
            joining={joining}
            codeInputRef={codeInputRef}
            onChangeCode={(v) => {
              setCodeError("");
              setCodeInput(
                v
                  .toUpperCase()
                  .replace(/[^A-Z0-9]/g, "")
                  .slice(0, CODE_LENGTH),
              );
            }}
            onJoin={handleCodeJoin}
            s={s}
            C={C}
          />

          <View style={s.groupListHeader}>
            <View>
              <Text style={s.groupListTitle}>공개 그룹</Text>
              <Text style={s.groupListSub}>누구나 바로 입장할 수 있어요.</Text>
            </View>
            <Text style={s.groupListCount}>{lobbyRooms.length}</Text>
          </View>

          {lobbyRooms.length === 0 ? (
            <EmptyState
              icon="folder-open-outline"
              title="공개 그룹이 없어요."
              description="새 그룹을 만들거나 코드로 비공개 그룹에 입장해보세요."
              s={s}
              C={C}
            />
          ) : (
            <View style={s.groupCardList}>
              {lobbyRooms.map((room) => (
                <PublicGroupCard
                  key={room.id}
                  room={room}
                  joining={joining}
                  livePulse={livePulse}
                  onPress={() => joinLobbyRoom(room)}
                  s={s}
                  C={C}
                />
              ))}
            </View>
          )}
        </ScrollView>

        <TouchableOpacity
          style={[s.floatingCreateButton, { bottom: bottomSpace + 14 }]}
          activeOpacity={0.86}
          onPress={() => setCreateModalVisible(true)}
        >
          <Ionicons name="add" size={18} color={C.inverse} />
          <Text style={s.floatingCreateText}>새 그룹 만들기</Text>
        </TouchableOpacity>

        <Modal
          visible={createModalVisible}
          transparent
          animationType="slide"
          onRequestClose={() => setCreateModalVisible(false)}
        >
          <KeyboardAvoidingView
            style={s.modalOverlay}
            behavior={Platform.OS === "ios" ? "padding" : "height"}
          >
            <View style={s.modalCard}>
              <View style={s.sheetHandle} />
              <View style={s.modalHeader}>
                <View style={s.modalIconWrap}>
                  <Ionicons name="people-outline" size={20} color={C.primary} />
                </View>
                <TouchableOpacity
                  style={s.modalCloseBtn}
                  onPress={() => setCreateModalVisible(false)}
                >
                  <Ionicons name="close" size={15} color={C.textTertiary} />
                </TouchableOpacity>
              </View>

              <Text style={s.modalTitle}>새 그룹</Text>
              <Text style={s.modalSubtitle}>
                방을 만들면 친구에게 공유할 입장 코드가 생성돼요. 그룹 안에서
                실시간 공부 상태를 함께 볼 수 있어요.
              </Text>
              <View>
                <Text style={s.fieldLabel}>공개 설정</Text>
                <View style={s.visibilityRow}>
                  {VISIBILITY_OPTIONS.map((option) => {
                    const active = option.value === roomVisibility;
                    return (
                      <TouchableOpacity
                        key={option.value}
                        style={[
                          s.visibilityOption,
                          active && s.visibilityOptionActive,
                        ]}
                        onPress={() => setRoomVisibility(option.value)}
                        activeOpacity={0.8}
                      >
                        <View style={s.visibilityTitleRow}>
                          <View
                            style={[
                              s.visibilityIconBox,
                              active && s.visibilityIconBoxActive,
                            ]}
                          >
                            <Ionicons
                              name={
                                option.value === "public"
                                  ? "earth-outline"
                                  : "lock-closed-outline"
                              }
                              size={15}
                              color={active ? C.inverse : C.textPrimary}
                            />
                          </View>
                          <Text
                            style={[
                              s.visibilityLabel,
                              active && s.visibilityLabelActive,
                            ]}
                          >
                            {option.label}
                          </Text>
                        </View>
                        <Text style={s.visibilityDesc}>
                          {option.description}
                        </Text>
                        <View
                          style={[
                            s.visibilityCheck,
                            active && s.visibilityCheckActive,
                          ]}
                        >
                          {active && (
                            <Ionicons
                              name="checkmark"
                              size={13}
                              color={C.inverse}
                            />
                          )}
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
              <TextInput
                style={s.formInput}
                value={roomName}
                onChangeText={setRoomName}
                placeholder="방 이름"
                placeholderTextColor={C.textTertiary}
              />
              <TextInput
                style={s.formInput}
                value={roomSubjects}
                onChangeText={setRoomSubjects}
                placeholder="과목 예: 수학 · 영어"
                placeholderTextColor={C.textTertiary}
              />
              <View>
                <Text style={s.fieldLabel}>최대 인원</Text>
                <View style={s.memberSliderBox}>
                  <View style={s.memberSliderHeader}>
                    <View>
                      <Text style={s.memberSliderTitle}>그룹 정원</Text>
                      <Text style={s.memberSliderSub}>
                        2명부터 20명까지 설정할 수 있어요.
                      </Text>
                    </View>
                    <View style={s.memberSliderValueWrap}>
                      <Text style={s.memberSliderValue}>{roomMax}</Text>
                      <Text style={s.memberSliderUnit}>명</Text>
                    </View>
                  </View>
                  <View
                    style={s.memberSliderTrackWrap}
                    onLayout={(event) =>
                      setMemberSliderWidth(event.nativeEvent.layout.width)
                    }
                    {...memberSliderPanResponder.panHandlers}
                  >
                    <View style={s.memberSliderTrack}>
                      <View
                        style={[
                          s.memberSliderFill,
                          { width: `${memberSliderPercent}%` },
                        ]}
                      />
                    </View>
                    <View
                      style={[
                        s.memberSliderThumb,
                        { left: `${memberSliderPercent}%` },
                      ]}
                    />
                  </View>
                  <View style={s.memberSliderRange}>
                    <Text style={s.memberSliderRangeText}>
                      {MIN_GROUP_MEMBERS}명
                    </Text>
                    <Text style={s.memberSliderRangeText}>
                      {MAX_GROUP_MEMBERS}명
                    </Text>
                  </View>
                </View>
              </View>
              <TouchableOpacity
                style={[
                  s.enterBtn,
                  roomName.trim().length < 2 && { opacity: 0.45 },
                ]}
                disabled={roomName.trim().length < 2 || creating}
                onPress={createRoom}
                activeOpacity={0.8}
              >
                {creating ? (
                  <ActivityIndicator color={C.inverse} />
                ) : (
                  <Text style={s.enterBtnText}>만들고 입장하기</Text>
                )}
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </Modal>

        <BottomNav />
      </View>
    );
  }

  if (!selectedRoom) {
    return (
      <View style={[s.container, s.center, { paddingTop: topPadding }]}>
        <ActivityIndicator color={C.textAccent} />
        <Text style={s.loadingText}>방 정보를 불러오는 중...</Text>
        <BottomNav />
      </View>
    );
  }

  const onlineMembers = roomMembers.filter((m) => isMemberOnline(m, now));
  const offlineMemberList = roomMembers.filter((m) => !isMemberOnline(m, now));
  const studyingMembers = onlineMembers.filter(isMemberStudying);
  const waitingMemberList = onlineMembers.filter((m) => !isMemberStudying(m));
  const waitingMembers = waitingMemberList.length;
  const offlineMembers = offlineMemberList.length;
  const isOwner = selectedRoom.ownerId === member?.id;

  return (
    <View style={[s.container, { paddingTop: topPadding }]}>
      <StatusBar barStyle={C.statusBar} backgroundColor={C.bg} />

      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={leaveRoom}>
          <Ionicons name="chevron-down" size={18} color={C.textSecondary} />
        </TouchableOpacity>
        <View style={s.headerCenter}>
          <Text style={s.headerTitle}>{selectedRoom.name}</Text>
          <Text style={s.headerSub}>
            참여 {memberCountText} · 코드 {selectedRoom.code}
          </Text>
        </View>
        <View style={s.headerRight}>
          <View style={s.liveBadge}>
            <Animated.View style={[s.liveDot, { opacity: livePulse }]} />
            <Text style={s.liveText}>실시간</Text>
          </View>
          <View style={s.roomCountBadge}>
            <Text style={s.roomCountText}>{memberCountText}</Text>
          </View>
        </View>
      </View>

      <ScrollView
        style={s.roomScroll}
        contentContainerStyle={[
          s.roomContent,
          { paddingBottom: bottomSpace + 18 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <RoomHero
          room={selectedRoom}
          memberCountText={memberCountText}
          livePulse={livePulse}
          s={s}
        />
        <InviteCodeCard code={selectedRoom.code} s={s} C={C} />
        <FocusSummaryCard
          studyingCount={studyingMembers.length}
          waitingCount={waitingMembers}
          offlineCount={offlineMembers}
          s={s}
        />

        <View style={s.memberSection}>
          <View style={s.memberSectionHeader}>
            <Text style={s.memberSectionTitle}>공부 중</Text>
            <Text style={s.memberSectionCount}>{studyingMembers.length}</Text>
          </View>
          {studyingMembers.length === 0 ? (
            <EmptyState
              icon="book-outline"
              title="아직 공부 중인 멤버가 없어요."
              description="공부를 시작하면 이곳에 실시간으로 표시돼요."
              s={s}
              C={C}
            />
          ) : (
            <View style={s.memberList}>
              {studyingMembers.map((m) => (
                <MemberRow
                  key={m.id}
                  member={m}
                  isMe={m.id === member?.id}
                  now={now}
                  s={s}
                />
              ))}
            </View>
          )}
        </View>

        <View style={s.memberSection}>
          <View style={s.memberSectionHeader}>
            <Text style={s.memberSectionTitle}>접속중</Text>
            <Text style={s.memberSectionCount}>{waitingMembers}</Text>
          </View>
          {waitingMemberList.length === 0 ? (
            <EmptyState
              icon="checkmark-circle-outline"
              title="모두 공부 중이에요."
              description="현재 접속중인 멤버가 없습니다."
              s={s}
              C={C}
            />
          ) : (
            <View style={s.memberList}>
              {waitingMemberList.map((m) => (
                <MemberRow
                  key={m.id}
                  member={m}
                  isMe={m.id === member?.id}
                  now={now}
                  s={s}
                />
              ))}
            </View>
          )}
        </View>

        <View style={s.memberSection}>
          <View style={s.memberSectionHeader}>
            <Text style={s.memberSectionTitle}>오프라인</Text>
            <Text style={s.memberSectionCount}>{offlineMembers}</Text>
          </View>
          {offlineMemberList.length === 0 ? (
            <EmptyState
              icon="moon-outline"
              title="오프라인 멤버가 없어요."
              description="앱을 닫은 멤버가 생기면 이곳에 표시돼요."
              s={s}
              C={C}
            />
          ) : (
            <View style={s.memberList}>
              {offlineMemberList.map((m) => (
                <MemberRow
                  key={m.id}
                  member={m}
                  isMe={m.id === member?.id}
                  now={now}
                  s={s}
                />
              ))}
            </View>
          )}
        </View>

        <View style={s.myStatusCard}>
          <View style={s.myStatusIcon}>
            <Ionicons
              name={myMember?.studyStartEpoch ? "book-outline" : "time-outline"}
              size={18}
              color={C.textPrimary}
            />
          </View>
          <View style={s.myStatusTextWrap}>
            <Text style={s.myStatusLabel}>내 상태</Text>
            <Text style={s.myStatusText} numberOfLines={1}>
              {myMember?.studyStartEpoch
                ? `${myMember.status ?? "공부중"} · ${formatTimer(myMember.studyStartEpoch, now)}`
                : "공부를 시작하면 그룹에 실시간으로 표시돼요."}
            </Text>
          </View>
        </View>

        <View style={s.controls}>
          <TouchableOpacity
            style={s.ctrlBtnDanger}
            onPress={leaveRoom}
            activeOpacity={0.8}
          >
            <Ionicons name="log-out-outline" size={18} color={C.textPrimary} />
            <Text style={s.leaveBtnText}>그룹 나가기</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <Modal
        visible={leaveConfirmVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setLeaveConfirmVisible(false)}
      >
        <View style={s.confirmOverlay}>
          <View style={s.confirmCard}>
            <View style={s.confirmIcon}>
              <Ionicons
                name={isOwner ? "warning-outline" : "log-out-outline"}
                size={22}
                color={isOwner ? C.danger : C.cafe}
              />
            </View>
            <Text style={s.confirmTitle}>
              {isOwner ? "그룹을 종료할까요?" : "그룹에서 나갈까요?"}
            </Text>
            <Text style={s.confirmDesc}>
              {isOwner
                ? "방장이 나가면 이 그룹과 입장 코드가 삭제되고, 참여자도 로비로 돌아가요."
                : "현재 그룹에서 나가도 나중에 입장 코드로 다시 들어올 수 있어요."}
            </Text>
            <View style={s.confirmActions}>
              <TouchableOpacity
                style={s.confirmCancelBtn}
                onPress={() => setLeaveConfirmVisible(false)}
                activeOpacity={0.8}
              >
                <Text style={s.confirmCancelText}>취소</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.confirmLeaveBtn, isOwner && s.confirmLeaveDangerBtn]}
                onPress={leaveRoomNow}
                activeOpacity={0.8}
              >
                <Text style={s.confirmLeaveText}>
                  {isOwner ? "종료하기" : "나가기"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      <BottomNav />
    </View>
  );
}

