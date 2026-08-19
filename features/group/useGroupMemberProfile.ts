import AsyncStorage from "@react-native-async-storage/async-storage";
import { onAuthStateChanged } from "firebase/auth";
import { onValue, ref } from "firebase/database";
import { useEffect, useState } from "react";

import { auth, db } from "../../utils/firebaseConfig";
import { COLORS, MEMBER_KEY } from "./groupConstants";
import type { StoredMember } from "./groupTypes";
import { getColorFromId } from "./groupUtils";

export function useGroupMemberProfile() {
  const [member, setMember] = useState<StoredMember | null>(null);

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

  return member;
}
