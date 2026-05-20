import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import { Header } from "@react-navigation/elements";
import { useFocusEffect } from "@react-navigation/native";
import { router } from "expo-router";
import {
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { ActionNotice } from "@/src/components/ActionNotice";
import { DataState } from "@/src/components/DataState";
import { EmptyState } from "@/src/components/EmptyState";
import { SpaceMenuButton } from "@/src/components/SpaceSwitcher";
import { useSpaces } from "@/src/context/SpaceContext";
import { useAppTheme } from "@/src/context/ThemeContext";
import { supabase } from "@/src/lib/supabase";
import { colors } from "@/src/theme/colors";
import { createCommonStyles } from "@/src/theme/commonStyles";
import {
  addMonths,
  formatDateText,
  formatMonthText,
  getCurrentMonth,
  getDateFromMonthAndDay,
  getDayFromDate,
  getMonthFromDate,
  getTodayDate,
} from "@/src/utils/dates";
import { getCurrentUser } from "@/src/utils/auth";
import {
  colorOptions,
  getCategoryColor,
  getCategorySoftColor,
  normalizeColor,
} from "@/src/utils/categoryColors";
import { confirmAction } from "@/src/utils/confirmAction";
import { formatCompactMoney, parseMoneyInput } from "@/src/utils/money";
import {
  canDeleteExpense,
  canEditExpense,
  canEditSharedFixedDetails,
  canMoveExpense,
} from "@/src/utils/permissions";
import { applySpaceFilter, getSpacePayload } from "@/src/utils/spaceQueries";

import {
  Alert,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from "react-native";

const defaultCategories = [
  "Casa",
  "Comida",
  "Transporte",
  "Salud",
  "Ocio",
  "Regalos",
];

type EditingType = "fixed" | "variable" | null;
type ExpenseSectionType = "fixed" | "variable";
type FixedPaidFilter = "Todas" | "Pagados" | "Pendientes";
type ExpenseDetail = {
  item: any;
  type: ExpenseSectionType;
} | null;

const sectionTitleDefaults: Record<ExpenseSectionType, string> = {
  fixed: "Gastos fijos",
  variable: "Otros gastos",
};

const getSectionTitlesStorageKey = (userId: string) => {
  return `accountwise:expense-section-titles:${userId}`;
};

const parseSectionTitles = (
  value: string | null,
): Partial<Record<ExpenseSectionType, string>> | null => {
  if (!value) return null;

  try {
    return JSON.parse(value) as Partial<Record<ExpenseSectionType, string>>;
  } catch {
    return null;
  }
};

const getExpenseDuplicateKey = (item: any) => {
  return [
    String(item.title || "").trim().toLowerCase(),
    Number(item.amount || 0),
    Number(item.day_of_month || 1),
    String(item.category || "Otros").trim().toLowerCase(),
  ].join("|");
};

export default function TabTwoScreen() {
  const { activeSpaceId, recordActivity, spaces } = useSpaces();
  const { themeId } = useAppTheme();
  const { width } = useWindowDimensions();
  const isDesktop = width >= 1024;

  const commonStyles = useMemo(() => {
    void themeId;
    return createCommonStyles(isDesktop);
  }, [isDesktop, themeId]);

  const styles = useMemo(() => {
    void themeId;
    return createStyles(isDesktop);
  }, [isDesktop, themeId]);

  const normalizeCategory = (category?: string) => {
    if (!category || category === "General") return "Otros";
    return category;
  };

  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonth());
  const [actionMessage, setActionMessage] = useState("");
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [dataError, setDataError] = useState("");
  const [hasLoadedData, setHasLoadedData] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [isActionBusy, setIsActionBusy] = useState(false);
  const actionBusyRef = useRef(false);

  const [salary, setSalary] = useState(0);
  const [salaryInput, setSalaryInput] = useState("");
  const [editingSalary, setEditingSalary] = useState(false);

  const [expenses, setExpenses] = useState<any[]>([]);
  const [incomeTransactions, setIncomeTransactions] = useState<any[]>([]);
  const [fixedExpenses, setFixedExpenses] = useState<any[]>([]);

  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [variableDate, setVariableDate] = useState(getTodayDate());
  const [variableCategory, setVariableCategory] = useState("Otros");

  const [fixedTitle, setFixedTitle] = useState("");
  const [fixedAmount, setFixedAmount] = useState("");
  const [fixedDate, setFixedDate] = useState(
    getDateFromMonthAndDay(getCurrentMonth(), 1),
  );
  const [fixedCategory, setFixedCategory] = useState("Otros");
  const [fixedAutoPay, setFixedAutoPay] = useState(true);

  const [categories, setCategories] = useState<string[]>([]);
  const [newCategory, setNewCategory] = useState("");
  const [newCategoryColor, setNewCategoryColor] = useState(colorOptions[0]);
  const [categoryColors, setCategoryColors] = useState<Record<string, string>>(
    {},
  );
  const [categoryColorDrafts, setCategoryColorDrafts] = useState<
    Record<string, string>
  >({});
  const [expandedColorEditors, setExpandedColorEditors] = useState<
    Record<string, boolean>
  >({});

  const [fixedFilterCategory, setFixedFilterCategory] = useState("Todas");
  const [fixedCategorySearch, setFixedCategorySearch] = useState("");
  const [fixedPaidFilter, setFixedPaidFilter] =
    useState<FixedPaidFilter>("Todas");
  const [variableFilterCategory, setVariableFilterCategory] = useState("Todas");
  const [variableCategorySearch, setVariableCategorySearch] = useState("");
  const [showFixedFilter, setShowFixedFilter] = useState(false);
  const [showVariableFilter, setShowVariableFilter] = useState(false);
  const [showCategoryManager, setShowCategoryManager] = useState(false);

  const [showAddFixed, setShowAddFixed] = useState(false);
  const [showAddVariable, setShowAddVariable] = useState(false);
  const [bizumModalType, setBizumModalType] = useState<
    "received" | "sent" | "refund" | "owed" | null
  >(null);
  const [bizumName, setBizumName] = useState("");
  const [bizumConcept, setBizumConcept] = useState("");
  const [bizumAmount, setBizumAmount] = useState("");

  const [showFixedSection, setShowFixedSection] = useState(false);
  const [showVariableSection, setShowVariableSection] = useState(false);

  const [fixedSectionTitle, setFixedSectionTitle] = useState(
    sectionTitleDefaults.fixed,
  );
  const [variableSectionTitle, setVariableSectionTitle] =
    useState(sectionTitleDefaults.variable);
  const [editingSectionTitle, setEditingSectionTitle] = useState<
    ExpenseSectionType | null
  >(null);

  const [editingType, setEditingType] = useState<EditingType>(null);
  const [editingItem, setEditingItem] = useState<any | null>(null);
  const [detailExpense, setDetailExpense] = useState<ExpenseDetail>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editAmount, setEditAmount] = useState("");
  const [editDate, setEditDate] = useState("");
  const [editCategory, setEditCategory] = useState("Otros");
  const [editAutoPay, setEditAutoPay] = useState(true);

  const [showEditCategoryDropdown, setShowEditCategoryDropdown] =
    useState(false);

  const [calendarVisible, setCalendarVisible] = useState(false);
  const [calendarTarget, setCalendarTarget] = useState<
    "fixedCreate" | "variableCreate" | "spaceIncome" | "edit" | null
  >(null);
  const [calendarMonth, setCalendarMonth] = useState(getCurrentMonth());
  const [movingExpenseKey, setMovingExpenseKey] = useState<string | null>(null);
  const [spaceIncomeAmount, setSpaceIncomeAmount] = useState("");
  const [spaceIncomeDate, setSpaceIncomeDate] = useState(getTodayDate());
  const [spaceIncomeNote, setSpaceIncomeNote] = useState("");
  const [spaceIncomeTotal, setSpaceIncomeTotal] = useState(0);
  const [spaceIncomeModalVisible, setSpaceIncomeModalVisible] = useState(false);

  const showActionMessage = (message: string) => {
    setActionMessage(message);
    setTimeout(() => setActionMessage(""), 2600);
  };

  const sortCategories = (items: string[]) => {
    const normalized = items.map(normalizeCategory);
    const unique = Array.from(new Set(normalized.filter(Boolean)));

    return [
      ...defaultCategories.filter((item) => unique.includes(item)),
      ...unique
        .filter((item) => !defaultCategories.includes(item))
        .sort((a, b) => a.localeCompare(b)),
    ];
  };

  const loadSectionTitles = async () => {
    const user = await getCurrentUser();

    if (!user) return;

    const storageKey = getSectionTitlesStorageKey(user.id);
    const storedTitles = await AsyncStorage.getItem(
      storageKey,
    );
    const localTitles = parseSectionTitles(storedTitles);

    const { data: remoteTitles } = await supabase
      .from("user_preferences")
      .select("expense_fixed_title, expense_variable_title")
      .eq("user_id", user.id)
      .maybeSingle();

    const nextTitles = {
      fixed:
        remoteTitles?.expense_fixed_title ||
        localTitles?.fixed ||
        sectionTitleDefaults.fixed,
      variable:
        remoteTitles?.expense_variable_title ||
        localTitles?.variable ||
        sectionTitleDefaults.variable,
    };

    setFixedSectionTitle(nextTitles.fixed);
    setVariableSectionTitle(nextTitles.variable);
    await AsyncStorage.setItem(storageKey, JSON.stringify(nextTitles));
  };

  const saveSectionTitles = async (
    titles: Record<ExpenseSectionType, string>,
  ) => {
    const user = await getCurrentUser();

    if (!user) return;

    await AsyncStorage.setItem(
      getSectionTitlesStorageKey(user.id),
      JSON.stringify(titles),
    );

    await supabase.from("user_preferences").upsert({
      user_id: user.id,
      expense_fixed_title: titles.fixed,
      expense_variable_title: titles.variable,
      updated_at: new Date().toISOString(),
    });
  };

  const updateSectionTitle = (type: ExpenseSectionType, value: string) => {
    const nextTitles = {
      fixed: type === "fixed" ? value : fixedSectionTitle,
      variable: type === "variable" ? value : variableSectionTitle,
    };

    if (type === "fixed") {
      setFixedSectionTitle(value);
    } else {
      setVariableSectionTitle(value);
    }

    saveSectionTitles(nextTitles);
  };

  const openCalendar = (
    target: "fixedCreate" | "variableCreate" | "spaceIncome" | "edit",
    currentDate: string,
  ) => {
    setCalendarTarget(target);
    setCalendarMonth(currentDate.slice(0, 7));
    setCalendarVisible(true);
  };

  const selectCalendarDate = (date: string) => {
    if (calendarTarget === "fixedCreate") setFixedDate(date);
    if (calendarTarget === "variableCreate") setVariableDate(date);
    if (calendarTarget === "spaceIncome") setSpaceIncomeDate(date);
    if (calendarTarget === "edit") setEditDate(date);

    setCalendarVisible(false);
    setCalendarTarget(null);
  };

  const changeCalendarMonth = (offset: number) => {
    setCalendarMonth((current) => addMonths(current, offset));
  };

  const confirmAdvanceMonth = async (newMonth: string) => {
    const allowedNextMonth = addMonths(getCurrentMonth(), 1);

    if (newMonth <= allowedNextMonth) return true;

    if (Platform.OS === "web") {
      return window.confirm(
        "Vas a avanzar a un mes posterior al mes siguiente. ¿Quieres continuar?",
      );
    }

    return new Promise<boolean>((resolve) => {
      Alert.alert(
        "Avanzar mes",
        "Vas a avanzar a un mes posterior al mes siguiente. ¿Quieres continuar?",
        [
          { text: "Cancelar", style: "cancel", onPress: () => resolve(false) },
          { text: "Continuar", onPress: () => resolve(true) },
        ],
      );
    });
  };

  const loadIncome = async () => {
    const user = await getCurrentUser();

    if (!user) return;
    setCurrentUserId(user.id);

    if (activeSpaceId) {
      const { data } = await supabase
        .from("space_settings")
        .select("monthly_income")
        .eq("space_id", activeSpaceId)
        .maybeSingle();

      const { data: incomeRows } = await supabase
        .from("space_contributions")
        .select("amount")
        .eq("space_id", activeSpaceId)
        .eq("month", selectedMonth);
      const contributionTotal =
        incomeRows?.reduce(
          (sum: number, item: { amount: number }) =>
            sum + Number(item.amount || 0),
          0,
        ) || 0;

      setSpaceIncomeTotal(contributionTotal);
      setSalary(Number(data?.monthly_income || 0) + contributionTotal);
      return;
    }

    setSpaceIncomeTotal(0);

    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .maybeSingle();

    if (!data) {
      await supabase.from("profiles").insert({ id: user.id, salary: 0 });
      setSalary(0);
      return;
    }

    setSalary(Number(data.salary || 0));
  };

  const loadCategories = async () => {
    const user = await getCurrentUser();

    if (!user) return;

    const categoriesQuery = supabase
      .from("expense_categories")
      .select("name, color")
      .order("name", { ascending: true });
    let { data, error } = await applySpaceFilter(
      categoriesQuery,
      user.id,
      activeSpaceId,
    );

    if (error && String(error.message || "").includes("color")) {
      const fallbackQuery = supabase
        .from("expense_categories")
        .select("name")
        .order("name", { ascending: true });
      const fallback = await applySpaceFilter(
        fallbackQuery,
        user.id,
        activeSpaceId,
      );
      data = fallback.data;
      error = fallback.error;
    }

    if (error) {
      setCategories(defaultCategories);
      setCategoryColors({});
      return;
    }

    if (!data || data.length === 0) {
      setCategories(defaultCategories);
      setCategoryColors({});
      return;
    }

    const loaded = data.map((item: { name: string; color?: string }) =>
      normalizeCategory(item.name),
    );
    const loadedColors = data.reduce(
      (
        acc: Record<string, string>,
        item: { name: string; color?: string | null },
      ) => {
        const category = normalizeCategory(item.name);
        const normalizedColor = normalizeColor(item.color);
        if (normalizedColor) acc[category] = normalizedColor;
        return acc;
      },
      {},
    );

    setCategories(
      sortCategories([
        ...defaultCategories,
        ...loaded,
        "Bizum recibido",
        "Bizum enviado",
        "Devoluciones",
        "Pendiente de cobrar",
      ]),
    );
    setCategoryColors(loadedColors);
  };

  const createCategory = async (onCreated?: (category: string) => void) => {
    const cleanName = newCategory.trim();
    if (!cleanName) return;
    const cleanColor = normalizeColor(newCategoryColor) || colorOptions[0];

    if (categories.includes(cleanName)) {
      onCreated?.(cleanName);
      setEditCategory(cleanName);
      setNewCategory("");
      setNewCategoryColor(colorOptions[0]);
      return;
    }

    const user = await getCurrentUser();

    if (!user) return;

    let { error } = await supabase.from("expense_categories").insert({
      user_id: user.id,
      name: cleanName,
      color: cleanColor,
      ...getSpacePayload(activeSpaceId),
    });

    if (error && String(error.message || "").includes("color")) {
      const fallback = await supabase.from("expense_categories").insert({
        user_id: user.id,
        name: cleanName,
        ...getSpacePayload(activeSpaceId),
      });
      error = fallback.error;
    }

    if (error) {
      Alert.alert("Error", "No se pudo crear la categoría.");
      return;
    }

    setEditCategory(cleanName);
    onCreated?.(cleanName);
    setNewCategory("");
    setNewCategoryColor(colorOptions[0]);
    await loadCategories();
  };

  const saveCategoryColor = async (category: string) => {
    const cleanCategory = normalizeCategory(category);
    const nextColor = normalizeColor(
      categoryColorDrafts[cleanCategory] ||
        categoryColors[cleanCategory] ||
        getCategoryColor(cleanCategory, categoryColors),
    );

    if (!nextColor) {
      Alert.alert("Color no válido", "Usa #38BDF8 o rgb(56,189,248).");
      return;
    }

    const user = await getCurrentUser();
    if (!user) return;

    const existingQuery = supabase
      .from("expense_categories")
      .select("id")
      .eq("name", cleanCategory)
      .limit(1);
    const { data: existing, error: findError } = await applySpaceFilter(
      existingQuery,
      user.id,
      activeSpaceId,
    );

    if (findError) {
      Alert.alert("Error", "No se pudo preparar el cambio de color.");
      return;
    }

    const existingId = existing?.[0]?.id;
    const result = existingId
      ? await supabase
          .from("expense_categories")
          .update({ color: nextColor })
          .eq("id", existingId)
      : await supabase.from("expense_categories").insert({
          user_id: user.id,
          name: cleanCategory,
          color: nextColor,
          ...getSpacePayload(activeSpaceId),
        });

    if (result.error) {
      Alert.alert(
        "Falta actualizar Supabase",
        "Para guardar colores ejecuta: alter table public.expense_categories add column if not exists color text;",
      );
      return;
    }

    setCategoryColors((current) => ({
      ...current,
      [cleanCategory]: nextColor,
    }));
    showActionMessage("Color de categoría actualizado.");
    await loadCategories();
  };

  const loadExpenses = async () => {
    const user = await getCurrentUser();

    if (!user) return;

    const expensesQuery = supabase
      .from("transactions")
      .select("*")
      .eq("type", "expense")
      .eq("month", selectedMonth)
      .order("day_of_month", { ascending: true })
      .order("created_at", { ascending: true });
    const { data } = await applySpaceFilter(
      expensesQuery,
      user.id,
      activeSpaceId,
    );

    setExpenses(data || []);

    const incomeQuery = supabase
      .from("transactions")
      .select("*")
      .eq("type", "income")
      .eq("month", selectedMonth)
      .order("day_of_month", { ascending: true })
      .order("created_at", { ascending: true });
    const { data: incomeData } = await applySpaceFilter(
      incomeQuery,
      user.id,
      activeSpaceId,
    );

    setIncomeTransactions(incomeData || []);
  };

  const autoMarkPersonalDueFixedExpenses = async () => {
    if (activeSpaceId || selectedMonth !== getCurrentMonth()) return;

    const user = await getCurrentUser();

    if (!user) return;

    const todayDay = getDayFromDate(getTodayDate());

    await supabase
      .from("fixed_expenses")
      .update({ is_paid: true })
      .eq("user_id", user.id)
      .is("space_id", null)
      .eq("month", selectedMonth)
      .eq("is_paid", false)
      .eq("auto_pay", true)
      .lte("day_of_month", todayDay);
  };

  const loadFixedExpenses = async () => {
    const user = await getCurrentUser();

    if (!user) return;

    await autoMarkPersonalDueFixedExpenses();

    const fixedQuery = supabase
      .from("fixed_expenses")
      .select("*")
      .eq("month", selectedMonth)
      .order("day_of_month", { ascending: true });
    const { data } = await applySpaceFilter(
      fixedQuery,
      user.id,
      activeSpaceId,
    );

    setFixedExpenses(data || []);
  };

  const ensureTemplatesForMonth = async () => {
    const user = await getCurrentUser();

    if (!user) return;

    const currentTemplatesQuery = supabase
      .from("fixed_templates")
      .select("*")
      .eq("month", selectedMonth);
    const { data: currentTemplates } = await applySpaceFilter(
      currentTemplatesQuery,
      user.id,
      activeSpaceId,
    );

    if (Array.isArray(currentTemplates) && currentTemplates.length > 0) return;

    const prevMonth = addMonths(selectedMonth, -1);

    const prevTemplatesQuery = supabase
      .from("fixed_templates")
      .select("*")
      .eq("month", prevMonth);
    const { data: prevTemplates } = await applySpaceFilter(
      prevTemplatesQuery,
      user.id,
      activeSpaceId,
    );

    let sourceItems = prevTemplates || [];

    if (!sourceItems.length) {
      const prevFixedQuery = supabase
        .from("fixed_expenses")
        .select("*")
        .eq("month", prevMonth);
      const { data: prevFixedExpenses } = await applySpaceFilter(
        prevFixedQuery,
        user.id,
        activeSpaceId,
      );

      sourceItems = prevFixedExpenses || [];
    }

    if (!sourceItems.length) return;

    const toInsert = sourceItems.map((item: any) => ({
      title: item.title,
      amount: item.amount,
      day_of_month: item.day_of_month,
      user_id: activeSpaceId ? item.user_id || user.id : user.id,
      month: selectedMonth,
      category: normalizeCategory(item.category),
      auto_pay: item.auto_pay ?? true,
      ...getSpacePayload(activeSpaceId),
    }));

    await supabase.from("fixed_templates").insert(toInsert);
  };

  const generateFixedForMonth = async () => {
    const user = await getCurrentUser();

    if (!user) return;

    await ensureTemplatesForMonth();

    const templatesQuery = supabase
      .from("fixed_templates")
      .select("*")
      .eq("month", selectedMonth);
    const { data: templates } = await applySpaceFilter(
      templatesQuery,
      user.id,
      activeSpaceId,
    );

    const existingQuery = supabase
      .from("fixed_expenses")
      .select("title, amount, day_of_month, category")
      .eq("month", selectedMonth);
    const { data: existing } = await applySpaceFilter(
      existingQuery,
      user.id,
      activeSpaceId,
    );

    const existingKeys = new Set((existing || []).map(getExpenseDuplicateKey));

    let sourceItems = templates || [];

    if (!sourceItems.length) {
      const prevMonth = addMonths(selectedMonth, -1);
      const prevFixedQuery = supabase
        .from("fixed_expenses")
        .select("*")
        .eq("month", prevMonth);
      const { data: prevFixedExpenses } = await applySpaceFilter(
        prevFixedQuery,
        user.id,
        activeSpaceId,
      );

      sourceItems = prevFixedExpenses || [];
    }

    const toInsert = sourceItems
      .filter((item: any) => !existingKeys.has(getExpenseDuplicateKey(item)))
      .map((item: any) => ({
        title: item.title,
        amount: item.amount,
        day_of_month: item.day_of_month,
        user_id: activeSpaceId ? item.user_id || user.id : user.id,
        month: selectedMonth,
        is_paid: false,
        category: normalizeCategory(item.category),
        auto_pay: item.auto_pay ?? true,
        ...getSpacePayload(activeSpaceId),
      }));

    if (toInsert.length > 0) {
      await supabase.from("fixed_expenses").insert(toInsert);
    }
  };

  const loadAll = async () => {
    if (loadInProgressRef.current) return;

    loadInProgressRef.current = true;
    setIsLoadingData(true);
    setDataError("");

    try {
      await loadSectionTitles();
      await loadIncome();
      await loadCategories();
      await generateFixedForMonth();
      await loadFixedExpenses();
      await loadExpenses();
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "No se pudieron cargar tus datos.";
      setDataError(message);
    } finally {
      loadInProgressRef.current = false;
      setHasLoadedData(true);
      setIsLoadingData(false);
    }
  };

  const loadAllRef = useRef(loadAll);
  const loadInProgressRef = useRef(false);
  const loadMonthDataRef = useRef(loadAll);

  loadAllRef.current = loadAll;
  const retryLoadAll = useCallback(() => {
    loadInProgressRef.current = false;
    loadAllRef.current();
  }, []);

  const forceReloadAll = useCallback(async () => {
    loadInProgressRef.current = false;
    await loadAllRef.current();
  }, []);

  const runAction = useCallback(
    async (
      action: () => Promise<void>,
      confirmMessage?: string,
    ) => {
      if (actionBusyRef.current) {
        showActionMessage("Espera a que termine la acción anterior.");
        return;
      }

      if (confirmMessage) {
        const confirmed = await confirmAction(confirmMessage);
        if (!confirmed) return;
      }

      actionBusyRef.current = true;
      setIsActionBusy(true);

      try {
        await action();
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "No se pudo completar la acción.";
        Alert.alert("Error", message);
        showActionMessage("No se pudo completar. Datos recargados.");
        await forceReloadAll();
      } finally {
        actionBusyRef.current = false;
        setIsActionBusy(false);
      }
    },
    [forceReloadAll],
  );

  loadMonthDataRef.current = async () => {
    setFixedExpenses([]);
    setExpenses([]);
    await generateFixedForMonth();
    await loadFixedExpenses();
    await loadExpenses();
  };

  useEffect(() => {
    const checkSession = async () => {
      const { data } = await supabase.auth.getSession();

      if (!data.session) {
        setTimeout(checkSession, 200);
        return;
      }

      await forceReloadAll();
    };

    checkSession();

    const { data: subscription } = supabase.auth.onAuthStateChange(
      async (_, session) => {
        if (session?.user) await forceReloadAll();
      },
    );

    return () => subscription.subscription.unsubscribe();
  }, [forceReloadAll]);

  useEffect(() => {
    setSalary(0);
    setCategories([]);
    setFixedExpenses([]);
    setExpenses([]);
    setIncomeTransactions([]);
    setFixedFilterCategory("Todas");
    setFixedCategorySearch("");
    setVariableFilterCategory("Todas");
    setVariableCategorySearch("");
    forceReloadAll();
  }, [activeSpaceId, selectedMonth, forceReloadAll]);

  useFocusEffect(
    useCallback(() => {
      forceReloadAll();
    }, [forceReloadAll]),
  );

  const changeMonth = async (offset: number) => {
    const newSelectedMonth = addMonths(selectedMonth, offset);

    if (offset > 0) {
      const canAdvance = await confirmAdvanceMonth(newSelectedMonth);
      if (!canAdvance) return;
    }

    setSelectedMonth(newSelectedMonth);
    setFixedDate(getDateFromMonthAndDay(newSelectedMonth, 1));
    setVariableDate(
      getDateFromMonthAndDay(newSelectedMonth, getTodayDate().slice(8, 10)),
    );
  };

  const saveIncome = async () => {
    const user = await getCurrentUser();

    if (!user) return;

    const value = parseMoneyInput(salaryInput);
    if (value < 0) {
      Alert.alert("Importe no válido", "Introduce un importe igual o mayor que 0.");
      return;
    }

    if (activeSpaceId) {
      const { error } = await supabase.from("space_settings").upsert({
        space_id: activeSpaceId,
        monthly_income: value,
        updated_by: user.id,
        updated_at: new Date().toISOString(),
      });
      if (error) throw error;

      await recordActivity(
        "space_income_updated",
        "space_settings",
        activeSpaceId,
        "Se actualizó el ingreso mensual del espacio.",
      );
    } else {
      const { error } = await supabase
        .from("profiles")
        .upsert({ id: user.id, salary: value });
      if (error) throw error;
    }

    await forceReloadAll();
    showActionMessage("Ingresos actualizados.");
    setEditingSalary(false);
  };

  const handleAddExpense = async () => {
    if (!title.trim()) {
      Alert.alert("Falta el concepto", "Pon un nombre para el gasto.");
      return;
    }

    const expenseAmount = parseMoneyInput(amount);

    if (expenseAmount <= 0) {
      Alert.alert("Importe no válido", "El gasto debe ser mayor que 0.");
      return;
    }

    const user = await getCurrentUser();

    if (!user) return;

    const expenseMonth = getMonthFromDate(variableDate);
    const expenseDay = getDayFromDate(variableDate);

    const { error } = await supabase.from("transactions").insert([
      {
        title,
        amount: expenseAmount,
        type: "expense",
        user_id: user.id,
        created_at: new Date().toISOString(),
        month: expenseMonth,
        day_of_month: expenseDay,
        category: variableCategory,
        ...getSpacePayload(activeSpaceId),
      },
    ]);
    if (error) throw error;
    await recordActivity(
      "transaction_created",
      "transaction",
      null,
      `Se añadió el gasto ${title}.`,
    );

    setTitle("");
    setAmount("");
    setVariableDate(getTodayDate());
    setVariableCategory("Otros");
    setShowAddVariable(false);
    setShowVariableSection(true);
    await forceReloadAll();
    showActionMessage("Gasto guardado.");
  };

  const openBizumModal = (type: "received" | "sent" | "refund" | "owed") => {
    setBizumModalType(type);
    setBizumName("");
    setBizumConcept("");
    setBizumAmount("");
    setVariableDate(getTodayDate());
  };

  const closeBizumModal = () => {
    setBizumModalType(null);
    setBizumName("");
    setBizumConcept("");
    setBizumAmount("");
    setVariableDate(getTodayDate());
  };

  const handleAddBizum = async () => {
    if (!bizumModalType) return;

    const user = await getCurrentUser();

    if (!user) return;

    if (!bizumName.trim()) {
      Alert.alert("Falta el nombre", "Pon el nombre de la persona.");
      return;
    }

    if (!bizumConcept.trim()) {
      Alert.alert("Falta el concepto", "Pon el concepto del Bizum.");
      return;
    }

    const value = parseMoneyInput(bizumAmount);

    if (value <= 0) {
      Alert.alert("Importe no válido", "El importe debe ser mayor que 0.");
      return;
    }

    const bizumMonth = getMonthFromDate(variableDate);
    const bizumDay = getDayFromDate(variableDate);
    const isReceived =
      bizumModalType === "received" || bizumModalType === "refund";
    const category =
      bizumModalType === "received"
        ? "Bizum recibido"
        : bizumModalType === "sent"
          ? "Bizum enviado"
          : bizumModalType === "refund"
            ? "Devoluciones"
            : "Pendiente de cobrar";
    const title = `${bizumName.trim()} - ${bizumConcept.trim()}`;

    const { error } = await supabase.from("transactions").insert([
      {
        title,
        amount: value,
        type: isReceived ? "income" : "expense",
        user_id: user.id,
        created_at: new Date().toISOString(),
        month: bizumMonth,
        day_of_month: bizumDay,
        category,
        ...getSpacePayload(activeSpaceId),
      },
    ]);
    if (error) throw error;
    if (error) throw error;

    await recordActivity(
      isReceived ? "bizum_received_created" : "bizum_sent_created",
      "transaction",
      null,
      `${isReceived ? "Se registró un Bizum recibido de" : "Se registró un Bizum enviado a"} ${bizumName.trim()} por ${bizumConcept.trim()}.`,
    );

    closeBizumModal();
    setShowVariableSection(true);
    await forceReloadAll();
    showActionMessage(
      isReceived ? "Ingreso añadido." : "Movimiento pendiente añadido.",
    );
  };

  const handleAddSpaceIncome = async () => {
    const user = await getCurrentUser();
    const value = parseMoneyInput(spaceIncomeAmount);

    if (!user || !activeSpaceId) return;

    if (!value || value <= 0) {
      Alert.alert("Importe no válido", "La aportación debe ser mayor que 0.");
      return;
    }

    const incomeMonth = getMonthFromDate(spaceIncomeDate);
    const incomeDay = getDayFromDate(spaceIncomeDate);
    const note = spaceIncomeNote.trim() || "Ingreso a cuenta compartida";

    const { error: contributionError } = await supabase
      .from("space_contributions")
      .insert([
      {
        space_id: activeSpaceId,
        from_user_id: user.id,
        amount: value,
        note,
        contribution_date: spaceIncomeDate,
        month: incomeMonth,
        day_of_month: incomeDay,
      },
    ]);
    if (contributionError) throw contributionError;

    const { error: transactionError } = await supabase
      .from("transactions")
      .insert([
      {
        title: note,
        amount: value,
        type: "expense",
        user_id: user.id,
        created_at: new Date().toISOString(),
        month: incomeMonth,
        day_of_month: incomeDay,
        category: "Aportaciones",
        space_id: null,
      },
    ]);
    if (transactionError) throw transactionError;

    await recordActivity(
      "space_income_created",
      "space_contribution",
      null,
      `Se registró un ingreso de ${value} €.`,
    );

    setSpaceIncomeAmount("");
    setSpaceIncomeDate(getTodayDate());
    setSpaceIncomeNote("");
    setSpaceIncomeModalVisible(false);
    await forceReloadAll();
    showActionMessage("Aportación registrada.");
  };

  const handleAddFixedExpense = async () => {
    if (!fixedTitle.trim()) {
      Alert.alert("Falta el concepto", "Pon un nombre para el gasto fijo.");
      return;
    }

    const fixedExpenseAmount = parseMoneyInput(fixedAmount);

    if (fixedExpenseAmount <= 0) {
      Alert.alert("Importe no válido", "El gasto fijo debe ser mayor que 0.");
      return;
    }

    if (!fixedDate) {
      Alert.alert("Falta la fecha", "Elige una fecha para el gasto fijo.");
      return;
    }

    const user = await getCurrentUser();

    if (!user) return;

    const expenseMonth = getMonthFromDate(fixedDate);
    const expenseDay = getDayFromDate(fixedDate);
    const { error: templateError } = await supabase.from("fixed_templates").insert([
      {
        title: fixedTitle,
        amount: fixedExpenseAmount,
        day_of_month: expenseDay,
        user_id: user.id,
        month: expenseMonth,
        category: fixedCategory,
        auto_pay: fixedAutoPay,
        ...getSpacePayload(activeSpaceId),
      },
    ]);
    if (templateError) throw templateError;

    const { error: fixedError } = await supabase.from("fixed_expenses").insert([
      {
        title: fixedTitle,
        amount: fixedExpenseAmount,
        day_of_month: expenseDay,
        user_id: user.id,
        month: expenseMonth,
        is_paid: false,
        category: fixedCategory,
        auto_pay: fixedAutoPay,
        ...getSpacePayload(activeSpaceId),
      },
    ]);
    if (fixedError) throw fixedError;
    await recordActivity(
      "fixed_expense_created",
      "fixed_expense",
      null,
      `Se añadió el gasto fijo ${fixedTitle}.`,
    );

    setFixedTitle("");
    setFixedAmount("");
    setFixedDate(getDateFromMonthAndDay(selectedMonth, 1));
    setFixedCategory("Otros");
    setFixedAutoPay(true);
    setShowAddFixed(false);
    setShowFixedSection(true);
    await forceReloadAll();
    showActionMessage("Gasto fijo guardado.");
  };

  const openEditFixed = (item: any) => {
    setEditingType("fixed");
    setEditingItem(item);
    setEditTitle(String(item.title || ""));
    setEditAmount(String(item.amount));
    setEditDate(
      getDateFromMonthAndDay(item.month || selectedMonth, item.day_of_month),
    );
    setEditCategory(normalizeCategory(item.category));
    setEditAutoPay(item.auto_pay ?? true);
    setShowEditCategoryDropdown(false);
    setNewCategory("");
  };

  const openEditVariable = (item: any) => {
    setEditingType("variable");
    setEditingItem(item);
    setEditTitle(String(item.title || ""));
    setEditAmount(String(item.amount));
    setEditDate(
      getDateFromMonthAndDay(
        item.month || selectedMonth,
        item.day_of_month || 1,
      ),
    );
    setEditCategory(normalizeCategory(item.category));
    setShowEditCategoryDropdown(false);
    setNewCategory("");
  };

  const closeEditModal = () => {
    setEditingType(null);
    setEditingItem(null);
    setEditTitle("");
    setEditAmount("");
    setEditDate("");
    setEditCategory("Otros");
    setEditAutoPay(true);
    setShowEditCategoryDropdown(false);
    setNewCategory("");
  };

  const closeDetailModal = () => {
    setDetailExpense(null);
    setMovingExpenseKey(null);
  };

  const saveEdit = async () => {
    if (!editingItem || !editingType) return;

    const cleanTitle = editTitle.trim();
    const newAmount = parseMoneyInput(editAmount);
    const newMonth = getMonthFromDate(editDate);
    const newDay = getDayFromDate(editDate);

    if (!cleanTitle) {
      Alert.alert("Falta el concepto", "Pon un concepto para el gasto.");
      return;
    }

    if (newAmount <= 0) {
      Alert.alert("Error", "El importe no es válido.");
      return;
    }

    if (editingType === "fixed") {
      const { error: fixedUpdateError } = await supabase
        .from("fixed_expenses")
        .update({
          title: cleanTitle,
          amount: newAmount,
          month: newMonth,
          day_of_month: newDay,
          category: editCategory,
          auto_pay: editAutoPay,
        })
        .eq("id", editingItem.id);
      if (fixedUpdateError) throw fixedUpdateError;

      const user = await getCurrentUser();

      if (user) {
        const templateUpdateQuery = supabase
          .from("fixed_templates")
          .update({
            title: cleanTitle,
            amount: newAmount,
            month: newMonth,
            day_of_month: newDay,
            category: editCategory,
            auto_pay: editAutoPay,
          })
          .eq("title", editingItem.title)
          .eq("month", editingItem.month || selectedMonth);

        const { error: templateUpdateError } = await applySpaceFilter(
          templateUpdateQuery,
          user.id,
          activeSpaceId,
        );
        if (templateUpdateError) throw templateUpdateError;
      }

      closeEditModal();
      await forceReloadAll();
      showActionMessage("Gasto fijo actualizado.");
      await recordActivity(
        "fixed_expense_updated",
        "fixed_expense",
        editingItem.id,
        `Se editó el gasto fijo ${cleanTitle}.`,
      );
      return;
    }

    const { error: transactionUpdateError } = await supabase
      .from("transactions")
      .update({
        title: cleanTitle,
        amount: newAmount,
        month: newMonth,
        day_of_month: newDay,
        category: editCategory,
      })
      .eq("id", editingItem.id);
    if (transactionUpdateError) throw transactionUpdateError;

    closeEditModal();
    await forceReloadAll();
    showActionMessage("Gasto actualizado.");
    await recordActivity(
      "transaction_updated",
      "transaction",
      editingItem.id,
      `Se editó el gasto ${cleanTitle}.`,
    );
  };

  const togglePaid = async (item: any) => {
    const { error } = await supabase
      .from("fixed_expenses")
      .update({ is_paid: !item.is_paid })
      .eq("id", item.id);
    if (error) throw error;

    await forceReloadAll();
    showActionMessage(item.is_paid ? "Marcado como pendiente." : "Marcado como pagado.");
    await recordActivity(
      "fixed_expense_toggled",
      "fixed_expense",
      item.id,
      `${item.title} se marcó como ${item.is_paid ? "pendiente" : "pagado"}.`,
    );
  };

  const deleteFixed = async (item: any) => {
    const executeDelete = async () => {
      const user = await getCurrentUser();

      if (!user) return;

      const { error: fixedDeleteError } = await supabase
        .from("fixed_expenses")
        .delete()
        .eq("id", item.id);
      if (fixedDeleteError) throw fixedDeleteError;

      const templateDeleteQuery = supabase
        .from("fixed_templates")
        .delete()
        .eq("title", item.title)
        .eq("month", item.month || selectedMonth);
      const { error: templateDeleteError } = await applySpaceFilter(
        templateDeleteQuery,
        user.id,
        activeSpaceId,
      );
      if (templateDeleteError) throw templateDeleteError;

      await forceReloadAll();
      showActionMessage("Gasto fijo eliminado.");
      await recordActivity(
        "fixed_expense_deleted",
        "fixed_expense",
        item.id,
        `Se eliminó el gasto fijo ${item.title}.`,
      );
    };

    if (Platform.OS === "web") {
      const confirmed = window.confirm(`¿Eliminar "${item.title}"?`);
      if (confirmed) await executeDelete();
      return;
    }

    Alert.alert("Eliminar gasto", `¿Eliminar "${item.title}"?`, [
      { text: "Cancelar", style: "cancel" },
      { text: "Eliminar", style: "destructive", onPress: executeDelete },
    ]);
  };

  const deleteVariable = async (item: any) => {
    const executeDelete = async () => {
      const { error } = await supabase
        .from("transactions")
        .delete()
        .eq("id", item.id);
      if (error) throw error;
      await forceReloadAll();
      showActionMessage("Gasto eliminado.");
      await recordActivity(
        "transaction_deleted",
        "transaction",
        item.id,
        `Se eliminó el gasto ${item.title}.`,
      );
    };

    if (Platform.OS === "web") {
      const confirmed = window.confirm(`¿Eliminar "${item.title}"?`);
      if (confirmed) await executeDelete();
      return;
    }

    Alert.alert("Eliminar gasto", `¿Eliminar "${item.title}"?`, [
      { text: "Cancelar", style: "cancel" },
      { text: "Eliminar", style: "destructive", onPress: executeDelete },
    ]);
  };

  const getMoveTargets = () => {
    if (activeSpaceId) {
      return [spaces.find((space) => space.id === null)].filter(Boolean);
    }

    return spaces.filter((space) => space.type === "shared");
  };

  const copyExpenseToSpace = async (
    item: any,
    type: ExpenseSectionType,
    targetSpaceId: string | null,
  ) => {
    const user = await getCurrentUser();

    if (!user) return;

    if (type === "fixed") {
      const sourceDate = getDateFromMonthAndDay(
        item.month || selectedMonth,
        item.day_of_month || 1,
      );
      const sourceMonth = getMonthFromDate(sourceDate);
      const sourceDay = getDayFromDate(sourceDate);
      const targetCategory = normalizeCategory(item.category);
      const targetAmount = Number(item.amount || 0);

      const duplicateQuery = supabase
        .from("fixed_expenses")
        .select("id")
        .eq("title", item.title)
        .eq("amount", targetAmount)
        .eq("day_of_month", sourceDay)
        .eq("month", sourceMonth)
        .eq("category", targetCategory);
      const { data: duplicateFixed } = await applySpaceFilter(
        duplicateQuery,
        user.id,
        targetSpaceId,
      );

      if (duplicateFixed?.length) {
        showActionMessage("Ese gasto fijo ya existe en el destino.");
        setMovingExpenseKey(null);
        return;
      }

      const { error: templateError } = await supabase.from("fixed_templates").insert([
        {
          title: item.title,
          amount: targetAmount,
          day_of_month: sourceDay,
          user_id: user.id,
          month: sourceMonth,
          category: targetCategory,
          auto_pay: item.auto_pay ?? true,
          space_id: targetSpaceId,
        },
      ]);
      if (templateError) throw templateError;

      const { error: fixedError } = await supabase.from("fixed_expenses").insert([
        {
          title: item.title,
          amount: targetAmount,
          day_of_month: sourceDay,
          user_id: user.id,
          month: sourceMonth,
          is_paid: false,
          category: targetCategory,
          auto_pay: item.auto_pay ?? true,
          space_id: targetSpaceId,
        },
      ]);
      if (fixedError) throw fixedError;

      await recordActivity(
        "fixed_expense_transferred",
        "fixed_expense",
        item.id,
        `Se traspasó el gasto fijo ${item.title}.`,
      );
      showActionMessage("Gasto fijo copiado al destino.");
      await forceReloadAll();
    } else {
      const targetCategory = normalizeCategory(item.category);
      const targetAmount = Number(item.amount || 0);
      const targetMonth = item.month || selectedMonth;
      const targetDay = item.day_of_month || 1;
      const duplicateQuery = supabase
        .from("transactions")
        .select("id")
        .eq("title", item.title)
        .eq("amount", targetAmount)
        .eq("type", "expense")
        .eq("month", targetMonth)
        .eq("day_of_month", targetDay)
        .eq("category", targetCategory);
      const { data: duplicateVariable } = await applySpaceFilter(
        duplicateQuery,
        user.id,
        targetSpaceId,
      );

      if (duplicateVariable?.length) {
        showActionMessage("Ese gasto ya existe en el destino.");
        setMovingExpenseKey(null);
        return;
      }

      const { error } = await supabase.from("transactions").insert([
        {
          title: item.title,
          amount: targetAmount,
          type: "expense",
          user_id: user.id,
          created_at: new Date().toISOString(),
          month: targetMonth,
          day_of_month: targetDay,
          category: targetCategory,
          space_id: targetSpaceId,
        },
      ]);
      if (error) throw error;

      await recordActivity(
        "transaction_transferred",
        "transaction",
        item.id,
        `Se traspasó el gasto ${item.title}.`,
      );
      showActionMessage("Gasto copiado al destino.");
      await forceReloadAll();
    }

    setMovingExpenseKey(null);
  };

  const renderMoveTargets = (
    item: any,
    type: ExpenseSectionType,
    key: string,
  ) => {
    if (movingExpenseKey !== key) return null;

    const targets = getMoveTargets();
    if (targets.length === 0) {
      return (
        <Text style={styles.emptyMoveText}>
          Crea un espacio compartido para poder mover este gasto.
        </Text>
      );
    }

    return (
      <View style={styles.moveTargetRow}>
        {targets.map((space: any) => (
          <Pressable
            key={space.id || "personal"}
            style={styles.moveTargetButton}
            onPress={() => runAction(() => copyExpenseToSpace(item, type, space.id))}
          >
            <Ionicons
              name={space.id ? "people-outline" : "person-outline"}
              size={14}
              color={colors.primaryDark}
            />
            <Text style={styles.moveTargetText}>{space.name}</Text>
          </Pressable>
        ))}
      </View>
    );
  };

  const renderDetailValue = (label: string, value: string) => (
    <View style={styles.detailValueRow}>
      <Text style={styles.detailValueLabel}>{label}</Text>
      <Text style={styles.detailValueText}>{value}</Text>
    </View>
  );

  const renderDetailAction = ({
    label,
    icon,
    onPress,
    danger,
    dark,
  }: {
    label: string;
    icon: keyof typeof Ionicons.glyphMap;
    onPress: () => void;
    danger?: boolean;
    dark?: boolean;
  }) => (
    <Pressable
      style={[
        styles.detailActionButton,
        dark && styles.detailActionButtonDark,
        danger && styles.detailActionButtonDanger,
      ]}
      onPress={onPress}
    >
      <Ionicons
        name={icon}
        size={18}
        color={dark ? colors.white : danger ? colors.danger : colors.primaryDark}
      />
      <Text
        style={[
          styles.detailActionText,
          dark && styles.detailActionTextDark,
          danger && styles.detailActionTextDanger,
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );

  const renderDetailModal = () => {
    if (!detailExpense) return null;

    const { item, type } = detailExpense;
    const isFixed = type === "fixed";
    const isIncome = item.type === "income" || item.is_income;
    const fullDate = getDateFromMonthAndDay(
      item.month || selectedMonth,
      item.day_of_month || 1,
    );
    const moveKey = `${isFixed ? "fixed" : isIncome ? "income" : "variable"}-${item.id}`;
    const permissionInput = {
      activeSpaceId,
      currentUserId,
      ownerUserId: item.user_id,
    };
    const canEditItem = isFixed
      ? canEditSharedFixedDetails(permissionInput)
      : canEditExpense(permissionInput);
    const canDeleteItem = isFixed
      ? canEditSharedFixedDetails(permissionInput)
      : canDeleteExpense(permissionInput);
    const canMoveItem = !isIncome && canMoveExpense(permissionInput);
    const amountPrefix = isFixed ? "" : isIncome ? "+ " : "- ";

    return (
      <Modal
        visible={!!detailExpense}
        transparent
        animationType="fade"
        onRequestClose={closeDetailModal}
      >
        <View style={commonStyles.modalOverlay}>
          <View style={commonStyles.modalCardSmall}>
            <View style={commonStyles.modalHeader}>
              <View style={commonStyles.modalTitleBlock}>
                <Text style={commonStyles.modalTitle}>{item.title}</Text>
                <Text style={commonStyles.modalSubtitle}>
                  {isFixed ? "Gasto fijo mensual" : isIncome ? "Ingreso puntual" : "Gasto puntual"}
                </Text>
              </View>

              <Pressable
                style={commonStyles.closeButton}
                onPress={closeDetailModal}
              >
                <Ionicons name="close" size={22} color={colors.primaryDark} />
              </Pressable>
            </View>

            <View style={styles.detailBox}>
              {renderDetailValue(
                "Importe",
                `${amountPrefix}${formatCompactMoney(Number(item.amount || 0))}`,
              )}
              {renderDetailValue("Fecha", formatDateText(fullDate))}
              {renderDetailValue("Categoría", normalizeCategory(item.category))}
              {isFixed &&
                renderDetailValue(
                  "Estado",
                  item.is_paid ? "Pagado" : "Pendiente",
                )}
              {isFixed &&
                renderDetailValue(
                  "Marcado",
                  item.auto_pay ?? true ? "Pago automático" : "Pago manual",
                )}
              {item.is_transferred &&
                renderDetailValue("Traspaso", "Copiado a otro espacio")}
            </View>

            <View style={styles.detailActionsGrid}>
              {canEditItem &&
                renderDetailAction({
                  label: "Editar",
                  icon: "create-outline",
                  onPress: () => {
                    closeDetailModal();
                    if (isFixed) {
                      openEditFixed(item);
                    } else {
                      openEditVariable(item);
                    }
                  },
                })}

              {isFixed &&
                renderDetailAction({
                  label: item.is_paid ? "Deshacer pagado" : "Marcar pagado",
                  icon: item.is_paid ? "refresh-outline" : "checkmark",
                  dark: !item.is_paid,
                  onPress: async () => {
                    closeDetailModal();
                    await runAction(() => togglePaid(item));
                  },
                })}

              {canMoveItem &&
                renderDetailAction({
                  label: "Mover",
                  icon: "swap-horizontal-outline",
                  onPress: () =>
                    setMovingExpenseKey(
                      movingExpenseKey === moveKey ? null : moveKey,
                    ),
                })}

              {canDeleteItem &&
                renderDetailAction({
                  label: "Eliminar",
                  icon: "trash-outline",
                  danger: true,
                  onPress: () => {
                    closeDetailModal();
                    if (isFixed) {
                      runAction(() => deleteFixed(item));
                    } else {
                      runAction(() => deleteVariable(item));
                    }
                  },
                })}
            </View>

            {canMoveItem && renderMoveTargets(item, type, moveKey)}
          </View>
        </View>
      </Modal>
    );
  };

  const totalFixed = fixedExpenses.reduce(
    (sum, item) => sum + Number(item.amount),
    0,
  );
  const totalExpenses = expenses.reduce(
    (sum, item) => sum + Number(item.amount),
    0,
  );
  const totalIncomeTransactions = incomeTransactions.reduce(
    (sum, item) => sum + Number(item.amount || 0),
    0,
  );
  const variableItems = [...expenses, ...incomeTransactions]
    .map((item) => ({
      ...item,
      is_income: item.type === "income",
    }))
    .sort((a, b) => {
      const dayDiff = Number(a.day_of_month || 1) - Number(b.day_of_month || 1);
      if (dayDiff !== 0) return dayDiff;

      return String(a.created_at || "").localeCompare(String(b.created_at || ""));
    });
  const variableNetTotal = totalExpenses - totalIncomeTransactions;
  const fixedPaidTotal = fixedExpenses
    .filter((item) => item.is_paid)
    .reduce((sum, item) => sum + Number(item.amount), 0);

  const available =
    salary + totalIncomeTransactions - fixedPaidTotal - totalExpenses;
  const hasVisibleFinanceData =
    salary > 0 ||
    totalIncomeTransactions > 0 ||
    fixedExpenses.length > 0 ||
    expenses.length > 0;

  const categoryMatchesFilter = (category: string, filter: string) => {
    const cleanFilter = filter.trim().toLowerCase();
    if (!cleanFilter || cleanFilter === "todas") return true;

    return normalizeCategory(category).toLowerCase().includes(cleanFilter);
  };

  const filteredFixedExpenses =
    (fixedFilterCategory === "Todas"
      ? fixedExpenses
      : fixedExpenses.filter((item) =>
          categoryMatchesFilter(item.category, fixedFilterCategory),
        )).filter((item) => {
      if (fixedPaidFilter === "Pagados") return item.is_paid;
      if (fixedPaidFilter === "Pendientes") return !item.is_paid;
      return true;
    });

  const filteredVariableExpenses =
    variableFilterCategory === "Todas"
      ? variableItems
      : variableItems.filter((item) =>
          categoryMatchesFilter(item.category, variableFilterCategory),
        );
  const fixedFilterTotal = filteredFixedExpenses.reduce(
    (sum, item) => sum + Number(item.amount || 0),
    0,
  );
  const variableFilterTotal = filteredVariableExpenses
    .filter((item) => item.type !== "income" && !item.is_income)
    .reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const variableFilterCategories = variableItems.map((item) =>
    normalizeCategory(item.category),
  );

  const renderCategorySelector = (
    selected: string,
    onSelect: (category: string) => void,
  ) => {
    return (
      <View>
        <View style={styles.categoryList}>
          {categories.map((category) => {
            const categoryColor = getCategoryColor(category, categoryColors);
            const active = selected === category;

            return (
              <Pressable
                key={category}
                style={[
                  styles.categoryButton,
                  {
                    borderColor: categoryColor,
                    backgroundColor: active
                      ? categoryColor
                      : getCategorySoftColor(categoryColor),
                  },
                ]}
                onPress={() => onSelect(category)}
              >
                <View
                  style={[
                    styles.categorySwatch,
                    { backgroundColor: categoryColor },
                  ]}
                />
                <Text
                  style={[
                    styles.categoryButtonText,
                    active && styles.categoryButtonTextActive,
                  ]}
                >
                  {category}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>
    );
  };

  const renderFilterSelector = (
    selected: string,
    onSelect: (category: string) => void,
    isOpen: boolean,
    setIsOpen: (value: boolean) => void,
    extraCategories: string[] = [],
    excludedCategories: string[] = [],
    searchValue = "",
    setSearchValue?: (value: string) => void,
  ) => {
    const excluded = new Set(excludedCategories);
    const cleanSearch = searchValue.trim().toLowerCase();
    const options = [
      "Todas",
      ...sortCategories([...categories, ...extraCategories]).filter(
        (category) =>
          !excluded.has(category) &&
          (!cleanSearch || category.toLowerCase().includes(cleanSearch)),
      ),
    ];

    return (
      <View style={styles.filterDropdown}>
        <Pressable
          style={styles.filterDropdownButton}
          onPress={() => setIsOpen(!isOpen)}
        >
          <Text style={styles.filterDropdownText}>{selected}</Text>
          <Ionicons
            name={isOpen ? "chevron-up" : "chevron-down"}
            size={16}
            color={colors.primaryDark}
          />
        </Pressable>

        {isOpen && (
          <View style={styles.filterDropdownOptions}>
            {setSearchValue && (
              <TextInput
                style={styles.filterSearchInput}
                placeholder="Buscar categoría"
                value={searchValue}
                onChangeText={(text) => {
                  setSearchValue(text);
                  onSelect(text.trim() ? text.trim() : "Todas");
                }}
              />
            )}
            {options.map((category) => (
              <Pressable
                key={category}
                style={[
                  styles.filterDropdownOption,
                  selected === category && styles.filterDropdownOptionActive,
                ]}
                onPress={() => {
                  onSelect(category);
                  setSearchValue?.(category === "Todas" ? "" : category);
                  setIsOpen(false);
                }}
              >
                <Text
                  style={[
                    styles.filterDropdownOptionText,
                    selected === category &&
                      styles.filterDropdownOptionTextActive,
                  ]}
                >
                  {category}
                </Text>
              </Pressable>
            ))}
          </View>
        )}
      </View>
    );
  };

  const renderCategoryFilterSummary = (category: string, total: number) => {
    if (category === "Todas") return null;

    return (
      <View style={styles.filterSummaryBox}>
        <Text style={styles.filterSummaryLabel}>Total en {category}</Text>
        <Text style={styles.filterSummaryAmount}>{formatCompactMoney(total)}</Text>
      </View>
    );
  };

  const renderCategoryBadge = (category: string) => {
    const normalized = normalizeCategory(category);
    const categoryColor = getCategoryColor(normalized, categoryColors);

    return (
      <View
        style={[
          styles.categoryBadge,
          {
            backgroundColor: getCategorySoftColor(categoryColor),
            borderColor: categoryColor,
          },
        ]}
      >
        <Text style={[styles.categoryBadgeText, { color: categoryColor }]}>
          {normalized}
        </Text>
      </View>
    );
  };

  const renderDateButton = (date: string, onPress: () => void) => (
    <Pressable style={styles.dateButton} onPress={onPress}>
      <Text style={styles.dateButtonText}>{formatDateText(date)}</Text>
      <Ionicons name="calendar-outline" size={16} color={colors.primaryDark} />
    </Pressable>
  );

  const renderMoneyInput = (
    value: string,
    onChangeText: (text: string) => void,
    placeholder = "Importe",
  ) => (
    <View style={styles.moneyInputShell}>
      <TextInput
        style={[styles.input, styles.moneyInput]}
        placeholder={placeholder}
        value={value}
        keyboardType="decimal-pad"
        inputMode="decimal"
        onChangeText={onChangeText}
      />
      <Text style={styles.moneyInputSuffix}>€</Text>
    </View>
  );

  const renderColorPicker = (
    value: string,
    onChange: (nextColor: string) => void,
    editorKey: string,
  ) => {
    const pickerColor = normalizeColor(value) || colorOptions[0];
    const isExpanded = expandedColorEditors[editorKey];

    return (
      <View style={styles.colorPickerStack}>
        <View style={styles.colorPickerRow}>
          <View style={styles.colorSwatchRow}>
            {colorOptions.map((option) => (
              <Pressable
                key={option}
                style={[
                  styles.colorSwatchButton,
                  { backgroundColor: option },
                  pickerColor === option && styles.colorSwatchButtonActive,
                ]}
                onPress={() => onChange(option)}
              />
            ))}
          </View>

          <Pressable
            style={styles.colorApplyButton}
            onPress={() =>
              setExpandedColorEditors((current) => ({
                ...current,
                [editorKey]: !current[editorKey],
              }))
            }
          >
            <View
              style={[
                styles.colorApplySwatch,
                { backgroundColor: pickerColor },
              ]}
            />
            <Text style={styles.colorApplyText}>Cambiar color</Text>
          </Pressable>
        </View>

        {isExpanded && (
          <View style={styles.colorCustomRow}>
            <TextInput
              style={styles.colorValueInput}
              placeholder="#38BDF8 o rgb(56, 189, 248)"
              value={value}
              onChangeText={onChange}
              autoCapitalize="none"
            />
            <Text style={styles.colorHelpText}>
              Puedes escribir HEX o RGB y luego Guardar.
            </Text>
          </View>
        )}
      </View>
    );
  };

  const renderPaymentModeSelector = (
    value: boolean,
    onChange: (nextValue: boolean) => void,
  ) => (
    <View style={styles.paymentModeBox}>
      <Text style={styles.inputLabel}>Marcado de pago</Text>

      <View style={styles.paymentModeRow}>
        <Pressable
          style={[
            styles.paymentModeButton,
            value && styles.paymentModeButtonActive,
          ]}
          onPress={() => onChange(true)}
        >
          <Ionicons
            name="sync-outline"
            size={16}
            color={value ? colors.white : colors.primaryDark}
          />
          <Text
            style={[
              styles.paymentModeText,
              value && styles.paymentModeTextActive,
            ]}
          >
            Automático
          </Text>
        </Pressable>

        <Pressable
          style={[
            styles.paymentModeButton,
            !value && styles.paymentModeButtonActive,
          ]}
          onPress={() => onChange(false)}
        >
          <Ionicons
            name="hand-left-outline"
            size={16}
            color={!value ? colors.white : colors.primaryDark}
          />
          <Text
            style={[
              styles.paymentModeText,
              !value && styles.paymentModeTextActive,
            ]}
          >
            Manual
          </Text>
        </Pressable>
      </View>

      <Text style={styles.paymentModeHelp}>
        Automático se marca solo cuando pasa la fecha. Manual queda pendiente
        hasta que lo confirmes.
      </Text>
    </View>
  );

  const renderEditableTitle = (
    type: ExpenseSectionType,
    value: string,
  ) => {
    const isEditing = editingSectionTitle === type;

    if (isEditing) {
      return (
        <View style={styles.editTitleRow}>
          <TextInput
            style={styles.editTitleInput}
            value={value}
            onChangeText={(nextValue) => updateSectionTitle(type, nextValue)}
          />
          <Pressable
            style={styles.titleIconButton}
            onPress={() => setEditingSectionTitle(null)}
          >
            <Ionicons name="checkmark" size={16} color={colors.white} />
          </Pressable>
        </View>
      );
    }

    return (
      <View style={styles.titleWithEdit}>
        <Text style={styles.sectionTitle}>{value}</Text>
        <Pressable
          style={styles.titleIconButtonSoft}
          onPress={() => setEditingSectionTitle(type)}
        >
          <Ionicons
            name="create-outline"
            size={14}
            color={colors.primaryDark}
          />
        </Pressable>
      </View>
    );
  };

  const renderCalendar = () => {
    const [year, month] = calendarMonth.split("-").map(Number);
    const selectedDate =
      calendarTarget === "fixedCreate"
        ? fixedDate
        : calendarTarget === "variableCreate"
          ? variableDate
          : calendarTarget === "spaceIncome"
            ? spaceIncomeDate
            : editDate;
    const calendarTitle = formatMonthText(calendarMonth);
    const firstDay = new Date(year, month - 1, 1);
    const lastDay = new Date(year, month, 0);
    const totalDays = lastDay.getDate();
    const firstWeekDay = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1;
    const emptyDays = Array.from({ length: firstWeekDay });
    const days = Array.from({ length: totalDays }, (_, index) => index + 1);

    return (
      <Modal
        visible={calendarVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setCalendarVisible(false)}
      >
        <View style={commonStyles.modalOverlay}>
          <View style={styles.calendarCard}>
            <View style={styles.calendarHeader}>
              <Pressable
                style={styles.monthButton}
                onPress={() => changeCalendarMonth(-1)}
              >
                <Ionicons
                  name="chevron-back"
                  size={22}
                  color={colors.primaryDark}
                />
              </Pressable>

              <Text style={styles.calendarTitle}>{calendarTitle}</Text>

              <Pressable
                style={styles.monthButton}
                onPress={() => changeCalendarMonth(1)}
              >
                <Ionicons
                  name="chevron-forward"
                  size={22}
                  color={colors.primaryDark}
                />
              </Pressable>
            </View>

            <View style={styles.weekRow}>
              {["L", "M", "X", "J", "V", "S", "D"].map((day) => (
                <Text key={day} style={styles.weekText}>
                  {day}
                </Text>
              ))}
            </View>

            <View style={styles.daysGrid}>
              {emptyDays.map((_, index) => (
                <View key={`empty-${index}`} style={styles.dayButton} />
              ))}

              {days.map((day) => {
                const date = `${calendarMonth}-${String(day).padStart(2, "0")}`;
                const selected = date === selectedDate;

                return (
                  <Pressable
                    key={date}
                    style={[
                      styles.dayButton,
                      selected && styles.dayButtonSelected,
                    ]}
                    onPress={() => selectCalendarDate(date)}
                  >
                    <Text
                      style={[
                        styles.dayButtonText,
                        selected && styles.dayButtonTextSelected,
                      ]}
                    >
                      {day}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <Pressable
              style={commonStyles.modalCancelButton}
              onPress={() => setCalendarVisible(false)}
            >
              <Text style={commonStyles.modalCancelText}>Cancelar</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    );
  };

  return (
    <View style={commonStyles.screen}>
      <Header
        title="Gastos"
        headerStyle={{ backgroundColor: colors.surface }}
        headerTintColor={colors.text}
        headerTitleStyle={{ color: colors.text }}
      />

      <Pressable
        style={commonStyles.settingsButton}
        onPress={() => router.push("/settings")}
      >
        <Text style={commonStyles.settingsButtonText}>☰</Text>
      </Pressable>
      <SpaceMenuButton isDesktop={isDesktop} />

      <ScrollView
        contentContainerStyle={commonStyles.container}
        keyboardShouldPersistTaps="handled"
      >
        <View style={commonStyles.content}>
          <DataState
            loading={isLoadingData && !hasLoadedData && !hasVisibleFinanceData}
            error={dataError}
            autoRetryMs={2000}
            onRetry={retryLoadAll}
          />
          <ActionNotice message={actionMessage} />

          <View style={styles.monthBar}>
            <Pressable
              onPress={() => changeMonth(-1)}
              style={styles.monthButton}
            >
              <Ionicons
                name="chevron-back"
                size={22}
                color={colors.primaryDark}
              />
            </Pressable>

            <Text style={styles.monthText}>{formatMonthText(selectedMonth)}</Text>

            <Pressable
              onPress={() => changeMonth(1)}
              style={styles.monthButton}
            >
              <Ionicons
                name="chevron-forward"
                size={22}
                color={colors.primaryDark}
              />
            </Pressable>
          </View>

          <View style={styles.balanceCard}>
            <View style={styles.balanceTextBlock}>
              <Text style={styles.balanceLabel}>Balance mensual</Text>
              <Text style={styles.balanceSubText}>
                Disponible después de gastos
              </Text>
            </View>

            <Text
              style={styles.balanceAmount}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.6}
            >
              {formatCompactMoney(available)}
            </Text>
          </View>

          <View style={styles.summaryCard}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>
                {activeSpaceId ? "Ingresos del espacio" : "Sueldo"}
              </Text>

              {!editingSalary ? (
                <Pressable
                  style={styles.amountWithAction}
                  onPress={() => {
                    setSalaryInput(String(salary));
                    setEditingSalary(true);
                  }}
                >
                  <Text style={styles.summaryAmount}>
                    {formatCompactMoney(salary)}
                  </Text>
                </Pressable>
              ) : (
                <Text style={styles.summaryAmount}>
                  {formatCompactMoney(salary)}
                </Text>
              )}
            </View>

            <View style={styles.separator} />
            {totalIncomeTransactions > 0 && (
              <>
                <SummaryRow
                  label="Bizum recibido"
                  value={formatCompactMoney(totalIncomeTransactions)}
                  styles={styles}
                />
                <View style={styles.separator} />
              </>
            )}
            {Boolean(activeSpaceId) && (
              <>
                <SummaryRow
                  label="Ingresos añadidos"
                  value={formatCompactMoney(spaceIncomeTotal)}
                  styles={styles}
                />
                <View style={styles.separator} />
              </>
            )}
            <SummaryRow
              label={fixedSectionTitle}
              value={formatCompactMoney(fixedPaidTotal)}
              styles={styles}
            />
            <View style={styles.separator} />
            <SummaryRow
              label={variableSectionTitle}
              value={formatCompactMoney(totalExpenses)}
              styles={styles}
            />
          </View>

          {Boolean(activeSpaceId) && (
            <Pressable
              style={[styles.primaryButton, styles.incomeButton]}
              onPress={() => setSpaceIncomeModalVisible(true)}
            >
              <Ionicons
                name="add-circle-outline"
                size={18}
                color={colors.white}
              />
              <Text style={styles.primaryButtonText}>
                Aportar dinero al espacio
              </Text>
            </Pressable>
          )}

          <Pressable
            style={styles.categoryManagerButton}
            onPress={() => setShowCategoryManager(true)}
          >
            <Ionicons
              name="color-palette-outline"
              size={18}
              color={colors.primaryDark}
            />
            <Text style={styles.categoryManagerButtonText}>
              Categorías y colores
            </Text>
          </Pressable>

          <ExpenseSection
            type="fixed"
            isOpen={showFixedSection}
            setIsOpen={setShowFixedSection}
            title={fixedSectionTitle}
            renderEditableTitle={renderEditableTitle}
            count={fixedExpenses.length}
            total={formatCompactMoney(totalFixed)}
            showAdd={showAddFixed}
            setShowAdd={setShowAddFixed}
            filterTitle="Filtrar por categoría"
            renderFilterSelector={() =>
              renderFilterSelector(
                fixedFilterCategory,
                setFixedFilterCategory,
                showFixedFilter,
                setShowFixedFilter,
                [],
                [
                  "Bizum recibido",
                  "Bizum enviado",
                  "Devoluciones",
                  "Pendiente de cobrar",
                ],
                fixedCategorySearch,
                setFixedCategorySearch,
              )
            }
            styles={styles}
          >
            {renderCategoryFilterSummary(fixedFilterCategory, fixedFilterTotal)}
            <View style={styles.paidFilterRow}>
              {(["Todas", "Pendientes", "Pagados"] as FixedPaidFilter[]).map(
                (option) => (
                  <Pressable
                    key={option}
                    style={[
                      styles.paidFilterButton,
                      fixedPaidFilter === option && styles.paidFilterButtonActive,
                    ]}
                    onPress={() => setFixedPaidFilter(option)}
                  >
                    <Text
                      style={[
                        styles.paidFilterText,
                        fixedPaidFilter === option && styles.paidFilterTextActive,
                      ]}
                    >
                      {option}
                    </Text>
                  </Pressable>
                ),
              )}
            </View>

            {false && (
              <View style={styles.formBox}>
                <TextInput
                  style={styles.input}
                  placeholder="Concepto"
                  value={fixedTitle}
                  onChangeText={setFixedTitle}
                />
                {renderMoneyInput(fixedAmount, setFixedAmount, "Importe")}
                <Text style={styles.inputLabel}>Fecha</Text>
                {renderDateButton(fixedDate, () =>
                  openCalendar("fixedCreate", fixedDate),
                )}
                <Text style={styles.categoryTitle}>Categoría</Text>
                {renderCategorySelector(fixedCategory, setFixedCategory)}
                {renderPaymentModeSelector(fixedAutoPay, setFixedAutoPay)}
                <Pressable
                  style={styles.primaryButton}
                  onPress={() => runAction(handleAddFixedExpense, "¿Guardar este gasto fijo?")}
                >
                  <Text style={styles.primaryButtonText}>Guardar fijo</Text>
                </Pressable>
              </View>
            )}

            {!showAddFixed && filteredFixedExpenses.length === 0 && (
              <EmptyState
                title="No hay gastos fijos este mes"
                text="Añade alquiler, luz, suscripciones u otros gastos que se repiten."
                actionLabel="Añadir fijo"
                icon="calendar-outline"
                onAction={() => setShowAddFixed(true)}
              />
            )}

            {filteredFixedExpenses.map((item: any) => {
              const currentCategory = normalizeCategory(item.category);
              const fullDate = getDateFromMonthAndDay(
                item.month || selectedMonth,
                item.day_of_month,
              );
              return (
                <View key={`fixed-${item.id}`}>
                  <Pressable
                    style={styles.expenseRow}
                    onPress={() => setDetailExpense({ item, type: "fixed" })}
                  >
                  <View style={styles.expenseInfo}>
                    <View style={styles.expenseTopLine}>
                      <Text
                        style={[
                          styles.expenseTitle,
                          item.is_paid && styles.expensePaid,
                        ]}
                        numberOfLines={1}
                      >
                        {item.title}
                      </Text>
                      {renderCategoryBadge(currentCategory)}
                    </View>

                    <View style={styles.expenseMetaRow}>
                      <Text style={styles.expenseMeta}>
                        {fullDate} · {formatCompactMoney(Number(item.amount || 0))}
                      </Text>
                      <View style={styles.paymentTypeBadge}>
                        <Text style={styles.paymentTypeBadgeText}>
                          {item.auto_pay ?? true
                            ? "Pago automático"
                            : "Pago manual"}
                        </Text>
                      </View>
                    </View>
                    {item.is_transferred && (
                      <Text style={styles.expenseMeta}>Traspasado</Text>
                    )}
                  </View>

                  <Ionicons
                    name="chevron-forward"
                    size={18}
                    color={colors.mutedText}
                  />
                  </Pressable>
                </View>
              );
            })}
          </ExpenseSection>

          <ExpenseSection
            type="variable"
            isOpen={showVariableSection}
            setIsOpen={setShowVariableSection}
            title={variableSectionTitle}
            renderEditableTitle={renderEditableTitle}
            count={variableItems.length}
            total={formatCompactMoney(variableNetTotal)}
            showAdd={showAddVariable}
            setShowAdd={(value) => {
              setShowAddVariable(value);
              if (value) setVariableDate(getTodayDate());
            }}
            filterTitle="Filtrar por categoría"
            renderFilterSelector={() =>
              renderFilterSelector(
                variableFilterCategory,
                setVariableFilterCategory,
                showVariableFilter,
                setShowVariableFilter,
                variableFilterCategories,
                [],
                variableCategorySearch,
                setVariableCategorySearch,
              )
            }
            styles={styles}
          >
            {renderCategoryFilterSummary(
              variableFilterCategory,
              variableFilterTotal,
            )}
            <View style={styles.bizumActionRow}>
              <Pressable
                style={[styles.bizumActionButton, styles.bizumReceivedButton]}
                onPress={() => openBizumModal("received")}
              >
                <Ionicons
                  name="arrow-down-circle-outline"
                  size={18}
                  color={colors.primaryDark}
                />
                <Text style={styles.bizumActionText}>Bizum recibido</Text>
              </Pressable>

              <Pressable
                style={styles.bizumActionButton}
                onPress={() => openBizumModal("sent")}
              >
                <Ionicons
                  name="arrow-up-circle-outline"
                  size={18}
                  color={colors.primaryDark}
                />
                <Text style={styles.bizumActionText}>Bizum enviado</Text>
              </Pressable>
            </View>

            <View style={styles.bizumActionRow}>
              <Pressable
                style={[styles.bizumActionButton, styles.bizumReceivedButton]}
                onPress={() => openBizumModal("refund")}
              >
                <Ionicons
                  name="return-down-back-outline"
                  size={18}
                  color={colors.primaryDark}
                />
                <Text style={styles.bizumActionText}>Devolución</Text>
              </Pressable>

              <Pressable
                style={[styles.bizumActionButton, styles.owedButton]}
                onPress={() => openBizumModal("owed")}
              >
                <Ionicons
                  name="alert-circle-outline"
                  size={18}
                  color={colors.danger}
                />
                <Text style={[styles.bizumActionText, styles.owedButtonText]}>
                  Me deben
                </Text>
              </Pressable>
            </View>

            {false && (
              <View style={styles.formBox}>
                <TextInput
                  style={styles.input}
                  placeholder="Concepto"
                  value={title}
                  onChangeText={setTitle}
                />
                {renderMoneyInput(amount, setAmount, "Importe")}
                <Text style={styles.inputLabel}>Fecha</Text>
                {renderDateButton(variableDate, () =>
                  openCalendar("variableCreate", variableDate),
                )}
                <Text style={styles.categoryTitle}>Categoría</Text>
                {renderCategorySelector(variableCategory, setVariableCategory)}
                <Pressable
                  style={styles.primaryButton}
                  onPress={() => runAction(handleAddExpense, "¿Guardar este gasto?")}
                >
                  <Text style={styles.primaryButtonText}>Guardar gasto</Text>
                </Pressable>
              </View>
            )}

            {!showAddVariable && filteredVariableExpenses.length === 0 && (
              <EmptyState
                title="No hay otros gastos"
                text="Registra compras, ocio o movimientos puntuales de este mes."
                actionLabel="Añadir gasto"
                icon="card-outline"
                onAction={() => setShowAddVariable(true)}
              />
            )}

            {filteredVariableExpenses.map((item: any) => {
              const isIncome = item.type === "income" || item.is_income;
              const currentCategory = normalizeCategory(item.category);
              const isOwed = currentCategory === "Pendiente de cobrar";
              const fullDate = getDateFromMonthAndDay(
                item.month || selectedMonth,
                item.day_of_month || 1,
              );
              const moveKey = `${isIncome ? "income" : "variable"}-${item.id}`;
              const signedAmount = `${isIncome ? "+" : "-"} ${formatCompactMoney(Number(item.amount || 0))}`;

              return (
                <View key={moveKey}>
                  <Pressable
                    style={styles.expenseRow}
                    onPress={() => setDetailExpense({ item, type: "variable" })}
                  >
                  <View style={styles.expenseInfo}>
                    <View style={styles.expenseTopLine}>
                      <Text
                        style={[
                          styles.expenseTitle,
                          !isIncome && item.is_transferred && styles.expensePaid,
                        ]}
                        numberOfLines={1}
                      >
                        {item.title}
                      </Text>
                      {renderCategoryBadge(currentCategory)}
                    </View>

                    <Text
                      style={[
                        styles.expenseMeta,
                        isIncome && styles.incomeMeta,
                        isOwed && styles.owedMeta,
                      ]}
                    >
                      {fullDate} · {signedAmount}
                    </Text>
                  </View>

                  <Ionicons
                    name="chevron-forward"
                    size={18}
                    color={colors.mutedText}
                  />
                  </Pressable>
                </View>
              );
            })}
          </ExpenseSection>
        </View>
      </ScrollView>

      <Modal
        visible={showCategoryManager}
        transparent
        animationType="fade"
        onRequestClose={() => setShowCategoryManager(false)}
      >
        <Pressable
          style={commonStyles.modalOverlay}
          onPress={() => setShowCategoryManager(false)}
        >
          <Pressable
            style={styles.categoryModalCard}
            onPress={(event) => event.stopPropagation()}
          >
            <View style={commonStyles.modalHeader}>
              <View style={commonStyles.modalTitleBlock}>
                <Text style={commonStyles.modalTitle}>Categorías</Text>
                <Text style={commonStyles.modalSubtitle}>
                  Crea categorías y cambia su color para gastos y resumen.
                </Text>
              </View>
              <Pressable
                style={commonStyles.closeButton}
                onPress={() => setShowCategoryManager(false)}
              >
                <Ionicons name="close" size={22} color={colors.primaryDark} />
              </Pressable>
            </View>

            <ScrollView
              style={commonStyles.modalScroll}
              keyboardShouldPersistTaps="handled"
            >
              <View style={styles.categoryManagerCreateBox}>
                <View style={styles.categoryManagerHeader}>
                  <View style={styles.categoryManagerTextBlock}>
                    <Text style={styles.categoryColorTitle}>Nueva categoría</Text>
                    <TextInput
                      style={styles.categoryInput}
                      placeholder="Nombre"
                      value={newCategory}
                      onChangeText={setNewCategory}
                    />
                  </View>
                  <Pressable
                    style={styles.saveCategoryButton}
                    onPress={() =>
                      runAction(() => createCategory(), "¿Crear esta categoría?")
                    }
                  >
                    <Text style={styles.saveCategoryButtonText}>
                      Crear categoría
                    </Text>
                  </Pressable>
                </View>
                {renderColorPicker(newCategoryColor, setNewCategoryColor, "new-category")}
              </View>

              <View style={styles.categoryManagerList}>
                {categories.map((category) => {
                  const categoryColor = getCategoryColor(
                    category,
                    categoryColors,
                  );
                  const draftColor =
                    categoryColorDrafts[category] || categoryColor;
                  const normalizedDraft =
                    normalizeColor(draftColor) || categoryColor;

                  return (
                    <View key={category} style={styles.categoryManagerItem}>
                      <View style={styles.categoryManagerHeader}>
                        <View style={styles.categoryManagerTextBlock}>
                          <View
                            style={[
                              styles.categoryBadge,
                              {
                                backgroundColor:
                                  getCategorySoftColor(normalizedDraft),
                                borderColor: normalizedDraft,
                              },
                            ]}
                          >
                            <Text
                              style={[
                                styles.categoryBadgeText,
                                { color: normalizedDraft },
                              ]}
                            >
                              {category}
                            </Text>
                          </View>
                          {renderColorPicker(
                            draftColor,
                            (nextColor) =>
                              setCategoryColorDrafts((current) => ({
                                ...current,
                                [category]: nextColor,
                              })),
                            `category-${category}`,
                          )}
                        </View>
                        <Pressable
                          style={styles.categoryManagerSaveButton}
                          onPress={() =>
                            runAction(
                              () => saveCategoryColor(category),
                              "¿Guardar el color de esta categoría?",
                            )
                          }
                        >
                          <Text style={styles.categoryManagerSaveText}>
                            Guardar
                          </Text>
                        </Pressable>
                      </View>
                    </View>
                  );
                })}
              </View>
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal
        visible={editingSalary}
        transparent
        animationType="fade"
        onRequestClose={() => setEditingSalary(false)}
      >
        <View style={commonStyles.modalOverlay}>
          <View style={commonStyles.modalCardSmall}>
            <View style={commonStyles.modalHeader}>
              <View style={commonStyles.modalTitleBlock}>
                <Text style={commonStyles.modalTitle}>
                  {activeSpaceId ? "Editar ingresos del espacio" : "Editar sueldo"}
                </Text>
                <Text style={commonStyles.modalSubtitle}>
                  Indica el importe mensual que quieres usar para el resumen.
                </Text>
              </View>
              <Pressable
                style={commonStyles.closeButton}
                onPress={() => setEditingSalary(false)}
              >
                <Ionicons name="close" size={22} color={colors.primaryDark} />
              </Pressable>
            </View>

            {renderMoneyInput(salaryInput, setSalaryInput)}

            <View style={commonStyles.modalActions}>
              <Pressable
                style={commonStyles.modalCancelButton}
                onPress={() => setEditingSalary(false)}
              >
                <Text style={commonStyles.modalCancelText}>Cancelar</Text>
              </Pressable>
              <Pressable
                disabled={isActionBusy}
                style={[
                  commonStyles.modalSaveButton,
                  isActionBusy && { opacity: 0.6 },
                ]}
                onPress={() => runAction(saveIncome, "¿Guardar estos ingresos?")}
              >
                <Text style={commonStyles.modalSaveText}>
                  {isActionBusy ? "Guardando..." : "Guardar"}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={showAddFixed}
        transparent
        animationType="fade"
        onRequestClose={() => setShowAddFixed(false)}
      >
        <View style={commonStyles.modalOverlay}>
          <View style={commonStyles.modalCardSmall}>
            <View style={commonStyles.modalHeader}>
              <View style={commonStyles.modalTitleBlock}>
                <Text style={commonStyles.modalTitle}>Añadir gasto fijo</Text>
                <Text style={commonStyles.modalSubtitle}>
                  Registra un gasto que se repite cada mes. Podrás marcarlo como pagado manualmente o dejar que se marque automáticamente al pasar la fecha.
                </Text>
              </View>

              <Pressable
                style={commonStyles.closeButton}
                onPress={() => setShowAddFixed(false)}
              >
                <Ionicons name="close" size={22} color={colors.primaryDark} />
              </Pressable>
            </View>

            <Text style={styles.inputLabel}>Fecha</Text>
            {renderDateButton(fixedDate, () =>
              openCalendar("fixedCreate", fixedDate),
            )}
            <Text style={styles.categoryTitle}>Categoría</Text>
            {renderCategorySelector(fixedCategory, setFixedCategory)}
            <Text style={styles.inputLabel}>Concepto</Text>
            <TextInput
              style={styles.input}
              placeholder="Concepto"
              value={fixedTitle}
              onChangeText={setFixedTitle}
            />
            <Text style={styles.inputLabel}>Importe</Text>
            {renderMoneyInput(fixedAmount, setFixedAmount, "Importe")}
            {renderPaymentModeSelector(fixedAutoPay, setFixedAutoPay)}

            <View style={commonStyles.modalActions}>
              <Pressable
                style={commonStyles.modalCancelButton}
                onPress={() => setShowAddFixed(false)}
              >
                <Text style={commonStyles.modalCancelText}>Cancelar</Text>
              </Pressable>

              <Pressable
                disabled={isActionBusy}
                style={[
                  commonStyles.modalSaveButton,
                  isActionBusy && { opacity: 0.6 },
                ]}
                onPress={() => runAction(handleAddFixedExpense, "¿Guardar este gasto fijo?")}
              >
                <Text style={commonStyles.modalSaveText}>
                  {isActionBusy ? "Guardando..." : "Guardar"}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={showAddVariable}
        transparent
        animationType="fade"
        onRequestClose={() => setShowAddVariable(false)}
      >
        <View style={commonStyles.modalOverlay}>
          <View style={commonStyles.modalCardSmall}>
            <View style={commonStyles.modalHeader}>
              <View style={commonStyles.modalTitleBlock}>
                <Text style={commonStyles.modalTitle}>Añadir gasto</Text>
                <Text style={commonStyles.modalSubtitle}>
                  Registra un movimiento puntual de este mes.
                </Text>
              </View>

              <Pressable
                style={commonStyles.closeButton}
                onPress={() => setShowAddVariable(false)}
              >
                <Ionicons name="close" size={22} color={colors.primaryDark} />
              </Pressable>
            </View>

            <Text style={styles.inputLabel}>Fecha</Text>
            {renderDateButton(variableDate, () =>
              openCalendar("variableCreate", variableDate),
            )}
            <Text style={styles.categoryTitle}>Categoría</Text>
            {renderCategorySelector(variableCategory, setVariableCategory)}
            <Text style={styles.inputLabel}>Concepto</Text>
            <TextInput
              style={styles.input}
              placeholder="Concepto"
              value={title}
              onChangeText={setTitle}
            />
            <Text style={styles.inputLabel}>Importe</Text>
            {renderMoneyInput(amount, setAmount, "Importe")}

            <View style={commonStyles.modalActions}>
              <Pressable
                style={commonStyles.modalCancelButton}
                onPress={() => setShowAddVariable(false)}
              >
                <Text style={commonStyles.modalCancelText}>Cancelar</Text>
              </Pressable>

              <Pressable
                disabled={isActionBusy}
                style={[
                  commonStyles.modalSaveButton,
                  isActionBusy && { opacity: 0.6 },
                ]}
                onPress={() => runAction(handleAddExpense, "¿Guardar este gasto?")}
              >
                <Text style={commonStyles.modalSaveText}>
                  {isActionBusy ? "Guardando..." : "Guardar"}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={spaceIncomeModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setSpaceIncomeModalVisible(false)}
      >
        <View style={commonStyles.modalOverlay}>
          <View style={commonStyles.modalCardSmall}>
            <View style={commonStyles.modalHeader}>
              <View style={commonStyles.modalTitleBlock}>
                <Text style={commonStyles.modalTitle}>
                  Aportar dinero al espacio
                </Text>
                <Text style={commonStyles.modalSubtitle}>
                  Se suma aquí y se descuenta de tu personal
                </Text>
              </View>

              <Pressable
                style={commonStyles.closeButton}
                onPress={() => setSpaceIncomeModalVisible(false)}
              >
                <Ionicons name="close" size={22} color={colors.primaryDark} />
              </Pressable>
            </View>

            {renderMoneyInput(spaceIncomeAmount, setSpaceIncomeAmount)}
            <Text style={styles.inputLabel}>Fecha</Text>
            {renderDateButton(spaceIncomeDate, () =>
              openCalendar("spaceIncome", spaceIncomeDate),
            )}
            <TextInput
              style={styles.input}
              placeholder="Nota"
              value={spaceIncomeNote}
              onChangeText={setSpaceIncomeNote}
            />

            <View style={commonStyles.modalActions}>
              <Pressable
                style={commonStyles.modalCancelButton}
                onPress={() => setSpaceIncomeModalVisible(false)}
              >
                <Text style={commonStyles.modalCancelText}>Cancelar</Text>
              </Pressable>

              <Pressable
                disabled={isActionBusy}
                style={[
                  commonStyles.modalSaveButton,
                  isActionBusy && { opacity: 0.6 },
                ]}
                onPress={() => runAction(handleAddSpaceIncome, "¿Guardar esta aportación?")}
              >
                <Text style={commonStyles.modalSaveText}>
                  {isActionBusy ? "Guardando..." : "Guardar"}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={!!bizumModalType}
        transparent
        animationType="fade"
        onRequestClose={closeBizumModal}
      >
        <View style={commonStyles.modalOverlay}>
          <View style={commonStyles.modalCardSmall}>
            <View style={commonStyles.modalHeader}>
              <View style={commonStyles.modalTitleBlock}>
                <Text style={commonStyles.modalTitle}>
                  {bizumModalType === "received"
                    ? "Bizum recibido"
                    : bizumModalType === "sent"
                      ? "Bizum enviado"
                      : bizumModalType === "refund"
                        ? "Devolución"
                        : "Dinero pendiente de cobrar"}
                </Text>
                <Text style={commonStyles.modalSubtitle}>
                  {bizumModalType === "received" || bizumModalType === "refund"
                    ? "Se sumará al saldo disponible"
                    : bizumModalType === "owed"
                      ? "Se mostrará como importe pendiente en rojo"
                      : "Se descontará del saldo disponible"}
                </Text>
              </View>

              <Pressable
                style={commonStyles.closeButton}
                onPress={closeBizumModal}
              >
                <Ionicons name="close" size={22} color={colors.primaryDark} />
              </Pressable>
            </View>

            <TextInput
              style={styles.input}
              placeholder="Nombre"
              value={bizumName}
              onChangeText={setBizumName}
            />
            <TextInput
              style={styles.input}
              placeholder="Concepto"
              value={bizumConcept}
              onChangeText={setBizumConcept}
            />
            {renderMoneyInput(bizumAmount, setBizumAmount)}
            <Text style={styles.inputLabel}>Fecha</Text>
            {renderDateButton(variableDate, () =>
              openCalendar("variableCreate", variableDate),
            )}

            <View style={commonStyles.modalActions}>
              <Pressable
                style={commonStyles.modalCancelButton}
                onPress={closeBizumModal}
              >
                <Text style={commonStyles.modalCancelText}>Cancelar</Text>
              </Pressable>

              <Pressable
                disabled={isActionBusy}
                style={[
                  commonStyles.modalSaveButton,
                  isActionBusy && { opacity: 0.6 },
                ]}
                onPress={() => runAction(handleAddBizum, "¿Guardar este movimiento?")}
              >
                <Text style={commonStyles.modalSaveText}>
                  {isActionBusy ? "Guardando..." : "Guardar"}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={!!editingItem}
        transparent
        animationType="fade"
        onRequestClose={closeEditModal}
      >
        <View style={commonStyles.modalOverlay}>
          <View style={commonStyles.modalCardSmall}>
            <View style={commonStyles.modalHeader}>
              <View style={commonStyles.modalTitleBlock}>
                <Text style={commonStyles.modalTitle}>
                  {editingType === "fixed"
                    ? "Editar gasto fijo"
                    : "Editar gasto"}
                </Text>
                <Text style={commonStyles.modalSubtitle}>
                  {editingItem?.title}
                </Text>
              </View>

              <Pressable
                style={commonStyles.closeButton}
                onPress={closeEditModal}
              >
                <Ionicons name="close" size={22} color={colors.primaryDark} />
              </Pressable>
            </View>

            <Text style={styles.inputLabel}>Concepto</Text>
            <TextInput
              style={styles.input}
              placeholder="Concepto"
              value={editTitle}
              onChangeText={setEditTitle}
            />

            <Text style={styles.inputLabel}>Importe</Text>
            {renderMoneyInput(editAmount, setEditAmount)}

            <Text style={styles.inputLabel}>Fecha</Text>
            {renderDateButton(editDate, () => openCalendar("edit", editDate))}

            <Text style={styles.inputLabel}>Categoría</Text>

            <View style={styles.dropdownBox}>
              <Pressable
                style={styles.dropdownButton}
                onPress={() =>
                  setShowEditCategoryDropdown(!showEditCategoryDropdown)
                }
              >
                <Text style={styles.dropdownButtonText}>{editCategory}</Text>
                <Ionicons
                  name={showEditCategoryDropdown ? "chevron-up" : "chevron-down"}
                  size={16}
                  color={colors.primaryDark}
                />
              </Pressable>

              {showEditCategoryDropdown && (
                <View style={styles.dropdownOptions}>
                  {categories.map((category) => (
                    <Pressable
                      key={category}
                      style={[
                        styles.dropdownOption,
                        editCategory === category &&
                          styles.dropdownOptionActive,
                      ]}
                      onPress={() => {
                        setEditCategory(category);
                        setShowEditCategoryDropdown(false);
                      }}
                    >
                      <Text
                        style={[
                          styles.dropdownOptionText,
                          editCategory === category &&
                            styles.dropdownOptionTextActive,
                        ]}
                      >
                        {category}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              )}
            </View>

            {editingType === "fixed" &&
              renderPaymentModeSelector(editAutoPay, setEditAutoPay)}

            <View style={commonStyles.modalActions}>
              <Pressable
                style={commonStyles.modalCancelButton}
                onPress={closeEditModal}
              >
                <Text style={commonStyles.modalCancelText}>Cancelar</Text>
              </Pressable>

              <Pressable
                disabled={isActionBusy}
                style={[
                  commonStyles.modalSaveButton,
                  isActionBusy && { opacity: 0.6 },
                ]}
                onPress={() => runAction(saveEdit, "¿Aplicar los cambios?")}
              >
                <Text style={commonStyles.modalSaveText}>
                  {isActionBusy ? "Guardando..." : "Guardar"}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {renderDetailModal()}
      {renderCalendar()}
    </View>
  );
}

function SummaryRow({
  label,
  value,
  styles,
}: {
  label: string;
  value: string;
  styles: ReturnType<typeof createStyles>;
}) {
  return (
    <View style={styles.summaryRow}>
      <Text style={styles.summaryLabel}>{label}</Text>
      <Text style={styles.summaryAmount}>{value}</Text>
    </View>
  );
}

function ExpenseSection({
  isOpen,
  setIsOpen,
  type,
  title,
  renderEditableTitle,
  count,
  total,
  showAdd,
  setShowAdd,
  filterTitle,
  renderFilterSelector,
  children,
  styles,
}: {
  isOpen: boolean;
  setIsOpen: (value: boolean) => void;
  type: ExpenseSectionType;
  title: string;
  renderEditableTitle: (
    type: ExpenseSectionType,
    value: string,
  ) => ReactNode;
  count: number;
  total: string;
  showAdd: boolean;
  setShowAdd: (value: boolean) => void;
  filterTitle: string;
  renderFilterSelector: () => React.ReactNode;
  children: ReactNode;
  styles: ReturnType<typeof createStyles>;
}) {
  return (
    <View style={styles.sectionCard}>
      <View style={styles.sectionHeader}>
        <Pressable
          style={styles.sectionTitleButton}
          onPress={() => setIsOpen(!isOpen)}
        >
          <Ionicons
            name={isOpen ? "chevron-down" : "chevron-forward"}
            size={20}
            color={colors.primaryDark}
          />

          <View style={styles.sectionTextBlock}>
            {renderEditableTitle(type, title)}
            <Text style={styles.sectionSubtitle}>
              {count} gastos · Total: {total}
            </Text>
          </View>
        </Pressable>

        <Pressable
          style={styles.addButton}
          onPress={() => {
            setShowAdd(!showAdd);
            setIsOpen(true);
          }}
        >
          <Ionicons
            name={showAdd ? "close" : "add"}
            size={19}
            color={colors.white}
          />
        </Pressable>
      </View>

      {isOpen && (
        <>
          <Text style={styles.filterTitle}>{filterTitle}</Text>
          {renderFilterSelector()}
          {children}
        </>
      )}
    </View>
  );
}

const createStyles = (isDesktop: boolean) =>
  StyleSheet.create({
    monthBar: {
      backgroundColor: colors.surface,
      borderRadius: 16,
      padding: isDesktop ? 10 : 8,
      borderWidth: 1,
      borderColor: colors.border,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: isDesktop ? 14 : 12,
    },

    monthButton: {
      width: isDesktop ? 40 : 36,
      height: isDesktop ? 40 : 36,
      borderRadius: 999,
      backgroundColor: colors.primarySoft,
      alignItems: "center",
      justifyContent: "center",
    },

    monthText: {
      fontSize: isDesktop ? 17 : 15,
      fontWeight: "900",
      color: colors.text,
    },

    balanceCard: {
      backgroundColor: colors.primaryDark,
      borderRadius: isDesktop ? 20 : 18,
      padding: isDesktop ? 22 : 16,
      marginBottom: isDesktop ? 14 : 12,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 12,
    },

    balanceTextBlock: {
      flex: 1,
      minWidth: 0,
    },

    balanceLabel: {
      fontSize: isDesktop ? 14 : 12,
      fontWeight: "900",
      color: colors.white,
    },

    balanceSubText: {
      fontSize: isDesktop ? 12 : 10,
      color: colors.white,
      opacity: 0.85,
      marginTop: 3,
      fontWeight: "700",
    },

    balanceAmount: {
      maxWidth: isDesktop ? 260 : 150,
      fontSize: isDesktop ? 32 : 24,
      fontWeight: "900",
      color: colors.white,
      textAlign: "right",
    },

    summaryCard: {
      backgroundColor: colors.surface,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.border,
      overflow: "hidden",
      marginBottom: 16,
    },

    summaryRow: {
      paddingVertical: isDesktop ? 13 : 11,
      paddingHorizontal: isDesktop ? 16 : 13,
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      gap: 12,
    },

    summaryLabel: {
      flex: 1,
      fontSize: isDesktop ? 14 : 12,
      color: colors.mutedText,
      fontWeight: "800",
    },

    summaryAmount: {
      fontSize: isDesktop ? 17 : 15,
      fontWeight: "900",
      color: colors.text,
      textAlign: "right",
    },

    separator: {
      height: 1,
      backgroundColor: colors.borderSoft,
    },

    amountWithAction: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },

    iconButtonSoft: {
      width: 30,
      height: 30,
      borderRadius: 9,
      backgroundColor: colors.primarySoft,
      alignItems: "center",
      justifyContent: "center",
    },

    iconButtonDark: {
      width: 30,
      height: 30,
      borderRadius: 9,
      backgroundColor: colors.primaryDark,
      alignItems: "center",
      justifyContent: "center",
    },

    sectionCard: {
      backgroundColor: colors.surface,
      borderRadius: isDesktop ? 18 : 16,
      borderWidth: 1,
      borderColor: colors.border,
      padding: isDesktop ? 22 : 17,
      marginBottom: isDesktop ? 22 : 18,
    },

    sectionHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      gap: 14,
      marginBottom: isDesktop ? 4 : 2,
    },

    sectionTitleButton: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      minWidth: 0,
    },

    sectionTextBlock: {
      flex: 1,
      minWidth: 0,
    },

    sectionTitle: {
      fontSize: isDesktop ? 18 : 16,
      fontWeight: "900",
      color: colors.text,
    },

    sectionSubtitle: {
      fontSize: isDesktop ? 13 : 11,
      color: colors.mutedText,
      marginTop: 2,
    },

    titleWithEdit: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
    },

    editTitleRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
    },

    editTitleInput: {
      minWidth: 120,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 8,
      paddingVertical: 5,
      paddingHorizontal: 8,
      fontSize: Platform.OS === "web" ? 16 : isDesktop ? 15 : 13,
      fontWeight: "800",
      color: colors.text,
      backgroundColor: colors.white,
    },

    titleIconButton: {
      width: 26,
      height: 26,
      borderRadius: 7,
      backgroundColor: colors.primaryDark,
      alignItems: "center",
      justifyContent: "center",
    },

    titleIconButtonSoft: {
      width: 24,
      height: 24,
      borderRadius: 7,
      backgroundColor: colors.primarySoft,
      alignItems: "center",
      justifyContent: "center",
    },

    addButton: {
      width: isDesktop ? 44 : 42,
      height: isDesktop ? 44 : 42,
      borderRadius: 13,
      backgroundColor: colors.primaryDark,
      alignItems: "center",
      justifyContent: "center",
    },

    formBox: {
      backgroundColor: colors.background,
      borderRadius: 12,
      padding: 10,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: colors.borderSoft,
    },

    input: {
      backgroundColor: colors.white,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 10,
      padding: isDesktop ? 11 : 9,
      marginBottom: 8,
      fontSize: Platform.OS === "web" ? 16 : isDesktop ? 14 : 12,
      color: colors.text,
    },

    moneyInputShell: {
      position: "relative",
      justifyContent: "center",
    },

    moneyInput: {
      paddingRight: 40,
    },

    moneyInputSuffix: {
      position: "absolute",
      right: 14,
      top: isDesktop ? 14 : 12,
      color: colors.mutedText,
      fontSize: Platform.OS === "web" ? 16 : isDesktop ? 13 : 12,
      fontWeight: "900",
    },

    inlineInput: {
      width: isDesktop ? 82 : 68,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 8,
      padding: isDesktop ? 7 : 5,
      textAlign: "center",
      backgroundColor: colors.white,
      fontSize: Platform.OS === "web" ? 16 : isDesktop ? 13 : 11,
      color: colors.text,
    },

    inputLabel: {
      fontSize: Platform.OS === "web" ? 16 : isDesktop ? 13 : 11,
      fontWeight: "800",
      color: colors.mutedText,
      marginBottom: 5,
    },

    dateButton: {
      backgroundColor: colors.white,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 10,
      padding: isDesktop ? 11 : 9,
      marginBottom: 8,
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },

    dateButtonText: {
      fontSize: isDesktop ? 14 : 12,
      color: colors.text,
      fontWeight: "700",
    },

    filterTitle: {
      fontSize: isDesktop ? 13 : 11,
      fontWeight: "800",
      color: colors.mutedText,
      marginTop: isDesktop ? 18 : 15,
      marginBottom: 10,
    },

    filterDropdown: {
      marginBottom: isDesktop ? 16 : 14,
    },

    paidFilterRow: {
      flexDirection: "row",
      gap: 7,
      marginBottom: 12,
    },

    paidFilterButton: {
      flex: 1,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.white,
      borderRadius: 999,
      paddingVertical: 8,
      alignItems: "center",
    },

    paidFilterButtonActive: {
      backgroundColor: colors.primaryDark,
      borderColor: colors.primaryDark,
    },

    paidFilterText: {
      color: colors.primaryDark,
      fontSize: isDesktop ? 12 : 10,
      fontWeight: "900",
    },

    paidFilterTextActive: {
      color: colors.white,
    },

    filterDropdownButton: {
      backgroundColor: colors.white,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 12,
      paddingVertical: isDesktop ? 13 : 12,
      paddingHorizontal: isDesktop ? 14 : 12,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 10,
    },

    filterDropdownText: {
      fontSize: isDesktop ? 14 : 13,
      color: colors.text,
      fontWeight: "900",
    },

    filterDropdownOptions: {
      marginTop: 6,
      backgroundColor: colors.white,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 10,
      overflow: "hidden",
    },

    filterSearchInput: {
      backgroundColor: colors.surface,
      borderBottomWidth: 1,
      borderBottomColor: colors.borderSoft,
      paddingVertical: isDesktop ? 10 : 9,
      paddingHorizontal: 12,
      fontSize: Platform.OS === "web" ? 16 : isDesktop ? 13 : 12,
      color: colors.text,
    },

    filterSummaryBox: {
      backgroundColor: colors.primarySoft,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 12,
      paddingVertical: 10,
      paddingHorizontal: 12,
      marginBottom: 12,
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      gap: 10,
    },

    filterSummaryLabel: {
      flex: 1,
      minWidth: 0,
      color: colors.primaryDark,
      fontSize: isDesktop ? 12 : 10,
      fontWeight: "900",
    },

    filterSummaryAmount: {
      color: colors.primaryDark,
      fontSize: isDesktop ? 14 : 12,
      fontWeight: "900",
      textAlign: "right",
    },

    filterDropdownOption: {
      paddingVertical: isDesktop ? 9 : 8,
      paddingHorizontal: 12,
      borderBottomWidth: 1,
      borderBottomColor: colors.borderSoft,
    },

    filterDropdownOptionActive: {
      backgroundColor: colors.primarySoft,
    },

    filterDropdownOptionText: {
      fontSize: isDesktop ? 13 : 12,
      color: colors.mutedText,
      fontWeight: "800",
    },

    filterDropdownOptionTextActive: {
      color: colors.primaryDark,
      fontWeight: "900",
    },

    categoryTitle: {
      fontSize: isDesktop ? 13 : 11,
      fontWeight: "800",
      color: colors.text,
      marginTop: 8,
      marginBottom: 8,
    },

    paymentModeBox: {
      marginTop: 10,
      marginBottom: 12,
    },

    paymentModeRow: {
      flexDirection: "row",
      gap: 8,
    },

    paymentModeButton: {
      flex: 1,
      minHeight: 38,
      borderRadius: 11,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.white,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 7,
      paddingVertical: 8,
      paddingHorizontal: 10,
    },

    paymentModeButtonActive: {
      backgroundColor: colors.primaryDark,
      borderColor: colors.primaryDark,
    },

    paymentModeText: {
      fontSize: isDesktop ? 12 : 11,
      color: colors.primaryDark,
      fontWeight: "900",
    },

    paymentModeTextActive: {
      color: colors.white,
    },

    paymentModeHelp: {
      marginTop: 7,
      fontSize: isDesktop ? 11 : 10,
      color: colors.mutedText,
      fontWeight: "700",
      lineHeight: isDesktop ? 16 : 14,
    },

    bizumActionRow: {
      flexDirection: "row",
      gap: 8,
      marginBottom: isDesktop ? 14 : 12,
    },

    bizumActionButton: {
      flex: 1,
      minHeight: 42,
      borderRadius: 12,
      backgroundColor: colors.primarySoft,
      borderWidth: 1,
      borderColor: colors.border,
      paddingVertical: isDesktop ? 10 : 9,
      paddingHorizontal: 12,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 7,
    },

    bizumReceivedButton: {
      backgroundColor: "#ECFDF5",
      borderColor: "#BBF7D0",
    },

    owedButton: {
      backgroundColor: "#FEF2F2",
      borderColor: "#FECACA",
    },

    owedButtonText: {
      color: colors.danger,
    },

    bizumActionText: {
      flexShrink: 1,
      fontSize: isDesktop ? 13 : 11,
      fontWeight: "900",
      color: colors.primaryDark,
    },

    categoryList: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 6,
      marginBottom: 10,
    },

    categoryButton: {
      backgroundColor: colors.white,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 999,
      paddingVertical: 6,
      paddingHorizontal: 10,
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
    },

    categoryButtonActive: {
      backgroundColor: colors.primaryDark,
      borderColor: colors.primaryDark,
    },

    categoryButtonText: {
      fontSize: isDesktop ? 12 : 10,
      fontWeight: "700",
      color: colors.mutedText,
    },

    categoryButtonTextActive: {
      color: colors.white,
    },

    categorySwatch: {
      width: 10,
      height: 10,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: "rgba(255,255,255,0.8)",
    },

    categoryInput: {
      flex: 1,
      backgroundColor: colors.white,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 10,
      padding: isDesktop ? 10 : 8,
      fontSize: Platform.OS === "web" ? 16 : isDesktop ? 13 : 11,
      color: colors.text,
    },

    dropdownBox: {
      marginBottom: 10,
    },

    dropdownButton: {
      flex: 1,
      backgroundColor: colors.white,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 10,
      paddingVertical: isDesktop ? 10 : 8,
      paddingHorizontal: 10,
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },

    dropdownButtonText: {
      fontSize: isDesktop ? 13 : 11,
      fontWeight: "800",
      color: colors.text,
    },

    categoryColorTitle: {
      color: colors.text,
      fontSize: isDesktop ? 12 : 10,
      fontWeight: "900",
    },

    colorPickerStack: {
      gap: 8,
      minWidth: 0,
    },

    colorPickerRow: {
      flexDirection: isDesktop ? "row" : "column",
      alignItems: isDesktop ? "center" : "stretch",
      gap: 10,
      minWidth: 0,
    },

    colorSwatchRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 7,
      flex: 1,
      minWidth: 0,
      maxWidth: isDesktop ? 390 : "100%",
    },

    colorSwatchButton: {
      width: isDesktop ? 28 : 26,
      height: isDesktop ? 28 : 26,
      borderRadius: 999,
      borderWidth: 2,
      borderColor: colors.surface,
    },

    colorSwatchButtonActive: {
      borderColor: colors.text,
    },

    colorApplyButton: {
      width: isDesktop ? 220 : "100%",
      minHeight: isDesktop ? 40 : 38,
      borderRadius: 11,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.white,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      paddingVertical: 8,
      paddingHorizontal: 12,
    },

    colorApplySwatch: {
      width: 16,
      height: 16,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: colors.border,
    },

    colorApplyText: {
      color: colors.primaryDark,
      fontSize: isDesktop ? 12 : 10,
      fontWeight: "900",
    },

    colorCustomRow: {
      gap: 6,
      minWidth: 0,
    },

    colorValueInput: {
      width: "100%",
      minHeight: isDesktop ? 40 : 38,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 11,
      backgroundColor: colors.white,
      color: colors.text,
      paddingVertical: 8,
      paddingHorizontal: 12,
      fontSize: Platform.OS === "web" ? 16 : isDesktop ? 13 : 11,
      fontWeight: "800",
    },

    colorHelpText: {
      color: colors.mutedText,
      fontSize: isDesktop ? 11 : 10,
      fontWeight: "700",
    },

    saveCategoryButton: {
      backgroundColor: colors.primaryDark,
      paddingHorizontal: 12,
      borderRadius: 10,
      alignItems: "center",
      justifyContent: "center",
    },

    saveCategoryButtonText: {
      color: colors.white,
      fontSize: isDesktop ? 12 : 10,
      fontWeight: "900",
    },

    dropdownOptions: {
      marginTop: 6,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 10,
      overflow: "hidden",
      backgroundColor: colors.white,
    },

    dropdownOption: {
      paddingVertical: isDesktop ? 10 : 8,
      paddingHorizontal: 10,
      borderBottomWidth: 1,
      borderBottomColor: colors.borderSoft,
    },

    dropdownOptionActive: {
      backgroundColor: colors.primarySoft,
    },

    dropdownOptionText: {
      fontSize: isDesktop ? 13 : 11,
      fontWeight: "700",
      color: colors.mutedText,
    },

    dropdownOptionTextActive: {
      color: colors.primaryDark,
      fontWeight: "900",
    },

    primaryButton: {
      backgroundColor: colors.primaryDark,
      padding: isDesktop ? 12 : 10,
      borderRadius: 10,
      alignItems: "center",
    },

    incomeButton: {
      marginBottom: 16,
      flexDirection: "row",
      justifyContent: "center",
      gap: 8,
    },

    categoryModalCard: {
      width: "100%",
      maxWidth: isDesktop ? 760 : 520,
      maxHeight: "86%",
      backgroundColor: colors.surface,
      borderRadius: 20,
      padding: isDesktop ? 24 : 16,
      borderWidth: 1,
      borderColor: colors.border,
    },

    categoryManagerButton: {
      marginBottom: 16,
      minHeight: 44,
      borderRadius: 13,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.primarySoft,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      paddingHorizontal: 12,
    },

    categoryManagerButtonText: {
      color: colors.primaryDark,
      fontSize: isDesktop ? 13 : 11,
      fontWeight: "900",
    },

    primaryButtonText: {
      color: colors.white,
      fontWeight: "900",
      fontSize: isDesktop ? 14 : 12,
    },

    expenseRow: {
      backgroundColor: "#F8FCFD",
      borderWidth: 1,
      borderColor: colors.borderSoft,
      borderRadius: isDesktop ? 15 : 14,
      paddingVertical: isDesktop ? 14 : 12,
      paddingHorizontal: isDesktop ? 16 : 13,
      marginBottom: isDesktop ? 12 : 11,
      flexDirection: "row",
      alignItems: isDesktop ? "center" : "flex-start",
      gap: isDesktop ? 14 : 10,
    },

    expenseInfo: {
      flex: 1,
      minWidth: 0,
    },

    expenseTopLine: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: 10,
    },

    expenseTitle: {
      flex: 1,
      fontSize: isDesktop ? 15 : 13,
      fontWeight: "700",
      color: colors.text,
      lineHeight: isDesktop ? 20 : 18,
    },

    categoryBadge: {
      backgroundColor: colors.primarySoft,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 999,
      paddingVertical: isDesktop ? 5 : 4,
      paddingHorizontal: isDesktop ? 10 : 8,
      maxWidth: isDesktop ? 130 : 96,
    },

    categoryBadgeText: {
      color: colors.primaryDark,
      fontSize: isDesktop ? 11 : 9,
      fontWeight: "800",
    },

    expensePaid: {
      color: colors.mutedText,
      textDecorationLine: "line-through",
    },

    categoryMetaStack: {
      alignItems: "flex-end",
      gap: 6,
      maxWidth: isDesktop ? 150 : 110,
    },

    expenseMeta: {
      fontSize: isDesktop ? 13 : 11,
      color: colors.mutedText,
      fontWeight: "600",
    },

    expenseMetaRow: {
      marginTop: 9,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 10,
    },

    paymentTypeBadge: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 999,
      paddingVertical: isDesktop ? 4 : 3,
      paddingHorizontal: isDesktop ? 9 : 7,
      backgroundColor: colors.surface,
    },

    categoryManagerCreateBox: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 18,
      padding: isDesktop ? 18 : 14,
      backgroundColor: colors.background,
      gap: 14,
      marginBottom: 16,
    },

    categoryManagerList: {
      gap: 10,
    },

    categoryManagerItem: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 18,
      padding: isDesktop ? 18 : 14,
      backgroundColor: colors.surface,
      gap: 12,
    },

    categoryManagerHeader: {
      flexDirection: isDesktop ? "row" : "column",
      alignItems: isDesktop ? "center" : "stretch",
      justifyContent: "space-between",
      gap: isDesktop ? 18 : 12,
    },

    categoryManagerTextBlock: {
      flex: 1,
      minWidth: 0,
      gap: 10,
    },

    categoryManagerSaveButton: {
      borderRadius: 999,
      backgroundColor: colors.primaryDark,
      paddingVertical: 7,
      paddingHorizontal: 12,
    },

    categoryManagerSaveText: {
      color: colors.white,
      fontSize: isDesktop ? 12 : 10,
      fontWeight: "900",
    },

    paymentTypeBadgeText: {
      color: colors.mutedText,
      fontSize: isDesktop ? 12 : 10,
      fontWeight: "800",
    },

    incomeMeta: {
      color: "#047857",
    },

    owedMeta: {
      color: colors.danger,
    },

    detailBox: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 14,
      backgroundColor: colors.background,
      marginBottom: 14,
      overflow: "hidden",
    },

    detailValueRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      gap: 12,
      paddingVertical: 11,
      paddingHorizontal: 12,
      borderBottomWidth: 1,
      borderBottomColor: colors.borderSoft,
    },

    detailValueLabel: {
      flex: 1,
      fontSize: isDesktop ? 12 : 11,
      color: colors.mutedText,
      fontWeight: "800",
    },

    detailValueText: {
      flex: 1.3,
      textAlign: "right",
      fontSize: isDesktop ? 13 : 12,
      color: colors.text,
      fontWeight: "900",
    },

    detailActionsGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
      marginBottom: 12,
    },

    detailActionButton: {
      flexGrow: 1,
      flexBasis: isDesktop ? "31%" : "47%",
      minHeight: 42,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.primarySoft,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 7,
      paddingVertical: 9,
      paddingHorizontal: 10,
    },

    detailActionButtonDark: {
      backgroundColor: colors.primaryDark,
      borderColor: colors.primaryDark,
    },

    detailActionButtonDanger: {
      backgroundColor: "#FEF2F2",
      borderColor: "#FECACA",
    },

    detailActionText: {
      fontSize: isDesktop ? 12 : 11,
      color: colors.primaryDark,
      fontWeight: "900",
      textAlign: "center",
    },

    detailActionTextDark: {
      color: colors.white,
    },

    detailActionTextDanger: {
      color: colors.danger,
    },

    rowActions: {
      flexDirection: "row",
      flexWrap: "wrap",
      justifyContent: "flex-end",
      gap: isDesktop ? 7 : 6,
      alignItems: "center",
      maxWidth: isDesktop ? 172 : 86,
    },

    moveTargetRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 7,
      marginTop: -4,
      marginBottom: 9,
      paddingHorizontal: 4,
    },

    moveTargetButton: {
      flexDirection: "row",
      alignItems: "center",
      gap: 5,
      backgroundColor: colors.primarySoft,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 999,
      paddingVertical: 6,
      paddingHorizontal: 10,
    },

    moveTargetText: {
      fontSize: isDesktop ? 12 : 10,
      fontWeight: "900",
      color: colors.primaryDark,
    },

    emptyMoveText: {
      fontSize: isDesktop ? 12 : 10,
      color: colors.mutedText,
      fontWeight: "700",
      marginTop: -2,
      marginBottom: 9,
      paddingHorizontal: 4,
    },

    iconAction: {
      width: isDesktop ? 36 : 34,
      height: isDesktop ? 36 : 34,
      borderRadius: 11,
      backgroundColor: colors.primarySoft,
      alignItems: "center",
      justifyContent: "center",
    },

    iconActionDark: {
      backgroundColor: colors.primaryDark,
    },

    iconActionDanger: {
      backgroundColor: "#FEF2F2",
    },

    calendarCard: {
      width: "100%",
      maxWidth: 420,
      backgroundColor: colors.surface,
      borderRadius: 18,
      padding: isDesktop ? 20 : 16,
      borderWidth: 1,
      borderColor: colors.border,
    },

    calendarHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 14,
    },

    calendarTitle: {
      fontSize: isDesktop ? 18 : 16,
      fontWeight: "900",
      color: colors.text,
    },

    weekRow: {
      flexDirection: "row",
      marginBottom: 8,
    },

    weekText: {
      flex: 1,
      textAlign: "center",
      fontSize: isDesktop ? 12 : 10,
      fontWeight: "900",
      color: colors.mutedText,
    },

    daysGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      marginBottom: 12,
    },

    dayButton: {
      width: "14.285%",
      aspectRatio: 1,
      alignItems: "center",
      justifyContent: "center",
    },

    dayButtonSelected: {
      backgroundColor: colors.primaryDark,
      borderRadius: 999,
    },

    dayButtonText: {
      width: isDesktop ? 34 : 30,
      height: isDesktop ? 34 : 30,
      borderRadius: 999,
      backgroundColor: colors.primarySoft,
      color: colors.primaryDark,
      fontSize: isDesktop ? 13 : 11,
      fontWeight: "900",
      textAlign: "center",
      textAlignVertical: "center",
      lineHeight: isDesktop ? 34 : 30,
    },

    dayButtonTextSelected: {
      backgroundColor: colors.primaryDark,
      color: colors.white,
    },
  });

