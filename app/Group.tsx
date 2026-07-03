import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Clipboard from "expo-clipboard";
import { useRouter } from "expo-router";
import { onAuthStateChanged } from "firebase/auth";
import { get, onValue, push, ref, update } from "firebase/database";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type RefObject,
} from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Image,
  KeyboardAvoidingView,
  Modal,
  PanResponder,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import BottomNav, { getBottomNavSpace } from "../components/BottomNav";
import { useMonoTheme, type MonoTheme } from "../constants/mono";
import { auth, db } from "../utils/firebaseConfig";

const CODE_LENGTH = 6;
const MEMBER_KEY = "group_member_profile";
const ACTIVE_SESSION_KEY = "active_session";
const MAX_GROUP_MEMBERS = 20;
const MIN_GROUP_MEMBERS = 2;
const DEFAULT_GROUP_MEMBERS = 12;

const createGroupTheme = (theme: MonoTheme) => {
  return {
    bg: theme.bg,
    surface: theme.surface,
    surfaceAlt: theme.surfaceAlt,
    elevated: theme.elevated,
    border: theme.border,
    borderMid: theme.borderSoft,
    primary: theme.primary,
    primarySoft: theme.primarySoft,
    success: theme.success,
    successSoft: theme.successSoft,
    warning: theme.warning,
    warningSoft: theme.warningSoft,
    danger: theme.danger,
    dangerSoft: theme.dangerSoft,
    live: theme.live,
    liveSoft: theme.liveSoft,
    textPrimary: theme.text,
    textSecondary: theme.muted,
    textTertiary: theme.subtle,
    textAccent: theme.primary,
    accent: theme.primary,
    cafe: theme.primary,
    cafeSoft: theme.primarySoft,
    purple: "#7C3AED",
    inverse: theme.inverse,
    shadow: theme.shadow,
    statusBar: theme.statusBar,
  };
};

type GroupTheme = ReturnType<typeof createGroupTheme>;

