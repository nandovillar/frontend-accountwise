import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  createContext,
  ReactNode,
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

const THEME_STORAGE_KEY = "accountwise-theme";

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

  useEffect(() => {
    const loadTheme = async () => {
      const storedTheme = await AsyncStorage.getItem(THEME_STORAGE_KEY);
      const nextTheme = isThemeId(storedTheme) ? storedTheme : defaultThemeId;

      applyThemeColors(nextTheme);
      setThemeIdState(nextTheme);
    };

    loadTheme();
  }, []);

  const setThemeId = async (nextThemeId: ThemeId) => {
    applyThemeColors(nextThemeId);
    setThemeIdState(nextThemeId);
    await AsyncStorage.setItem(THEME_STORAGE_KEY, nextThemeId);
  };

  const value = useMemo(
    () => ({
      themeId: themeIdState,
      setThemeId,
      options: themeOptions,
    }),
    [themeIdState],
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
