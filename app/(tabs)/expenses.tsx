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

import { SpaceSwitcher } from "@/src/components/SpaceSwitcher";
import { useSpaces } from "@/src/context/SpaceContext";
import { supabase } from "@/src/lib/supabase";
import { colors } from "@/src/theme/colors";
import { createCommonStyles } from "@/src/theme/commonStyles";
import {
  addMonths,
  getCurrentMonth,
  getDateFromMonthAndDay,
  getDayFromDate,
  getMonthFromDate,
  getTodayDate,
} from "@/src/utils/dates";
import { getCurrentUser } from "@/src/utils/auth";
import { formatCompactMoney } from "@/src/utils/money";
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
  "Otros",
  "Casa",
  "Comida",
  "Compras",
  "Ocio",
  "Salud",
  "Suscripciones",
  "Transporte",
];

type EditingType = "fixed" | "variable" | null;
type ExpenseSectionType = "fixed" | "variable";

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

export default function TabTwoScreen() {
  const { activeSpaceId, recordActivity, spaces } = useSpaces();
  const { width } = useWindowDimensions();
  const isDesktop = width >= 768;

  const commonStyles = useMemo(
    () => createCommonStyles(isDesktop),
    [isDesktop],
  );

  const styles = useMemo(() => createStyles(isDesktop), [isDesktop]);

  const normalizeCategory = (category?: string) => {
    if (!category || category === "General") return "Otros";
    return category;
  };

  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonth());

  const [salary, setSalary] = useState(0);
  const [salaryInput, setSalaryInput] = useState("");
  const [editingSalary, setEditingSalary] = useState(false);

  const [expenses, setExpenses] = useState<any[]>([]);
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

  const [categories, setCategories] = useState<string[]>([]);
  const [newCategory, setNewCategory] = useState("");

  const [fixedFilterCategory, setFixedFilterCategory] = useState("Todas");
  const [variableFilterCategory, setVariableFilterCategory] = useState("Todas");
  const [showFixedFilter, setShowFixedFilter] = useState(false);
  const [showVariableFilter, setShowVariableFilter] = useState(false);

  const [showAddFixed, setShowAddFixed] = useState(false);
  const [showAddVariable, setShowAddVariable] = useState(false);

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
  const [editAmount, setEditAmount] = useState("");
  const [editDate, setEditDate] = useState("");
  const [editCategory, setEditCategory] = useState("Otros");

  const [showEditCategoryDropdown, setShowEditCategoryDropdown] =
    useState(false);
  const [showAddCategoryInModal, setShowAddCategoryInModal] = useState(false);

  const [calendarVisible, setCalendarVisible] = useState(false);
  const [calendarTarget, setCalendarTarget] = useState<
    "fixedCreate" | "variableCreate" | "edit" | null
  >(null);
  const [calendarMonth, setCalendarMonth] = useState(getCurrentMonth());
  const [movingExpenseKey, setMovingExpenseKey] = useState<string | null>(null);

  const sortCategories = (items: string[]) => {
    const normalized = items.map(normalizeCategory);
    const unique = Array.from(new Set(normalized.filter(Boolean)));

    return [
      "Otros",
      ...unique
        .filter((item) => item !== "Otros")
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
    target: "fixedCreate" | "variableCreate" | "edit",
    currentDate: string,
  ) => {
    setCalendarTarget(target);
    setCalendarMonth(currentDate.slice(0, 7));
    setCalendarVisible(true);
  };

  const selectCalendarDate = (date: string) => {
    if (calendarTarget === "fixedCreate") setFixedDate(date);
    if (calendarTarget === "variableCreate") setVariableDate(date);
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

    if (activeSpaceId) {
      const { data } = await supabase
        .from("space_settings")
        .select("monthly_income")
        .eq("space_id", activeSpaceId)
        .maybeSingle();

      setSalary(Number(data?.monthly_income || 0));
      return;
    }

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
      .select("name")
      .order("name", { ascending: true });
    const { data, error } = await applySpaceFilter(
      categoriesQuery,
      user.id,
      activeSpaceId,
    );

    if (error) {
      setCategories(defaultCategories);
      return;
    }

    if (!data || data.length === 0) {
      await supabase
        .from("expense_categories")
        .insert(
          defaultCategories.map((name) => ({
            user_id: user.id,
            name,
            ...getSpacePayload(activeSpaceId),
          })),
        );

      setCategories(defaultCategories);
      return;
    }

    const loaded = data.map((item: { name: string }) =>
      normalizeCategory(item.name),
    );
    setCategories(sortCategories(loaded));
  };

  const createCategory = async () => {
    const cleanName = newCategory.trim();
    if (!cleanName) return;

    if (categories.includes(cleanName)) {
      setNewCategory("");
      setShowAddCategoryInModal(false);
      return;
    }

    const user = await getCurrentUser();

    if (!user) return;

    const { error } = await supabase.from("expense_categories").insert({
      user_id: user.id,
      name: cleanName,
      ...getSpacePayload(activeSpaceId),
    });

    if (error) {
      Alert.alert("Error", "No se pudo crear la categoría.");
      return;
    }

    setEditCategory(cleanName);
    setNewCategory("");
    setShowAddCategoryInModal(false);
    await loadCategories();
  };

  const autoMarkDueFixedExpenses = async () => {
    if (selectedMonth !== getCurrentMonth()) return;

    const user = await getCurrentUser();

    if (!user) return;

    const todayDay = getDayFromDate(getTodayDate());

    let dueQuery = supabase
      .from("fixed_expenses")
      .update({ is_paid: true })
      .eq("month", selectedMonth)
      .eq("is_paid", false)
      .lte("day_of_month", todayDay);
    await applySpaceFilter(dueQuery, user.id, activeSpaceId);
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
  };

  const loadFixedExpenses = async () => {
    const user = await getCurrentUser();

    if (!user) return;

    await autoMarkDueFixedExpenses();

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

    if (!prevTemplates?.length) return;

    const toInsert = prevTemplates.map((item: any) => ({
      title: item.title,
      amount: item.amount,
      day_of_month: item.day_of_month,
      user_id: user.id,
      month: selectedMonth,
      category: normalizeCategory(item.category),
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

    if (!templates?.length) return;

    const existingQuery = supabase
      .from("fixed_expenses")
      .select("title")
      .eq("month", selectedMonth);
    const { data: existing } = await applySpaceFilter(
      existingQuery,
      user.id,
      activeSpaceId,
    );

    const existingTitles =
      existing?.map((item: { title: string }) => item.title) || [];

    const toInsert = templates
      .filter((item: any) => !existingTitles.includes(item.title))
      .map((item: any) => ({
        title: item.title,
        amount: item.amount,
        day_of_month: item.day_of_month,
        user_id: user.id,
        month: selectedMonth,
        is_paid: false,
        category: normalizeCategory(item.category),
        ...getSpacePayload(activeSpaceId),
      }));

    if (toInsert.length > 0) {
      await supabase.from("fixed_expenses").insert(toInsert);
    }
  };

  const loadAll = async () => {
    await loadSectionTitles();
    await loadIncome();
    await loadCategories();
    await generateFixedForMonth();
    await loadFixedExpenses();
    await loadExpenses();
  };

  const loadAllRef = useRef(loadAll);
  const loadMonthDataRef = useRef(loadAll);

  loadAllRef.current = loadAll;
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

      await loadAllRef.current();
    };

    checkSession();

    const { data: subscription } = supabase.auth.onAuthStateChange(
      async (_, session) => {
        if (session?.user) await loadAllRef.current();
      },
    );

    return () => subscription.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    setSalary(0);
    setCategories([]);
    setFixedExpenses([]);
    setExpenses([]);
    setFixedFilterCategory("Todas");
    setVariableFilterCategory("Todas");
    loadAllRef.current();
  }, [activeSpaceId, selectedMonth]);

  useFocusEffect(
    useCallback(() => {
      loadAllRef.current();
    }, []),
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

    const value = Number(salaryInput);
    if (isNaN(value)) return;

    if (activeSpaceId) {
      await supabase.from("space_settings").upsert({
        space_id: activeSpaceId,
        monthly_income: value,
        updated_by: user.id,
        updated_at: new Date().toISOString(),
      });

      await recordActivity(
        "space_income_updated",
        "space_settings",
        activeSpaceId,
        "Se actualizo el ingreso mensual del espacio.",
      );
    } else {
      await supabase.from("profiles").upsert({ id: user.id, salary: value });
    }

    await loadIncome();
    setEditingSalary(false);
  };

  const handleAddExpense = async () => {
    if (!title || !amount) return;

    const user = await getCurrentUser();

    if (!user) return;

    const expenseMonth = getMonthFromDate(variableDate);
    const expenseDay = getDayFromDate(variableDate);

    await supabase.from("transactions").insert([
      {
        title,
        amount: Number(amount),
        type: "expense",
        user_id: user.id,
        created_at: new Date().toISOString(),
        month: expenseMonth,
        day_of_month: expenseDay,
        category: variableCategory,
        ...getSpacePayload(activeSpaceId),
      },
    ]);
    await recordActivity(
      "transaction_created",
      "transaction",
      null,
      `Se anadio el gasto ${title}.`,
    );

    setTitle("");
    setAmount("");
    setVariableDate(getTodayDate());
    setVariableCategory("Otros");
    setShowAddVariable(false);
    setShowVariableSection(true);
    await loadExpenses();
  };

  const handleAddFixedExpense = async () => {
    if (!fixedTitle || !fixedAmount || !fixedDate) return;

    const user = await getCurrentUser();

    if (!user) return;

    const expenseMonth = getMonthFromDate(fixedDate);
    const expenseDay = getDayFromDate(fixedDate);
    const shouldBePaid =
      expenseMonth === getCurrentMonth() &&
      expenseDay <= getDayFromDate(getTodayDate());

    await supabase.from("fixed_templates").insert([
      {
        title: fixedTitle,
        amount: Number(fixedAmount),
        day_of_month: expenseDay,
        user_id: user.id,
        month: expenseMonth,
        category: fixedCategory,
        ...getSpacePayload(activeSpaceId),
      },
    ]);

    await supabase.from("fixed_expenses").insert([
      {
        title: fixedTitle,
        amount: Number(fixedAmount),
        day_of_month: expenseDay,
        user_id: user.id,
        month: expenseMonth,
        is_paid: shouldBePaid,
        category: fixedCategory,
        ...getSpacePayload(activeSpaceId),
      },
    ]);
    await recordActivity(
      "fixed_expense_created",
      "fixed_expense",
      null,
      `Se anadio el gasto fijo ${fixedTitle}.`,
    );

    setFixedTitle("");
    setFixedAmount("");
    setFixedDate(getDateFromMonthAndDay(selectedMonth, 1));
    setFixedCategory("Otros");
    setShowAddFixed(false);
    setShowFixedSection(true);
    await loadFixedExpenses();
  };

  const openEditFixed = (item: any) => {
    setEditingType("fixed");
    setEditingItem(item);
    setEditAmount(String(item.amount));
    setEditDate(
      getDateFromMonthAndDay(item.month || selectedMonth, item.day_of_month),
    );
    setEditCategory(normalizeCategory(item.category));
    setShowEditCategoryDropdown(false);
    setShowAddCategoryInModal(false);
    setNewCategory("");
  };

  const openEditVariable = (item: any) => {
    setEditingType("variable");
    setEditingItem(item);
    setEditAmount(String(item.amount));
    setEditDate(
      getDateFromMonthAndDay(
        item.month || selectedMonth,
        item.day_of_month || 1,
      ),
    );
    setEditCategory(normalizeCategory(item.category));
    setShowEditCategoryDropdown(false);
    setShowAddCategoryInModal(false);
    setNewCategory("");
  };

  const closeEditModal = () => {
    setEditingType(null);
    setEditingItem(null);
    setEditAmount("");
    setEditDate("");
    setEditCategory("Otros");
    setShowEditCategoryDropdown(false);
    setShowAddCategoryInModal(false);
    setNewCategory("");
  };

  const saveEdit = async () => {
    if (!editingItem || !editingType) return;

    const newAmount = Number(editAmount);
    const newMonth = getMonthFromDate(editDate);
    const newDay = getDayFromDate(editDate);

    if (isNaN(newAmount)) {
      Alert.alert("Error", "El importe no es válido.");
      return;
    }

    if (editingType === "fixed") {
      const shouldBePaid =
        newMonth === getCurrentMonth() &&
        newDay <= getDayFromDate(getTodayDate());

      await supabase
        .from("fixed_expenses")
        .update({
          amount: newAmount,
          month: newMonth,
          day_of_month: newDay,
          category: editCategory,
          is_paid: shouldBePaid,
        })
        .eq("id", editingItem.id);

      const user = await getCurrentUser();

      if (user) {
        const templateUpdateQuery = supabase
          .from("fixed_templates")
          .update({
            amount: newAmount,
            month: newMonth,
            day_of_month: newDay,
            category: editCategory,
          })
          .eq("title", editingItem.title)
          .eq("month", editingItem.month || selectedMonth);

        await applySpaceFilter(templateUpdateQuery, user.id, activeSpaceId);
      }

      closeEditModal();
      await loadFixedExpenses();
      await recordActivity(
        "fixed_expense_updated",
        "fixed_expense",
        editingItem.id,
        `Se edito el gasto fijo ${editingItem.title}.`,
      );
      return;
    }

    await supabase
      .from("transactions")
      .update({
        amount: newAmount,
        month: newMonth,
        day_of_month: newDay,
        category: editCategory,
      })
      .eq("id", editingItem.id);

    closeEditModal();
    await loadExpenses();
    await recordActivity(
      "transaction_updated",
      "transaction",
      editingItem.id,
      `Se edito el gasto ${editingItem.title}.`,
    );
  };

  const togglePaid = async (item: any) => {
    await supabase
      .from("fixed_expenses")
      .update({ is_paid: !item.is_paid })
      .eq("id", item.id);

    await loadFixedExpenses();
    await recordActivity(
      "fixed_expense_toggled",
      "fixed_expense",
      item.id,
      `${item.title} se marco como ${item.is_paid ? "pendiente" : "pagado"}.`,
    );
  };

  const deleteFixed = async (item: any) => {
    const executeDelete = async () => {
      const user = await getCurrentUser();

      if (!user) return;

      await supabase.from("fixed_expenses").delete().eq("id", item.id);

      const templateDeleteQuery = supabase
        .from("fixed_templates")
        .delete()
        .eq("title", item.title)
        .eq("month", item.month || selectedMonth);
      await applySpaceFilter(templateDeleteQuery, user.id, activeSpaceId);

      await loadFixedExpenses();
      await recordActivity(
        "fixed_expense_deleted",
        "fixed_expense",
        item.id,
        `Se elimino el gasto fijo ${item.title}.`,
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
      await supabase.from("transactions").delete().eq("id", item.id);
      await loadExpenses();
      await recordActivity(
        "transaction_deleted",
        "transaction",
        item.id,
        `Se elimino el gasto ${item.title}.`,
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

      await supabase.from("fixed_templates").insert([
        {
          title: item.title,
          amount: Number(item.amount || 0),
          day_of_month: sourceDay,
          user_id: user.id,
          month: sourceMonth,
          category: normalizeCategory(item.category),
          space_id: targetSpaceId,
        },
      ]);

      await supabase.from("fixed_expenses").insert([
        {
          title: item.title,
          amount: Number(item.amount || 0),
          day_of_month: sourceDay,
          user_id: user.id,
          month: sourceMonth,
          is_paid: true,
          category: normalizeCategory(item.category),
          space_id: targetSpaceId,
        },
      ]);

      await supabase
        .from("fixed_expenses")
        .update({
          is_paid: true,
          is_transferred: true,
          transferred_to_space_id: targetSpaceId,
        })
        .eq("id", item.id);

      await recordActivity(
        "fixed_expense_transferred",
        "fixed_expense",
        item.id,
        `Se traspaso el gasto fijo ${item.title}.`,
      );
      await loadFixedExpenses();
    } else {
      await supabase.from("transactions").insert([
        {
          title: item.title,
          amount: Number(item.amount || 0),
          type: "expense",
          user_id: user.id,
          created_at: new Date().toISOString(),
          month: item.month || selectedMonth,
          day_of_month: item.day_of_month || 1,
          category: normalizeCategory(item.category),
          space_id: targetSpaceId,
        },
      ]);

      await supabase
        .from("transactions")
        .update({
          is_transferred: true,
          transferred_to_space_id: targetSpaceId,
        })
        .eq("id", item.id);

      await recordActivity(
        "transaction_transferred",
        "transaction",
        item.id,
        `Se traspaso el gasto ${item.title}.`,
      );
      await loadExpenses();
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
            onPress={() => copyExpenseToSpace(item, type, space.id)}
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

  const totalFixed = fixedExpenses.reduce(
    (sum, item) => sum + Number(item.amount),
    0,
  );
  const totalExpenses = expenses.reduce(
    (sum, item) => sum + Number(item.amount),
    0,
  );
  const fixedPaidTotal = fixedExpenses
    .filter((item) => item.is_paid)
    .reduce((sum, item) => sum + Number(item.amount), 0);

  const available = salary - fixedPaidTotal - totalExpenses;

  const filteredFixedExpenses =
    fixedFilterCategory === "Todas"
      ? fixedExpenses
      : fixedExpenses.filter(
          (item) => normalizeCategory(item.category) === fixedFilterCategory,
        );

  const filteredVariableExpenses =
    variableFilterCategory === "Todas"
      ? expenses
      : expenses.filter(
          (item) => normalizeCategory(item.category) === variableFilterCategory,
        );

  const renderCategorySelector = (
    selected: string,
    onSelect: (category: string) => void,
  ) => (
    <View style={styles.categoryList}>
      {categories.map((category) => (
        <Pressable
          key={category}
          style={[
            styles.categoryButton,
            selected === category && styles.categoryButtonActive,
          ]}
          onPress={() => onSelect(category)}
        >
          <Text
            style={[
              styles.categoryButtonText,
              selected === category && styles.categoryButtonTextActive,
            ]}
          >
            {category}
          </Text>
        </Pressable>
      ))}
    </View>
  );

  const renderFilterSelector = (
    selected: string,
    onSelect: (category: string) => void,
    isOpen: boolean,
    setIsOpen: (value: boolean) => void,
  ) => {
    const options = ["Todas", ...categories];

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
            {options.map((category) => (
              <Pressable
                key={category}
                style={[
                  styles.filterDropdownOption,
                  selected === category && styles.filterDropdownOptionActive,
                ]}
                onPress={() => {
                  onSelect(category);
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

  const renderCategoryBadge = (category: string) => (
    <View style={styles.categoryBadge}>
      <Text style={styles.categoryBadgeText}>
        {normalizeCategory(category)}
      </Text>
    </View>
  );

  const renderDateButton = (date: string, onPress: () => void) => (
    <Pressable style={styles.dateButton} onPress={onPress}>
      <Text style={styles.dateButtonText}>{date}</Text>
      <Ionicons name="calendar-outline" size={16} color={colors.primaryDark} />
    </Pressable>
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

              <Text style={styles.calendarTitle}>{calendarMonth}</Text>

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

                return (
                  <Pressable
                    key={date}
                    style={styles.dayButton}
                    onPress={() => selectCalendarDate(date)}
                  >
                    <Text style={styles.dayButtonText}>{day}</Text>
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
      <Header title="Gastos" />

      <Pressable
        style={commonStyles.settingsButton}
        onPress={() => router.push("/settings")}
      >
        <Text style={commonStyles.settingsButtonText}>☰</Text>
      </Pressable>

      <ScrollView
        contentContainerStyle={commonStyles.container}
        keyboardShouldPersistTaps="handled"
      >
        <View style={commonStyles.content}>
          <SpaceSwitcher />

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

            <Text style={styles.monthText}>{selectedMonth}</Text>

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
                <View style={styles.amountWithAction}>
                  <Text style={styles.summaryAmount}>
                    {formatCompactMoney(salary)}
                  </Text>
                  <Pressable
                    style={styles.iconButtonSoft}
                    onPress={() => {
                      setSalaryInput(String(salary));
                      setEditingSalary(true);
                    }}
                  >
                    <Ionicons
                      name="create-outline"
                      size={16}
                      color={colors.primaryDark}
                    />
                  </Pressable>
                </View>
              ) : (
                <View style={styles.amountWithAction}>
                  <TextInput
                    style={styles.inlineInput}
                    value={salaryInput}
                    keyboardType="numeric"
                    onChangeText={setSalaryInput}
                  />
                  <Pressable style={styles.iconButtonDark} onPress={saveIncome}>
                    <Ionicons
                      name="save-outline"
                      size={15}
                      color={colors.white}
                    />
                  </Pressable>
                </View>
              )}
            </View>

            <View style={styles.separator} />
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
              )
            }
            styles={styles}
          >
            {showAddFixed && (
              <View style={styles.formBox}>
                <TextInput
                  style={styles.input}
                  placeholder="Concepto"
                  value={fixedTitle}
                  onChangeText={setFixedTitle}
                />
                <TextInput
                  style={styles.input}
                  placeholder="Cantidad"
                  value={fixedAmount}
                  keyboardType="numeric"
                  onChangeText={setFixedAmount}
                />
                <Text style={styles.inputLabel}>Fecha</Text>
                {renderDateButton(fixedDate, () =>
                  openCalendar("fixedCreate", fixedDate),
                )}
                <Text style={styles.categoryTitle}>Categoría</Text>
                {renderCategorySelector(fixedCategory, setFixedCategory)}
                <Pressable
                  style={styles.primaryButton}
                  onPress={handleAddFixedExpense}
                >
                  <Text style={styles.primaryButtonText}>Guardar fijo</Text>
                </Pressable>
              </View>
            )}

            {filteredFixedExpenses.map((item: any) => {
              const currentCategory = normalizeCategory(item.category);
              const fullDate = getDateFromMonthAndDay(
                item.month || selectedMonth,
                item.day_of_month,
              );
              const moveKey = `fixed-${item.id}`;

              return (
                <View key={moveKey}>
                  <View style={styles.expenseRow}>
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

                    <Text style={styles.expenseMeta}>
                      {fullDate} · {formatCompactMoney(Number(item.amount || 0))}
                    </Text>
                    {item.is_transferred && (
                      <Text style={styles.expenseMeta}>Traspasado</Text>
                    )}
                  </View>

                  <View style={styles.rowActions}>
                    <IconAction
                      icon="create-outline"
                      onPress={() => openEditFixed(item)}
                      styles={styles}
                    />
                    <IconAction
                      icon={item.is_paid ? "refresh-outline" : "checkmark"}
                      dark={!item.is_paid}
                      onPress={() => togglePaid(item)}
                      styles={styles}
                    />
                    <IconAction
                      icon="swap-horizontal-outline"
                      onPress={() =>
                        setMovingExpenseKey(
                          movingExpenseKey === moveKey ? null : moveKey,
                        )
                      }
                      styles={styles}
                    />
                    <IconAction
                      icon="trash-outline"
                      danger
                      onPress={() => deleteFixed(item)}
                      styles={styles}
                    />
                  </View>
                  </View>
                  {renderMoveTargets(item, "fixed", moveKey)}
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
            count={expenses.length}
            total={formatCompactMoney(totalExpenses)}
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
              )
            }
            styles={styles}
          >
            {showAddVariable && (
              <View style={styles.formBox}>
                <TextInput
                  style={styles.input}
                  placeholder="Concepto"
                  value={title}
                  onChangeText={setTitle}
                />
                <TextInput
                  style={styles.input}
                  placeholder="Cantidad"
                  value={amount}
                  keyboardType="numeric"
                  onChangeText={setAmount}
                />
                <Text style={styles.inputLabel}>Fecha</Text>
                {renderDateButton(variableDate, () =>
                  openCalendar("variableCreate", variableDate),
                )}
                <Text style={styles.categoryTitle}>Categoría</Text>
                {renderCategorySelector(variableCategory, setVariableCategory)}
                <Pressable
                  style={styles.primaryButton}
                  onPress={handleAddExpense}
                >
                  <Text style={styles.primaryButtonText}>Guardar gasto</Text>
                </Pressable>
              </View>
            )}

            {filteredVariableExpenses.map((item: any) => {
              const currentCategory = normalizeCategory(item.category);
              const fullDate = getDateFromMonthAndDay(
                item.month || selectedMonth,
                item.day_of_month || 1,
              );
              const moveKey = `variable-${item.id}`;

              return (
                <View key={moveKey}>
                  <View style={styles.expenseRow}>
                  <View style={styles.expenseInfo}>
                    <View style={styles.expenseTopLine}>
                      <Text
                        style={[
                          styles.expenseTitle,
                          item.is_transferred && styles.expensePaid,
                        ]}
                        numberOfLines={1}
                      >
                        {item.title}
                      </Text>
                      {renderCategoryBadge(currentCategory)}
                    </View>

                    <Text style={styles.expenseMeta}>
                      {fullDate} · {formatCompactMoney(Number(item.amount || 0))}
                    </Text>
                  </View>

                  <View style={styles.rowActions}>
                    <IconAction
                      icon="create-outline"
                      onPress={() => openEditVariable(item)}
                      styles={styles}
                    />
                    <IconAction
                      icon="swap-horizontal-outline"
                      onPress={() =>
                        setMovingExpenseKey(
                          movingExpenseKey === moveKey ? null : moveKey,
                        )
                      }
                      styles={styles}
                    />
                    <IconAction
                      icon="trash-outline"
                      danger
                      onPress={() => deleteVariable(item)}
                      styles={styles}
                    />
                  </View>
                  </View>
                  {renderMoveTargets(item, "variable", moveKey)}
                </View>
              );
            })}
          </ExpenseSection>
        </View>
      </ScrollView>

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

            <Text style={styles.inputLabel}>Importe</Text>
            <TextInput
              style={styles.input}
              value={editAmount}
              keyboardType="numeric"
              onChangeText={setEditAmount}
            />

            <Text style={styles.inputLabel}>Fecha</Text>
            {renderDateButton(editDate, () => openCalendar("edit", editDate))}

            <Text style={styles.inputLabel}>Categoría</Text>

            <View style={styles.dropdownBox}>
              <View style={styles.dropdownTopRow}>
                <Pressable
                  style={styles.dropdownButton}
                  onPress={() =>
                    setShowEditCategoryDropdown(!showEditCategoryDropdown)
                  }
                >
                  <Text style={styles.dropdownButtonText}>{editCategory}</Text>
                  <Ionicons
                    name={
                      showEditCategoryDropdown ? "chevron-up" : "chevron-down"
                    }
                    size={16}
                    color={colors.primaryDark}
                  />
                </Pressable>

                <Pressable
                  style={styles.addCategoryIconButton}
                  onPress={() =>
                    setShowAddCategoryInModal(!showAddCategoryInModal)
                  }
                >
                  <Ionicons name="add" size={20} color={colors.white} />
                </Pressable>
              </View>

              {showAddCategoryInModal && (
                <View style={styles.addCategoryBox}>
                  <TextInput
                    style={styles.categoryInput}
                    placeholder="Nueva categoría"
                    value={newCategory}
                    onChangeText={setNewCategory}
                  />
                  <Pressable
                    style={styles.saveCategoryButton}
                    onPress={createCategory}
                  >
                    <Text style={styles.saveCategoryButtonText}>Crear</Text>
                  </Pressable>
                </View>
              )}

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

            <View style={commonStyles.modalActions}>
              <Pressable
                style={commonStyles.modalCancelButton}
                onPress={closeEditModal}
              >
                <Text style={commonStyles.modalCancelText}>Cancelar</Text>
              </Pressable>

              <Pressable
                style={commonStyles.modalSaveButton}
                onPress={saveEdit}
              >
                <Text style={commonStyles.modalSaveText}>Guardar</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

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

function IconAction({
  icon,
  dark,
  danger,
  onPress,
  styles,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  dark?: boolean;
  danger?: boolean;
  onPress: () => void;
  styles: ReturnType<typeof createStyles>;
}) {
  return (
    <Pressable
      style={[
        styles.iconAction,
        dark && styles.iconActionDark,
        danger && styles.iconActionDanger,
      ]}
      onPress={onPress}
    >
      <Ionicons
        name={icon}
        size={16}
        color={dark ? colors.white : danger ? "#B91C1C" : colors.primaryDark}
      />
    </Pressable>
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
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.border,
      padding: isDesktop ? 16 : 13,
      marginBottom: 16,
    },

    sectionHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      gap: 10,
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
      width: 36,
      height: 36,
      borderRadius: 11,
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
      fontSize: isDesktop ? 12 : 10,
      fontWeight: "800",
      color: colors.mutedText,
      marginTop: 12,
      marginBottom: 8,
    },

    filterDropdown: {
      marginBottom: 10,
    },

    filterDropdownButton: {
      backgroundColor: colors.white,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 10,
      paddingVertical: isDesktop ? 10 : 9,
      paddingHorizontal: 11,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 10,
    },

    filterDropdownText: {
      fontSize: Platform.OS === "web" ? 16 : isDesktop ? 13 : 12,
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

    filterDropdownOption: {
      paddingVertical: isDesktop ? 10 : 9,
      paddingHorizontal: 11,
      borderBottomWidth: 1,
      borderBottomColor: colors.borderSoft,
    },

    filterDropdownOptionActive: {
      backgroundColor: colors.primarySoft,
    },

    filterDropdownOptionText: {
      fontSize: Platform.OS === "web" ? 16 : isDesktop ? 13 : 12,
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

    dropdownTopRow: {
      flexDirection: "row",
      gap: 8,
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

    addCategoryIconButton: {
      width: isDesktop ? 40 : 36,
      height: isDesktop ? 40 : 36,
      borderRadius: 10,
      backgroundColor: colors.primaryDark,
      alignItems: "center",
      justifyContent: "center",
    },

    addCategoryBox: {
      marginTop: 8,
      flexDirection: "row",
      gap: 8,
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

    primaryButtonText: {
      color: colors.white,
      fontWeight: "900",
      fontSize: isDesktop ? 14 : 12,
    },

    expenseRow: {
      backgroundColor: "#F8FCFD",
      borderWidth: 1,
      borderColor: colors.borderSoft,
      borderRadius: 12,
      paddingVertical: isDesktop ? 9 : 8,
      paddingHorizontal: isDesktop ? 11 : 9,
      marginBottom: 9,
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },

    expenseInfo: {
      flex: 1,
      minWidth: 0,
    },

    expenseTopLine: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },

    expenseTitle: {
      flex: 1,
      fontSize: isDesktop ? 14 : 12,
      fontWeight: "500",
      color: colors.text,
    },

    categoryBadge: {
      backgroundColor: colors.primarySoft,
      borderRadius: 999,
      paddingVertical: 3,
      paddingHorizontal: 7,
      maxWidth: 110,
    },

    categoryBadgeText: {
      color: colors.primaryDark,
      fontSize: isDesktop ? 10 : 8,
      fontWeight: "800",
    },

    expensePaid: {
      color: colors.mutedText,
      textDecorationLine: "line-through",
    },

    expenseMeta: {
      fontSize: isDesktop ? 12 : 10,
      color: colors.mutedText,
      marginTop: 3,
    },

    rowActions: {
      flexDirection: "row",
      gap: 4,
      alignItems: "center",
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
      width: isDesktop ? 30 : 28,
      height: isDesktop ? 30 : 28,
      borderRadius: 8,
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
  });

