export const defaultCategoryColors: Record<string, string> = {
  Casa: "#38BDF8",
  Comida: "#22C55E",
  Transporte: "#F59E0B",
  Salud: "#EF4444",
  Ocio: "#A855F7",
  "Bizum recibido": "#10B981",
  "Bizum enviado": "#F97316",
  Devoluciones: "#14B8A6",
  "Pendiente de cobrar": "#DC2626",
  Otros: "#64748B",
};

export const colorOptions = [
  "#38BDF8",
  "#22C55E",
  "#F59E0B",
  "#EF4444",
  "#A855F7",
  "#10B981",
  "#F97316",
  "#14B8A6",
  "#64748B",
];

export const normalizeColor = (value?: string | null) => {
  const raw = (value || "").trim();
  if (!raw) return "";

  if (/^#[0-9a-f]{6}$/i.test(raw)) return raw.toUpperCase();

  const rgbMatch = raw.match(
    /^rgb\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*\)$/i,
  );

  if (!rgbMatch) return "";

  const parts = rgbMatch.slice(1).map((part) => {
    const value = Math.max(0, Math.min(255, Number(part)));
    return value.toString(16).padStart(2, "0");
  });

  return `#${parts.join("")}`.toUpperCase();
};

export const getCategoryColor = (
  category: string,
  customColors: Record<string, string> = {},
) => {
  return (
    normalizeColor(customColors[category]) ||
    defaultCategoryColors[category] ||
    defaultCategoryColors.Otros
  );
};

export const getCategorySoftColor = (categoryColor: string) => {
  const normalized = normalizeColor(categoryColor);
  if (!normalized) return "rgba(100, 116, 139, 0.14)";

  const r = parseInt(normalized.slice(1, 3), 16);
  const g = parseInt(normalized.slice(3, 5), 16);
  const b = parseInt(normalized.slice(5, 7), 16);

  return `rgba(${r}, ${g}, ${b}, 0.16)`;
};
