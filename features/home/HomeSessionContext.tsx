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

const getSessionElapsed = (session: ActiveSessionData) => {
  if (session.running === false) return Math.max(0, session.savedSeconds ?? 0);
  if (typeof session.startEpoch !== "number") return Math.max(0, session.savedSeconds ?? 0);
  return Math.max(0, Math.floor((Date.now() - session.startEpoch) / 1000));
};

export function SessionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<ActiveSessionData | null>(null);
  const [elapsed, setElapsed] = useState(0);

  const sessionRef = useRef<ActiveSessionData | null>(null);
  const pollCount = useRef(0);

  const refresh = useCallback(async () => {
    try {
      const raw = await AsyncStorage.getItem(ACTIVE_SESSION_KEY);
      if (raw) {
        const data: ActiveSessionData = JSON.parse(raw);
        sessionRef.current = data;
        setSession(data);
        setElapsed(getSessionElapsed(data));
      } else {
        sessionRef.current = null;
        setSession(null);
        setElapsed(0);
      }
    } catch {
      sessionRef.current = null;
      setSession(null);
      setElapsed(0);
    }
  }, []);

  useEffect(() => {
    refresh();

    const timer = setInterval(() => {
      if (sessionRef.current) {
        setElapsed(getSessionElapsed(sessionRef.current));
      }

      pollCount.current += 1;
      if (pollCount.current % 5 === 0) {
        refresh();
      }
    }, 1000);

    return () => {
      clearInterval(timer);
    };
  }, [refresh]);

  const value = useMemo(
    () => ({ session, elapsed, hasActiveSession: !!session, refresh }),
    [elapsed, refresh, session],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}
