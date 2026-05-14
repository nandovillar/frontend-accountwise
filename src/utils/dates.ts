export const getTodayDate = () => {
  return new Date().toISOString().slice(0, 10);
};

export const getCurrentMonth = () => {
  return getTodayDate().slice(0, 7);
};

export const getNextYearDate = () => {
  const date = new Date();
  date.setFullYear(date.getFullYear() + 1);
  return date.toISOString().slice(0, 10);
};

export const getDateFromMonthAndDay = (
  month: string,
  day: number | string,
) => {
  return `${month}-${String(day || 1).padStart(2, "0")}`;
};

export const getDayFromDate = (date: string) => {
  return Number(date.slice(8, 10));
};

export const getMonthFromDate = (date: string) => {
  return date.slice(0, 7);
};

export const addMonths = (monthValue: string, offset: number) => {
  const [year, month] = monthValue.split("-").map(Number);

  let newYear = year;
  let newMonth = month + offset;

  if (newMonth < 1) {
    newMonth = 12;
    newYear -= 1;
  }

  if (newMonth > 12) {
    newMonth = 1;
    newYear += 1;
  }

  return `${newYear}-${String(newMonth).padStart(2, "0")}`;
};

const capitalize = (value: string) =>
  value ? value.charAt(0).toUpperCase() + value.slice(1) : value;

export const formatMonthText = (monthValue: string) => {
  const [year, month] = monthValue.split("-").map(Number);
  if (!year || !month) return monthValue;

  const value = new Date(year, month - 1, 1).toLocaleDateString("es-ES", {
    month: "long",
    year: "numeric",
  });

  return capitalize(value);
};

export const formatDateText = (dateValue: string) => {
  const [year, month, day] = dateValue.split("-").map(Number);
  if (!year || !month || !day) return dateValue;

  return new Date(year, month - 1, day).toLocaleDateString("es-ES", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
};
