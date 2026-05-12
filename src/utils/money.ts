export const formatMoney = (value: number) => {
  return `${value.toLocaleString("es-ES", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} €`;
};

export const formatCompactMoney = (value: number) => {
  return `${Math.round(value).toLocaleString("es-ES")} €`;
};
