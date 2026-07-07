import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import type { ActiveSessionData } from "./homeTypes";
import { ACTIVE_SESSION_KEY } from "./homeUtils";

type SessionContextValue = {
  session: ActiveSessionData | null;
  elapsed: number;
  hasActiveSession: boolean;
  refresh: () => Promise<void>;
};

export const SessionContext = createContext<SessionContextValue>({
  session: null,
  elapsed: 0,
  hasActiveSession: false,
  refresh: async () => {},
});

export function SessionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<ActiveSessionData | null>(null);
  const [elapsed, setElapsed] = useState(0);

  const sessionRef = useRef<ActiveSessionData | null>(null);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollCount = useRef(0);

  const refresh = useCallback(async () => {
    try {
      const raw = await AsyncStorage.getItem(ACTIVE_SESSION_KEY);
      if (raw) {
        const data: ActiveSessionData = JSON.parse(raw);
        sessionRef.current = data;
        setSession(data);
        setElapsed(Math.floor((Date.now() - data.startEpoch) / 1000));
      } else {
        sessionRef.current = null;
        setSession(null);
        setElapsed(0);
      }
    } catch {}
  }, []);

  useEffect(() => {
    refresh();

    tickRef.current = setInterval(() => {
      if (sessionRef.current) {
        setElapsed(Math.floor((Date.now() - sessionRef.current.startEpoch) / 1000));
      }

      pollCount.current += 1;
      if (pollCount.current % 5 === 0) {
        refresh();
      }
    }, 1000);

    return () => {
      if (tickRef.current) clearInterval(tickRef.current);
    };
  }, [refresh]);

  const value = useMemo(
    () => ({ session, elapsed, hasActiveSession: !!session, refresh }),
    [elapsed, refresh, session],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}
