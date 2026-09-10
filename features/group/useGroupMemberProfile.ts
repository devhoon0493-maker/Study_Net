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
    let authRunId = 0;

    const loadLocalMember = async () => {
      const raw = await AsyncStorage.getItem(MEMBER_KEY);
      if (raw) {
        try {
          setMember(JSON.parse(raw));
          return;
        } catch {
          await AsyncStorage.removeItem(MEMBER_KEY);
        }
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
      const currentRunId = ++authRunId;
      profileUnsubscribe?.();
      profileUnsubscribe = null;

      if (!user) {
        loadLocalMember();
        return;
      }

      const prepareFallbackMember = async () => {
        const raw = await AsyncStorage.getItem(MEMBER_KEY);
        let storedMember: StoredMember | null = null;

        if (raw) {
          try {
            storedMember = JSON.parse(raw) as StoredMember;
          } catch {
            await AsyncStorage.removeItem(MEMBER_KEY);
          }
        }

        if (currentRunId !== authRunId) return null;

        const matchingStoredMember =
          storedMember?.id === user.uid ? storedMember : null;
        const fallbackMember = {
          id: user.uid,
          name:
            matchingStoredMember?.name ||
            user.displayName ||
            user.email?.split("@")[0] ||
            "학생",
          color: matchingStoredMember?.color || getColorFromId(user.uid),
          image: user.photoURL ?? matchingStoredMember?.image ?? null,
          userType: matchingStoredMember?.userType ?? "",
          bio: matchingStoredMember?.bio ?? "",
        };
        await AsyncStorage.setItem(MEMBER_KEY, JSON.stringify(fallbackMember));
        setMember(fallbackMember);
        return fallbackMember;
      };

      void prepareFallbackMember().then(() => {
        if (currentRunId !== authRunId) return;

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
        }, (error) => {
          console.warn("Group member profile sync failed:", error);
        });
      });
    });

    return () => {
      authRunId += 1;
      authUnsubscribe();
      profileUnsubscribe?.();
    };
  }, []);

  return member;
}
