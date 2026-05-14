export const parseMoneyInput = (value: string | number | null | undefined) => {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  if (!value) return 0;

  const compact = String(value).trim().replace(/\s/g, "");
  const hasComma = compact.includes(",");
  const hasDot = compact.includes(".");
  const normalized =
    hasComma && hasDot
      ? compact.replace(/\./g, "").replace(",", ".")
      : hasComma
        ? compact.replace(",", ".")
        : compact;

  const parsed = Number(normalized);

  return Number.isFinite(parsed) ? parsed : 0;
};

export const formatMoney = (value: number) => {
  return `${value.toLocaleString("es-ES", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} €`;
};

export const formatCompactMoney = (value: number) => {
  return `${Math.round(value).toLocaleString("es-ES")} €`;
};
