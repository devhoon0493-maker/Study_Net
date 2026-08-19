import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export const THEME_STORAGE_KEY = "studynet_theme_mode";

export type MonoMode = "light" | "dark";

export type MonoTheme = {
  mode: MonoMode;
  bg: string;
  surface: string;
  surfaceAlt: string;
  elevated: string;
  border: string;
  borderSoft: string;
  text: string;
  muted: string;
  subtle: string;
  inverse: string;
  primary: string;
  primarySoft: string;
  success: string;
  successSoft: string;
  warning: string;
  warningSoft: string;
  danger: string;
  dangerSoft: string;
  live: string;
  liveSoft: string;
  shadow: string;
  statusBar: "dark-content" | "light-content";
};

type MonoThemeContextValue = {
  theme: MonoTheme;
  mode: MonoMode;
  isDark: boolean;
  setMode: (mode: MonoMode) => Promise<void>;
  toggleMode: (enabled: boolean) => Promise<void>;
};

export const monoLight: MonoTheme = {
  mode: "light",
  bg: "#F6F7FB",
  surface: "#FFFFFF",
  surfaceAlt: "#F1F5F9",
  elevated: "#FFFFFF",
  border: "#E2E8F0",
  borderSoft: "#F1F5F9",
  text: "#0F172A",
  muted: "#64748B",
  subtle: "#64748B",
  inverse: "#FFFFFF",
  primary: "#4F46E5",
  primarySoft: "#EEF2FF",
  success: "#10B981",
  successSoft: "#ECFDF5",
  warning: "#F59E0B",
  warningSoft: "#FFFBEB",
  danger: "#B91C1C",
  dangerSoft: "#FEF2F2",
  live: "#B91C1C",
  liveSoft: "#FEF2F2",
  shadow: "#0F172A",
  statusBar: "dark-content",
};

export const monoDark: MonoTheme = {
  mode: "dark",
  bg: "#070A12",
  surface: "#111827",
  surfaceAlt: "#182133",
  elevated: "#151E2F",
  border: "#263244",
  borderSoft: "#1E293B",
  text: "#F8FAFC",
  muted: "#CBD5E1",
  subtle: "#94A3B8",
  inverse: "#070A12",
  primary: "#818CF8",
  primarySoft: "rgba(129,140,248,0.18)",
  success: "#34D399",
  successSoft: "rgba(52,211,153,0.16)",
  warning: "#FBBF24",
  warningSoft: "rgba(251,191,36,0.16)",
  danger: "#F87171",
  dangerSoft: "rgba(248,113,113,0.16)",
  live: "#F87171",
  liveSoft: "rgba(248,113,113,0.16)",
  shadow: "#000000",
  statusBar: "light-content",
};

export const mono = monoLight;

const MonoThemeContext = createContext<MonoThemeContextValue>({
  theme: monoLight,
  mode: "light",
  isDark: false,
  setMode: async () => {},
  toggleMode: async () => {},
});

export function MonoThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<MonoMode>("light");

  useEffect(() => {
    const loadMode = async () => {
      const saved = await AsyncStorage.getItem(THEME_STORAGE_KEY);
      if (saved === "dark" || saved === "light") {
        setModeState(saved);
      }
    };

    loadMode();
  }, []);

  const setMode = useCallback(async (nextMode: MonoMode) => {
    setModeState(nextMode);
    await AsyncStorage.setItem(THEME_STORAGE_KEY, nextMode);
  }, []);

  const toggleMode = useCallback(
    async (enabled: boolean) => {
      await setMode(enabled ? "dark" : "light");
    },
    [setMode],
  );

  const theme = mode === "dark" ? monoDark : monoLight;

  const value = useMemo(
    () => ({
      theme,
      mode,
      isDark: mode === "dark",
      setMode,
      toggleMode,
    }),
    [mode, setMode, theme, toggleMode],
  );

  return (
    <MonoThemeContext.Provider value={value}>
      {children}
    </MonoThemeContext.Provider>
  );
}

export const useMonoTheme = () => useContext(MonoThemeContext);
