export type ThemeId = "aqua-light" | "mint-light" | "navy-dark" | "graphite-dark";

export type AppColors = {
  background: string;
  surface: string;
  card: string;
  primary: string;
  primaryDark: string;
  primarySoft: string;
  text: string;
  mutedText: string;
  border: string;
  borderSoft: string;
  success: string;
  danger: string;
  warning: string;
  white: string;
};

export const themeOptions: {
  id: ThemeId;
  name: string;
  description: string;
  mode: "Claro" | "Oscuro";
}[] = [
  {
    id: "aqua-light",
    name: "Aqua",
    description: "Claro turquesa",
    mode: "Claro",
  },
  {
    id: "mint-light",
    name: "Menta",
    description: "Claro verde suave",
    mode: "Claro",
  },
  {
    id: "navy-dark",
    name: "Noche",
    description: "Oscuro azul",
    mode: "Oscuro",
  },
  {
    id: "graphite-dark",
    name: "Grafito",
    description: "Oscuro neutro",
    mode: "Oscuro",
  },
];

export const themePalettes: Record<ThemeId, AppColors> = {
  "aqua-light": {
    background: "#F3FBFC",
    surface: "#FFFFFF",
    card: "#FFFFFF",
    primary: "#06B6D4",
    primaryDark: "#075E72",
    primarySoft: "#DFFAFE",
    text: "#0F172A",
    mutedText: "#64748B",
    border: "#CFFAFE",
    borderSoft: "#E5F8FA",
    success: "#16A34A",
    danger: "#DC2626",
    warning: "#F59E0B",
    white: "#FFFFFF",
  },
  "mint-light": {
    background: "#F6FCF8",
    surface: "#FFFFFF",
    card: "#FFFFFF",
    primary: "#10B981",
    primaryDark: "#166534",
    primarySoft: "#DCFCE7",
    text: "#111827",
    mutedText: "#667085",
    border: "#BBF7D0",
    borderSoft: "#EAFBF0",
    success: "#16A34A",
    danger: "#DC2626",
    warning: "#D97706",
    white: "#FFFFFF",
  },
  "navy-dark": {
    background: "#08111F",
    surface: "#101B2D",
    card: "#101B2D",
    primary: "#38BDF8",
    primaryDark: "#7DD3FC",
    primarySoft: "#1E3A5F",
    text: "#E5EDF7",
    mutedText: "#A8B3C7",
    border: "#24415F",
    borderSoft: "#182A40",
    success: "#4ADE80",
    danger: "#F87171",
    warning: "#FBBF24",
    white: "#FFFFFF",
  },
  "graphite-dark": {
    background: "#101113",
    surface: "#1A1C20",
    card: "#1A1C20",
    primary: "#A3E635",
    primaryDark: "#D9F99D",
    primarySoft: "#27351C",
    text: "#F4F4F5",
    mutedText: "#B4B6BE",
    border: "#343942",
    borderSoft: "#25282E",
    success: "#86EFAC",
    danger: "#FCA5A5",
    warning: "#FDE68A",
    white: "#FFFFFF",
  },
};

export const defaultThemeId: ThemeId = "aqua-light";

export const colors: AppColors = { ...themePalettes[defaultThemeId] };

export const applyThemeColors = (themeId: ThemeId) => {
  Object.assign(colors, themePalettes[themeId]);
};
