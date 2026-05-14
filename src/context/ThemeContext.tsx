import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  applyThemeColors,
  defaultThemeId,
  ThemeId,
  themeOptions,
  themePalettes,
} from "@/src/theme/colors";
import { supabase } from "@/src/lib/supabase";

const getThemeStorageKey = (userId?: string) =>
  userId ? `accountwise-theme:${userId}` : "accountwise-theme";

type ThemeContextValue = {
  themeId: ThemeId;
  setThemeId: (themeId: ThemeId) => Promise<void>;
  options: typeof themeOptions;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

const isThemeId = (value: string | null): value is ThemeId =>
  Boolean(value && value in themePalettes);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [themeIdState, setThemeIdState] = useState<ThemeId>(defaultThemeId);
  const [currentUserId, setCurrentUserId] = useState<string | undefined>();

  useEffect(() => {
    const loadTheme = async (userId?: string) => {
      setCurrentUserId(userId);
      const storedTheme = await AsyncStorage.getItem(getThemeStorageKey(userId));
      const nextTheme = isThemeId(storedTheme) ? storedTheme : defaultThemeId;

      applyThemeColors(nextTheme);
      setThemeIdState(nextTheme);
    };

    supabase.auth.getSession().then(({ data }) => loadTheme(data.session?.user.id));

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      loadTheme(session?.user.id);
    });

    return () => subscription.unsubscribe();
  }, []);

  const setThemeId = useCallback(async (nextThemeId: ThemeId) => {
    applyThemeColors(nextThemeId);
    setThemeIdState(nextThemeId);
    await AsyncStorage.setItem(getThemeStorageKey(currentUserId), nextThemeId);
  }, [currentUserId]);

  const value = useMemo(
    () => ({
      themeId: themeIdState,
      setThemeId,
      options: themeOptions,
    }),
    [setThemeId, themeIdState],
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

export const useAppTheme = () => {
  const context = useContext(ThemeContext);

  if (!context) {
    throw new Error("useAppTheme must be used within ThemeProvider");
  }

  return context;
};