const withAlpha = (color: string, alpha: string) => {
  if (/^#[0-9A-Fa-f]{3}$/.test(color)) {
    const [, r, g, b] = color;
    return `#${r}${r}${g}${g}${b}${b}${alpha}`;
  }

  if (/^#[0-9A-Fa-f]{6}$/.test(color)) return `${color}${alpha}`;

  return color;
};

const COLORS = [
  "#4F46E5",
  "#2563EB",
  "#059669",
  "#D97706",
  "#DC2626",
  "#7C3AED",
];
const ROOM_EMOJIS = ["📚", "✏️", "💻", "🎯", "🧠"];
const VISIBILITY_OPTIONS = [
  {
    value: "public",
    label: "공개 그룹",
    description: "로비에 표시되고 누구나 바로 들어올 수 있어요.",
  },
  {
    value: "private",
    label: "비공개 코드",
    description: "입장 코드를 아는 사람만 들어올 수 있어요.",
  },
] as const;

type Screen = "lobby" | "room";
type RoomVisibility = (typeof VISIBILITY_OPTIONS)[number]["value"];

const getMemberSliderRatio = (value: number) =>
  (value - MIN_GROUP_MEMBERS) / (MAX_GROUP_MEMBERS - MIN_GROUP_MEMBERS);

interface Member {
  id: string;
  name: string;
  color: string;
  image?: string | null;
  userType?: string;
  bio?: string;
  speaking?: boolean;
  status?: string;
  joinedAt?: number;
  studyStartEpoch?: number | null;
}

interface Room {
  id: string;
  ownerId: string;
  name: string;
  emoji: string;
  subjects: string;
  color: string;
  max: number;
  code: string;
  visibility: RoomVisibility;
  createdAt?: number;
  members: Member[];
}

interface StoredMember {
  id: string;
  name: string;
  color: string;
  image?: string | null;
  userType?: string;
  bio?: string;
}

interface ActiveSessionData {
  subject?: string;
  startEpoch?: number;
  goalSeconds?: number;
}

type RoomMemberRecord = Partial<Member>;

type RoomRecord = {
  ownerId?: string;
  name?: string;
  emoji?: string;
  subjects?: string;
  color?: string;
  max?: number;
  code?: string;
  visibility?: RoomVisibility;
  createdAt?: number;
  members?: Record<string, RoomMemberRecord>;
};

type GroupStyles = ReturnType<typeof createStyles>;

const makeCode = () => {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from(
    { length: CODE_LENGTH },
    () => chars[Math.floor(Math.random() * chars.length)],
  ).join("");
};

const getInitial = (name: string) => name.trim().slice(0, 1) || "?";

const getColorFromId = (id: string) => {
  const total = Array.from(id).reduce(
    (sum, char) => sum + char.charCodeAt(0),
    0,
  );
  return COLORS[total % COLORS.length];
};

const formatTimer = (joinedAt?: number, now = Date.now()) => {
  if (!joinedAt) return "00:00:00";
  const total = Math.max(0, Math.floor((now - joinedAt) / 1000));
  const h = String(Math.floor(total / 3600)).padStart(2, "0");
  const m = String(Math.floor((total % 3600) / 60)).padStart(2, "0");
  const s = String(total % 60).padStart(2, "0");
  return `${h}:${m}:${s}`;
};

const isMemberStudying = (member: Member) => !!member.studyStartEpoch;

const getCurrentStudySession = async () => {
  const raw = await AsyncStorage.getItem(ACTIVE_SESSION_KEY);
  if (!raw) return { status: "접속중", studyStartEpoch: null };

  try {
    const session: ActiveSessionData = JSON.parse(raw);
    return {
      status: session.subject?.trim() || "공부 중",
      studyStartEpoch: session.startEpoch ?? null,
    };
  } catch {
    return { status: "공부 중", studyStartEpoch: null };
  }
};

const snapshotToRoom = (id: string, raw: RoomRecord): Room => ({
  id,
  ownerId: raw.ownerId ?? "",
  name: raw.name ?? "스터디 그룹",
  emoji: raw.emoji ?? "📚",
  subjects: raw.subjects ?? "자유 공부",
  color: raw.color ?? COLORS[0],
  max: Math.min(raw.max ?? MAX_GROUP_MEMBERS, MAX_GROUP_MEMBERS),
  code: raw.code ?? "",
  visibility: raw.visibility ?? "public",
  createdAt: raw.createdAt ?? 0,
  members: Object.entries(raw.members ?? {}).map(
    ([memberId, m]) => ({
      id: memberId,
      name: m.name ?? "학생",
      color: m.color ?? COLORS[0],
      image: m.image ?? null,
      userType: m.userType ?? "",
      bio: m.bio ?? "",
      speaking: m.speaking ?? false,
      status: m.status ?? "공부 중",
      joinedAt: m.joinedAt,
      studyStartEpoch: m.studyStartEpoch ?? null,
    }),
  ),
});

function MemberPreview({ members, s }: { members: Member[]; s: GroupStyles }) {
  const preview = members.slice(0, 4);
  const hiddenCount = Math.max(0, members.length - preview.length);

  return (
    <View style={s.memberPreviewRow}>
      {preview.map((m, index) => (
        <View
          key={m.id}
          style={[
            s.memberPreviewAvatar,
            {
              marginLeft: index === 0 ? 0 : -8,
              backgroundColor: withAlpha(m.color, "18"),
              borderColor: withAlpha(m.color, "55"),
              zIndex: preview.length - index,
            },
          ]}
        >
          {m.image ? (
            <Image source={{ uri: m.image }} style={s.memberPreviewImage} />
          ) : (
            <Text style={[s.memberPreviewText, { color: m.color }]}>
              {getInitial(m.name)}
            </Text>
          )}
        </View>
      ))}
      {hiddenCount > 0 && (
        <View
          style={[
            s.memberPreviewAvatar,
            s.memberPreviewMore,
            { marginLeft: -8 },
          ]}
        >
          <Text style={s.memberPreviewMoreText}>+{hiddenCount}</Text>
        </View>
      )}
    </View>
  );
}

function GroupLobbyHeader({ s }: { s: GroupStyles }) {
  return (
    <View style={s.lobbyHeaderBlock}>
      <View style={s.lobbyHeaderTextWrap}>
        <Text style={s.lobbyHeaderTitle}>그룹 스터디</Text>
        <Text style={s.lobbyHeaderDesc}>
          혼자 하기 어려운 공부, 지금 같이 시작해요.
        </Text>
      </View>
    </View>
  );
}

function GroupHeroCard({
  studyingCount,
  openCount,
  publicCount,
  studyingMembers,
  livePulse,
  s,
}: {
  studyingCount: number;
  openCount: number;
  publicCount: number;
  studyingMembers: Member[];
  livePulse: Animated.Value;
  s: GroupStyles;
}) {
  return (
    <View style={s.groupHeroCard}>
      <View style={s.groupHeroTop}>
        <View style={s.heroCopy}>
          <View style={s.heroLiveBadge}>
            <Animated.View style={[s.liveDot, { opacity: livePulse }]} />
            <Text style={s.heroLiveText}>현재 {studyingCount}명 공부 중</Text>
          </View>
          <Text style={s.groupHeroTitle}>지금 같이 공부 중이에요</Text>
          <Text style={s.groupHeroDesc}>
            친구들의 공부 상태를 보고 바로 합류해보세요.
          </Text>
        </View>
        <View style={s.heroPeoplePanel}>
          <MemberPreview members={studyingMembers} s={s} />
        </View>
      </View>

      <View style={s.heroMetricRow}>
        <View style={s.heroMetricItem}>
          <Text style={s.heroMetricValue}>{openCount}</Text>
          <Text style={s.heroMetricLabel}>열린 그룹</Text>
        </View>
        <View style={s.heroMetricItem}>
          <Text style={s.heroMetricValue}>{publicCount}</Text>
          <Text style={s.heroMetricLabel}>공개 그룹</Text>
        </View>
      </View>
    </View>
  );
}

function QuickJoinCard({
  codeInput,
  codeError,
  joining,
  codeInputRef,
  onChangeCode,
  onJoin,
  s,
  C,
}: {
  codeInput: string;
  codeError: string;
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
    </View>
  );
}

function PublicGroupCard({
  room,
  joining,
  livePulse,
  onPress,
  s,
  C,
}: {
  room: Room;
  joining: boolean;
  livePulse: Animated.Value;
  onPress: () => void;
  s: GroupStyles;
  C: GroupTheme;
}) {
  const studyingCount = room.members.filter(isMemberStudying).length;
  const full = room.members.length >= room.max;

  return (
    <TouchableOpacity
      style={[s.publicGroupCard, full && s.publicGroupCardDisabled]}
      onPress={onPress}
      disabled={joining || full}
      activeOpacity={0.86}
    >
      <View style={s.publicCardHeader}>
        <View
          style={[
            s.publicCardIcon,
            { backgroundColor: withAlpha(room.color, "16") },
          ]}
        >
          <Text style={s.publicCardEmoji}>{room.emoji}</Text>
        </View>
        <View style={s.publicCardInfo}>
          <View style={s.publicCardTitleRow}>
            <Text style={s.publicCardName} numberOfLines={1}>
              {room.name}
            </Text>
            <View style={s.liveMiniBadge}>
              <Animated.View style={[s.liveDot, { opacity: livePulse }]} />
              <Text style={s.liveMiniText}>진행중</Text>
            </View>
          </View>
          <Text style={s.publicCardDesc} numberOfLines={1}>
            {room.subjects}
          </Text>
        </View>
      </View>

      <View style={s.publicCardMetaRow}>
        <View style={s.publicMetaChip}>
          <Ionicons name="flash-outline" size={12} color={C.success} />
          <Text style={s.publicMetaText}>{studyingCount}명 공부</Text>
        </View>
        <View style={s.publicMetaChip}>
          <Ionicons name="people-outline" size={12} color={C.primary} />
          <Text style={s.publicMetaText}>
            {room.members.length}/{room.max}
          </Text>
        </View>
      </View>

      <View style={s.publicCardFooter}>
        <MemberPreview members={room.members} s={s} />
        <View style={[s.publicJoinPill, full && s.publicJoinPillFull]}>
          <Text style={[s.publicJoinText, full && s.publicJoinTextFull]}>
            {full ? "마감" : "입장"}
          </Text>
          {!full && (
            <Ionicons name="chevron-forward" size={14} color={C.primary} />
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

function EmptyState({
  title,
  description,
  icon,
  s,
  C,
}: {
  title: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
  s: GroupStyles;
  C: GroupTheme;
}) {
  return (
    <View style={s.emptyState}>
      <View style={s.emptyStateIcon}>
        <Ionicons name={icon} size={24} color={C.textPrimary} />
      </View>
      <Text style={s.emptyStateTitle}>{title}</Text>
      <Text style={s.emptyStateText}>{description}</Text>
    </View>
  );
}

function RoomHero({
  room,
  memberCountText,
  livePulse,
  s,
}: {
  room: Room;
  memberCountText: string;
  livePulse: Animated.Value;
  s: GroupStyles;
}) {
  return (
    <View style={s.roomHero}>
      <View style={s.roomHeroTop}>
        <View style={s.roomHeroBadge}>
          <Animated.View style={[s.liveDot, { opacity: livePulse }]} />
          <Text style={s.roomHeroBadgeText}>실시간</Text>
        </View>
        <Text style={s.roomHeroMeta}>{memberCountText} 참여</Text>
      </View>
      <Text style={s.roomHeroTitle}>{room.name}</Text>
      <Text style={s.roomHeroDesc} numberOfLines={2}>
        {room.subjects}
      </Text>
      <View style={s.roomHeroFooter}>
        <Text style={s.roomHeroPill}>
          {room.visibility === "public" ? "공개 그룹" : "비공개 그룹"}
        </Text>
        <Text style={s.roomHeroPill}>실시간 현황</Text>
      </View>
    </View>
  );
}

function InviteCodeCard({
  code,
  s,
  C,
}: {
  code: string;
  s: GroupStyles;
  C: GroupTheme;
}) {
  const copyCode = async () => {
    await Clipboard.setStringAsync(code);
    Alert.alert("복사 완료", "초대 코드가 클립보드에 복사됐어요.");
  };

  return (
    <View style={s.inviteCodeCard}>
      <View>
        <Text style={s.inviteCodeLabel}>초대 코드</Text>
        <Text style={s.inviteCodeValue}>{code}</Text>
      </View>
      <TouchableOpacity
        style={s.copyCodeButton}
        onPress={copyCode}
        activeOpacity={0.82}
      >
        <Ionicons name="copy-outline" size={16} color={C.textPrimary} />
        <Text style={s.copyCodeText}>복사</Text>
      </TouchableOpacity>
    </View>
  );
}

function FocusSummaryCard({
  studyingCount,
  waitingCount,
  totalCount,
  s,
}: {
  studyingCount: number;
  waitingCount: number;
  totalCount: number;
  s: GroupStyles;
}) {
  return (
    <View style={s.focusSummaryCard}>
      <View style={s.focusSummaryItem}>
        <Text style={[s.focusSummaryValue, s.focusSummaryValueActive]}>
          {studyingCount}
        </Text>
        <Text style={s.focusSummaryLabel}>공부 중</Text>
      </View>
      <View style={s.focusSummaryDivider} />
      <View style={s.focusSummaryItem}>
        <Text style={s.focusSummaryValue}>{waitingCount}</Text>
        <Text style={s.focusSummaryLabel}>접속중</Text>
      </View>
      <View style={s.focusSummaryDivider} />
      <View style={s.focusSummaryItem}>
        <Text style={s.focusSummaryValue}>{totalCount}</Text>
        <Text style={s.focusSummaryLabel}>총 참여자</Text>
      </View>
    </View>
  );
}

function MemberRow({
  member,
  isMe,
  now,
  s,
}: {
  member: Member;
  isMe: boolean;
  now: number;
  s: GroupStyles;
}) {
  const studying = isMemberStudying(member);

  return (
    <View
      style={[s.memberRow, !studying && s.memberRowIdle, isMe && s.memberRowMe]}
    >
      <View
        style={[
          s.memberAvatar,
          {
            backgroundColor: withAlpha(member.color, "16"),
            borderColor: withAlpha(member.color, "44"),
          },
        ]}
      >
        {member.image ? (
          <Image source={{ uri: member.image }} style={s.memberAvatarImage} />
        ) : (
          <Text style={[s.memberAvatarText, { color: member.color }]}>
            {getInitial(member.name)}
          </Text>
        )}
      </View>
      <View style={s.memberInfo}>
        <View style={s.memberNameRow}>
          <Text style={s.memberName} numberOfLines={1}>
            {member.name}
          </Text>
          {member.userType ? (
            <Text style={s.memberType} numberOfLines={1}>
              {member.userType}
            </Text>
          ) : null}
          {isMe && (
            <View style={s.meTag}>
              <Text style={s.meTagText}>나</Text>
            </View>
          )}
        </View>
        <View style={s.memberSubjectRow}>
          <View style={[s.studyDot, studying && s.studyDotActive]} />
          <Text style={s.memberSubject} numberOfLines={1}>
            {studying
              ? (member.status ?? "공부중")
              : "아직 공부를 시작하지 않았어요"}
          </Text>
        </View>
      </View>
      <View style={s.memberMeta}>
        <Text style={[s.memberStatus, studying && s.memberStatusActive]}>
          {studying ? "공부 중" : "대기"}
        </Text>
        <Text style={s.memberTime}>
          {studying
            ? formatTimer(member.studyStartEpoch ?? undefined, now)
            : "아직 시작 전"}
        </Text>
      </View>
    </View>
  );
}

export default function GroupScreen() {
  const router = useRouter();
  const { theme } = useMonoTheme();
  const insets = useSafeAreaInsets();
  const C = useMemo(() => createGroupTheme(theme), [theme]);
  const s = useMemo(() => createStyles(C), [C]);
  const bottomSpace = getBottomNavSpace(insets.bottom);
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
    const memberPresence = {
      name: member.name,
      color: member.color,
      image: member.image ?? null,
      userType: member.userType ?? "",
      bio: member.bio ?? "",
      ...session,
    };

    const updates: Record<string, unknown> = {};
    for (const room of joinedRooms) {
      updates[`rooms/${room.id}/members/${member.id}`] = {
        ...memberPresence,
        speaking: false,
        joinedAt:
          room.members.find((m) => m.id === member.id)?.joinedAt ?? Date.now(),
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
      joinedAt: alreadyJoined
        ? (room.members.find((m) => m.id === member.id)?.joinedAt ?? Date.now())
        : Date.now(),
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
            joinedAt: createdAt,
          },
        },
      };

      await update(ref(db), {
        [`rooms/${roomId}`]: room,
        [`roomCodes/${code}`]: roomId,
      });

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
      const remainingMembers = selectedRoom.members.filter(
        (m) => m.id !== member.id,
      );

      if (isOwner || remainingMembers.length === 0) {
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
  const lobbyStudyingMembers = rooms.flatMap((room) =>
    room.members.filter(isMemberStudying),
  );
  const lobbyStudyingCount = rooms.reduce(
    (sum, room) => sum + room.members.filter((m) => !!m.studyStartEpoch).length,
    0,
  );
  void tick;
  const now = Date.now();

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
      <View style={s.container}>
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
      <View style={[s.container, s.center]}>
        <ActivityIndicator color={C.textAccent} />
        <Text style={s.loadingText}>방 정보를 불러오는 중...</Text>
        <BottomNav />
      </View>
    );
  }

  const studyingMembers = roomMembers.filter(isMemberStudying);
  const waitingMemberList = roomMembers.filter((m) => !isMemberStudying(m));
  const waitingMembers = waitingMemberList.length;
  const isOwner = selectedRoom.ownerId === member?.id;

  return (
    <View style={s.container}>
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
          totalCount={roomMembers.length}
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

const createStyles = (C: GroupTheme) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: C.bg, paddingTop: 56 },
    center: { justifyContent: "center", alignItems: "center" },
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 18,
      paddingBottom: 14,
    },
    backBtn: {
      width: 34,
      height: 34,
      borderRadius: 12,
      backgroundColor: C.surfaceAlt,
      justifyContent: "center",
      alignItems: "center",
    },
    headerCenter: { flex: 1, alignItems: "center", paddingHorizontal: 8 },
    headerTitle: { color: C.textPrimary, fontSize: 14, fontWeight: "600" },
    headerSub: {
      color: C.textTertiary,
      fontSize: 10,
      fontWeight: "500",
      marginTop: 1,
    },
    headerRight: { flexDirection: "row", alignItems: "center", gap: 6 },
    liveBadge: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      backgroundColor: C.liveSoft,
      borderRadius: 999,
      paddingHorizontal: 8,
      paddingVertical: 4,
    },
    liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: C.live },
    liveText: { color: C.live, fontSize: 9, fontWeight: "700" },
    roomCountBadge: {
      backgroundColor: C.primarySoft,
      borderRadius: 999,
      paddingHorizontal: 9,
      paddingVertical: 5,
    },
    roomCountText: { color: C.textSecondary, fontSize: 10, fontWeight: "600" },
    lobbyContent: { paddingHorizontal: 18, paddingBottom: 104, gap: 12 },
    lobbyHeaderBlock: {
      paddingTop: 2,
      paddingBottom: 6,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    lobbyHeaderTextWrap: { flex: 1, minWidth: 0 },
    lobbyHeaderTitle: { color: C.textPrimary, fontSize: 28, fontWeight: "800" },
    lobbyHeaderDesc: {
      color: C.textSecondary,
      fontSize: 13,
      lineHeight: 19,
      marginTop: 6,
    },
    groupHeroCard: {
      backgroundColor: C.primarySoft,
      borderRadius: 22,
      padding: 15,
      shadowColor: C.shadow,
      shadowOpacity: 0.06,
      shadowRadius: 14,
      shadowOffset: { width: 0, height: 6 },
      elevation: 2,
    },
    groupHeroTop: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      gap: 12,
    },
    heroCopy: { flex: 1, minWidth: 0 },
    groupHeroTitle: {
      color: C.textPrimary,
      fontSize: 20,
      fontWeight: "800",
      marginTop: 9,
    },
    groupHeroDesc: {
      color: C.textSecondary,
      fontSize: 12,
      lineHeight: 17,
      marginTop: 5,
    },
    heroLiveBadge: {
      alignSelf: "flex-start",
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      backgroundColor: C.liveSoft,
      borderRadius: 999,
      paddingHorizontal: 9,
      paddingVertical: 5,
    },
    heroLiveText: { color: C.live, fontSize: 11, fontWeight: "700" },
    heroPeoplePanel: { minWidth: 90, alignItems: "flex-end" },
    heroMetricRow: { flexDirection: "row", gap: 8, marginTop: 13 },
    heroMetricItem: {
      flex: 1,
      backgroundColor: withAlpha(C.surface, "CC"),
      borderRadius: 14,
      paddingVertical: 9,
      alignItems: "center",
    },
    heroMetricValue: {
      color: C.textPrimary,
      fontSize: 17,
      fontWeight: "800",
      fontVariant: ["tabular-nums"],
    },
    heroMetricLabel: {
      color: C.textTertiary,
      fontSize: 10,
      fontWeight: "600",
      marginTop: 3,
    },
    quickJoinCard: {
      backgroundColor: C.surface,
      borderRadius: 18,
      padding: 14,
      shadowColor: C.shadow,
      shadowOpacity: 0.05,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 5 },
      elevation: 2,
    },
    quickJoinTitle: {
      color: C.textPrimary,
      fontSize: 13,
      fontWeight: "700",
      marginBottom: 8,
    },
    quickJoinInputRow: { flexDirection: "row", alignItems: "center", gap: 8 },
    quickJoinInput: {
      flex: 1,
      height: 46,
      backgroundColor: C.surfaceAlt,
      borderRadius: 14,
      color: C.textPrimary,
      fontSize: 17,
      fontWeight: "700",
      letterSpacing: 3,
      textAlign: "center",
      fontVariant: ["tabular-nums"],
    },
    quickJoinButton: {
      width: 62,
      height: 46,
      borderRadius: 14,
      alignItems: "center",
      justifyContent: "center",
    },
    quickJoinButtonActive: { backgroundColor: C.primary },
    quickJoinButtonDisabled: { backgroundColor: C.primarySoft, opacity: 0.58 },
    quickJoinButtonText: { color: C.inverse, fontSize: 13, fontWeight: "700" },
    quickJoinButtonTextDisabled: { color: C.primary },
    memberPreviewRow: {
      flexDirection: "row",
      alignItems: "center",
      minHeight: 28,
    },
    memberPreviewAvatar: {
      width: 28,
      height: 28,
      borderRadius: 14,
      borderWidth: 1.5,
      backgroundColor: C.surface,
      alignItems: "center",
      justifyContent: "center",
    },
    memberPreviewImage: { width: "100%", height: "100%", borderRadius: 14 },
    memberPreviewText: { fontSize: 11, fontWeight: "700" },
    memberPreviewMore: { backgroundColor: C.surfaceAlt, borderColor: C.border },
    memberPreviewMoreText: {
      color: C.textPrimary,
      fontSize: 10,
      fontWeight: "700",
    },
    publicGroupCard: {
      backgroundColor: C.surface,
      borderRadius: 18,
      padding: 15,
      shadowColor: C.shadow,
      shadowOpacity: 0.05,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 5 },
      elevation: 2,
    },
    publicGroupCardDisabled: { opacity: 0.48 },
    publicCardHeader: { flexDirection: "row", alignItems: "center", gap: 10 },
    publicCardIcon: {
      width: 46,
      height: 46,
      borderRadius: 16,
      alignItems: "center",
      justifyContent: "center",
    },
    publicCardEmoji: { fontSize: 17, fontWeight: "700" },
    publicCardInfo: { flex: 1, minWidth: 0 },
    publicCardTitleRow: { flexDirection: "row", alignItems: "center", gap: 7 },
    publicCardName: {
      color: C.textPrimary,
      fontSize: 15,
      fontWeight: "700",
      flex: 1,
    },
    publicCardDesc: {
      color: C.textTertiary,
      fontSize: 11,
      fontWeight: "700",
      marginTop: 4,
    },
    publicCardMetaRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      marginTop: 13,
    },
    liveMiniBadge: {
      flexDirection: "row",
      alignItems: "center",
      gap: 5,
      borderRadius: 999,
      paddingHorizontal: 8,
      paddingVertical: 4,
      backgroundColor: C.liveSoft,
    },
    liveMiniText: { color: C.live, fontSize: 9, fontWeight: "700" },
    publicMetaChip: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      backgroundColor: C.surfaceAlt,
      borderRadius: 999,
      paddingHorizontal: 8,
      paddingVertical: 5,
    },
    publicMetaText: { color: C.textSecondary, fontSize: 11, fontWeight: "600" },
    publicCardFooter: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginTop: 14,
    },
    publicJoinPill: {
      minWidth: 58,
      height: 30,
      borderRadius: 999,
      backgroundColor: C.primarySoft,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 2,
      paddingHorizontal: 9,
    },
    publicJoinPillFull: { backgroundColor: C.surfaceAlt },
    publicJoinText: { color: C.primary, fontSize: 11, fontWeight: "700" },
    publicJoinTextFull: { color: C.textTertiary },
    emptyState: {
      borderRadius: 18,
      backgroundColor: C.surface,
      padding: 22,
      alignItems: "center",
    },
    emptyStateIcon: {
      width: 42,
      height: 42,
      borderRadius: 14,
      backgroundColor: C.primarySoft,
      alignItems: "center",
      justifyContent: "center",
    },
    emptyStateTitle: {
      color: C.textPrimary,
      fontSize: 14,
      fontWeight: "700",
      marginTop: 10,
    },
    emptyStateText: {
      color: C.textSecondary,
      fontSize: 12,
      lineHeight: 18,
      textAlign: "center",
      marginTop: 5,
    },
    floatingCreateButton: {
      position: "absolute",
      left: 20,
      right: 20,
      height: 48,
      borderRadius: 16,
      backgroundColor: C.primary,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 7,
      shadowColor: C.primary,
      shadowOpacity: 0.2,
      shadowRadius: 10,
      shadowOffset: { width: 0, height: 5 },
      elevation: 3,
    },
    floatingCreateText: { color: C.inverse, fontSize: 14, fontWeight: "700" },
    inlineErrorRow: {
      flexDirection: "row",
      alignItems: "center",
      marginTop: 9,
      backgroundColor: C.surfaceAlt,
      borderWidth: 1,
      borderColor: C.border,
      borderRadius: 9,
      paddingHorizontal: 10,
      paddingVertical: 8,
    },
    groupListHeader: {
      flexDirection: "row",
      alignItems: "flex-end",
      justifyContent: "space-between",
      marginTop: 6,
    },
    groupListTitle: { color: C.textPrimary, fontSize: 15, fontWeight: "700" },
    groupListSub: {
      color: C.textTertiary,
      fontSize: 11,
      fontWeight: "700",
      marginTop: 3,
    },
    groupListCount: {
      color: C.textPrimary,
      fontSize: 18,
      fontWeight: "800",
      fontVariant: ["tabular-nums"],
    },
    groupCardList: { gap: 10 },
    errorBanner: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: C.surface,
      borderWidth: 1,
      borderColor: C.border,
      borderRadius: 10,
      paddingHorizontal: 12,
      paddingVertical: 10,
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.45)",
      justifyContent: "flex-end",
    },
    modalCard: {
      width: "100%",
      maxHeight: "92%",
      backgroundColor: C.surface,
      borderTopLeftRadius: 28,
      borderTopRightRadius: 28,
      paddingHorizontal: 20,
      paddingTop: 14,
      paddingBottom: 24,
      gap: 13,
      shadowColor: C.shadow,
      shadowOpacity: 0.16,
      shadowRadius: 22,
      shadowOffset: { width: 0, height: -8 },
      elevation: 10,
    },
    sheetHandle: {
      alignSelf: "center",
      width: 42,
      height: 4,
      borderRadius: 999,
      backgroundColor: C.borderMid,
      marginBottom: 4,
    },
    modalHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    modalIconWrap: {
      width: 38,
      height: 38,
      borderRadius: 13,
      backgroundColor: C.primarySoft,
      justifyContent: "center",
      alignItems: "center",
    },
    modalCloseBtn: {
      width: 30,
      height: 30,
      borderRadius: 15,
      backgroundColor: C.surfaceAlt,
      justifyContent: "center",
      alignItems: "center",
    },
    modalTitle: { color: C.textPrimary, fontSize: 20, fontWeight: "800" },
    modalSubtitle: { color: C.textTertiary, fontSize: 12, lineHeight: 18 },
    formInput: {
      backgroundColor: C.surfaceAlt,
      borderWidth: 1,
      borderColor: C.borderMid,
      borderRadius: 12,
      paddingHorizontal: 14,
      paddingVertical: 13,
      color: C.textPrimary,
      fontSize: 14,
    },
    fieldLabel: {
      color: C.textTertiary,
      fontSize: 10,
      fontWeight: "600",
      letterSpacing: 1,
      marginBottom: 8,
    },
    visibilityRow: { flexDirection: "row", gap: 8 },
    visibilityOption: {
      flex: 1,
      minHeight: 94,
      borderRadius: 16,
      backgroundColor: C.surfaceAlt,
      padding: 12,
      opacity: 0.7,
    },
    visibilityOptionActive: { backgroundColor: C.primarySoft, opacity: 1 },
    visibilityTitleRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 5,
      marginBottom: 7,
    },
    visibilityIconBox: {
      width: 26,
      height: 26,
      borderRadius: 9,
      backgroundColor: C.surface,
      alignItems: "center",
      justifyContent: "center",
    },
    visibilityIconBoxActive: { backgroundColor: C.primary },
    visibilityLabel: {
      color: C.textSecondary,
      fontSize: 12,
      fontWeight: "700",
    },
    visibilityLabelActive: { color: C.textPrimary },
    visibilityDesc: {
      color: C.textTertiary,
      fontSize: 10,
      lineHeight: 15,
      fontWeight: "500",
    },
    visibilityCheck: {
      position: "absolute",
      top: 8,
      right: 8,
      width: 20,
      height: 20,
      borderRadius: 10,
      backgroundColor: C.surface,
      alignItems: "center",
      justifyContent: "center",
    },
    visibilityCheckActive: { backgroundColor: C.primary },
    memberSliderBox: {
      backgroundColor: C.surfaceAlt,
      borderRadius: 16,
      padding: 14,
    },
    memberSliderHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 12,
      marginBottom: 18,
    },
    memberSliderTitle: {
      color: C.textPrimary,
      fontSize: 13,
      fontWeight: "700",
    },
    memberSliderSub: {
      color: C.textTertiary,
      fontSize: 10,
      fontWeight: "700",
      marginTop: 3,
    },
    memberSliderValueWrap: {
      minWidth: 64,
      height: 42,
      borderRadius: 12,
      backgroundColor: C.surface,
      borderWidth: 1,
      borderColor: C.border,
      flexDirection: "row",
      alignItems: "flex-end",
      justifyContent: "center",
      paddingBottom: 6,
    },
    memberSliderValue: {
      color: C.textPrimary,
      fontSize: 24,
      fontWeight: "800",
      lineHeight: 28,
      fontVariant: ["tabular-nums"],
    },
    memberSliderUnit: {
      color: C.textSecondary,
      fontSize: 11,
      fontWeight: "700",
      marginLeft: 2,
      marginBottom: 3,
    },
    memberSliderTrackWrap: { height: 42, justifyContent: "center" },
    memberSliderTrack: {
      height: 6,
      borderRadius: 3,
      backgroundColor: C.border,
      overflow: "hidden",
    },
    memberSliderFill: {
      height: "100%",
      borderRadius: 3,
      backgroundColor: C.primary,
    },
    memberSliderThumb: {
      position: "absolute",
      width: 26,
      height: 26,
      borderRadius: 13,
      marginLeft: -13,
      backgroundColor: C.primary,
      borderWidth: 3,
      borderColor: C.surface,
      shadowColor: C.primary,
      shadowOpacity: 0.24,
      shadowRadius: 8,
      elevation: 4,
    },
    memberSliderRange: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginTop: 2,
    },
    memberSliderRangeText: {
      color: C.textTertiary,
      fontSize: 10,
      fontWeight: "700",
    },
    errorText: { color: C.danger, fontSize: 12, flex: 1 },
    enterBtn: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: C.primary,
      borderRadius: 16,
      paddingVertical: 15,
      minHeight: 52,
      shadowColor: C.primary,
      shadowOpacity: 0.22,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 6 },
      elevation: 4,
    },
    enterBtnText: {
      color: C.inverse,
      fontWeight: "700",
      fontSize: 15,
      letterSpacing: 0.2,
    },
    roomScroll: { flex: 1 },
    roomContent: { paddingHorizontal: 14, paddingBottom: 24, gap: 12 },
    roomHero: {
      backgroundColor: C.primarySoft,
      borderRadius: 24,
      padding: 18,
      shadowColor: C.shadow,
      shadowOpacity: 0.08,
      shadowRadius: 18,
      shadowOffset: { width: 0, height: 8 },
      elevation: 3,
    },
    roomHeroTop: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 14,
    },
    roomHeroBadge: {
      flexDirection: "row",
      alignItems: "center",
      gap: 5,
      backgroundColor: C.liveSoft,
      borderRadius: 999,
      paddingHorizontal: 10,
      paddingVertical: 6,
    },
    roomHeroBadgeText: { color: C.live, fontSize: 10, fontWeight: "700" },
    roomHeroTitle: { color: C.textPrimary, fontSize: 24, fontWeight: "800" },
    roomHeroDesc: {
      color: C.textSecondary,
      fontSize: 12,
      lineHeight: 18,
      marginTop: 6,
    },
    roomHeroFooter: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      marginTop: 14,
    },
    roomHeroMeta: {
      color: C.primary,
      fontSize: 11,
      fontWeight: "700",
      backgroundColor: C.surface,
      borderRadius: 999,
      paddingHorizontal: 10,
      paddingVertical: 6,
    },
    roomHeroPill: {
      color: C.textPrimary,
      fontSize: 11,
      fontWeight: "700",
      backgroundColor: C.surface,
      borderRadius: 999,
      paddingHorizontal: 10,
      paddingVertical: 6,
    },
    inviteCodeCard: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      backgroundColor: C.surface,
      borderRadius: 16,
      padding: 14,
    },
    inviteCodeLabel: {
      color: C.textTertiary,
      fontSize: 10,
      fontWeight: "700",
      letterSpacing: 1,
    },
    inviteCodeValue: {
      color: C.textPrimary,
      fontSize: 22,
      fontWeight: "800",
      letterSpacing: 3,
      marginTop: 3,
    },
    copyCodeButton: {
      height: 36,
      borderRadius: 12,
      backgroundColor: C.primarySoft,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 5,
      paddingHorizontal: 12,
    },
    copyCodeText: { color: C.textPrimary, fontSize: 12, fontWeight: "700" },
    focusSummaryCard: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: C.surface,
      borderRadius: 18,
      paddingVertical: 15,
    },
    focusSummaryItem: { flex: 1, alignItems: "center" },
    focusSummaryValue: {
      color: C.textPrimary,
      fontSize: 22,
      fontWeight: "800",
      fontVariant: ["tabular-nums"],
    },
    focusSummaryValueActive: { color: C.success },
    focusSummaryLabel: {
      color: C.textTertiary,
      fontSize: 10,
      fontWeight: "600",
      marginTop: 3,
    },
    focusSummaryDivider: { width: 1, height: 34, backgroundColor: C.border },
    memberSection: { gap: 8 },
    memberSectionHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginTop: 4,
    },
    memberSectionTitle: {
      color: C.textPrimary,
      fontSize: 15,
      fontWeight: "700",
    },
    memberSectionCount: {
      color: C.textPrimary,
      fontSize: 13,
      fontWeight: "700",
      backgroundColor: C.surfaceAlt,
      borderRadius: 999,
      paddingHorizontal: 9,
      paddingVertical: 4,
    },
    memberList: { gap: 7 },
    memberRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      backgroundColor: C.surface,
      borderRadius: 15,
      padding: 12,
    },
    memberRowIdle: { opacity: 0.74 },
    memberRowMe: { borderWidth: 1, borderColor: C.primary },
    memberAvatar: {
      width: 42,
      height: 42,
      borderRadius: 14,
      borderWidth: 1,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: C.surface,
    },
    memberAvatarImage: { width: "100%", height: "100%", borderRadius: 13 },
    memberAvatarText: { fontSize: 16, fontWeight: "700" },
    memberInfo: { flex: 1, minWidth: 0 },
    memberNameRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 5,
      marginBottom: 5,
    },
    memberName: {
      color: C.textPrimary,
      fontSize: 13,
      fontWeight: "700",
      flexShrink: 1,
    },
    memberType: {
      color: C.primary,
      fontSize: 9,
      fontWeight: "600",
      backgroundColor: C.primarySoft,
      borderRadius: 999,
      paddingHorizontal: 6,
      paddingVertical: 2,
      overflow: "hidden",
      maxWidth: 64,
    },
    memberSubjectRow: { flexDirection: "row", alignItems: "center", gap: 6 },
    studyDot: {
      width: 7,
      height: 7,
      borderRadius: 3.5,
      backgroundColor: C.borderMid,
    },
    studyDotActive: { backgroundColor: C.success },
    memberSubject: {
      color: C.textSecondary,
      fontSize: 11,
      fontWeight: "700",
      flex: 1,
    },
    memberMeta: { alignItems: "flex-end", gap: 4 },
    memberStatus: { color: C.textTertiary, fontSize: 10, fontWeight: "700" },
    memberStatusActive: { color: C.success },
    memberTime: {
      color: C.textSecondary,
      fontSize: 12,
      fontWeight: "600",
      fontVariant: ["tabular-nums"],
    },
    meTag: {
      backgroundColor: C.surface,
      borderWidth: 1,
      borderColor: C.border,
      borderRadius: 3,
      paddingHorizontal: 4,
      paddingVertical: 1,
    },
    meTagText: {
      color: C.textPrimary,
      fontSize: 7,
      fontWeight: "700",
      letterSpacing: 0.5,
    },
    myStatusCard: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      marginTop: 2,
      backgroundColor: C.successSoft,
      borderRadius: 16,
      padding: 12,
    },
    myStatusIcon: {
      width: 38,
      height: 38,
      borderRadius: 12,
      backgroundColor: C.surface,
      alignItems: "center",
      justifyContent: "center",
    },
    myStatusTextWrap: { flex: 1, minWidth: 0 },
    myStatusLabel: {
      color: C.textTertiary,
      fontSize: 10,
      fontWeight: "700",
      marginBottom: 3,
    },
    myStatusText: { color: C.textPrimary, fontSize: 12, fontWeight: "600" },
    controls: { paddingTop: 4, paddingBottom: 24 },
    ctrlBtnDanger: {
      height: 46,
      borderRadius: 16,
      backgroundColor: C.dangerSoft,
      justifyContent: "center",
      alignItems: "center",
      flexDirection: "row",
      gap: 7,
    },
    leaveBtnText: { color: C.danger, fontSize: 13, fontWeight: "700" },
    loadingText: { color: C.textTertiary, fontSize: 12, marginTop: 10 },
    confirmOverlay: {
      flex: 1,
      backgroundColor: C.bg,
      justifyContent: "center",
      alignItems: "center",
      paddingHorizontal: 24,
    },
    confirmCard: {
      width: "100%",
      backgroundColor: C.surface,
      borderWidth: 1,
      borderColor: C.borderMid,
      borderRadius: 18,
      padding: 22,
      alignItems: "center",
    },
    confirmIcon: {
      width: 48,
      height: 48,
      borderRadius: 14,
      backgroundColor: C.surface,
      borderWidth: 1,
      borderColor: C.border,
      justifyContent: "center",
      alignItems: "center",
      marginBottom: 14,
    },
    confirmTitle: {
      color: C.textPrimary,
      fontSize: 17,
      fontWeight: "800",
      textAlign: "center",
      marginBottom: 8,
    },
    confirmDesc: {
      color: C.textSecondary,
      fontSize: 12,
      lineHeight: 18,
      textAlign: "center",
      marginBottom: 18,
    },
    confirmActions: { flexDirection: "row", gap: 10, width: "100%" },
    confirmCancelBtn: {
      flex: 1,
      height: 48,
      borderRadius: 12,
      backgroundColor: C.surfaceAlt,
      borderWidth: 1,
      borderColor: C.border,
      justifyContent: "center",
      alignItems: "center",
    },
    confirmCancelText: {
      color: C.textSecondary,
      fontSize: 14,
      fontWeight: "800",
    },
    confirmLeaveBtn: {
      flex: 1,
      height: 48,
      borderRadius: 12,
      backgroundColor: C.surface,
      justifyContent: "center",
      alignItems: "center",
      borderWidth: 1,
      borderColor: C.border,
    },
    confirmLeaveDangerBtn: {
      backgroundColor: C.surface,
      borderWidth: 1,
      borderColor: C.border,
    },
    confirmLeaveText: { color: C.textPrimary, fontSize: 14, fontWeight: "800" },
  });
