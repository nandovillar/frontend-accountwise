import { supabase } from "@/src/lib/supabase";
import { colors } from "@/src/theme/colors";
import { Header } from "@react-navigation/elements";
import { router } from "expo-router";
import { useEffect, useState } from "react";

import {
  Alert,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
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

export default function TabTwoScreen() {
  const getTodayDate = () => {
    const now = new Date();
    return now.toISOString().slice(0, 10);
  };

  const getCurrentMonth = () => {
    return getTodayDate().slice(0, 7);
  };

  const getDateFromMonthAndDay = (month: string, day: number | string) => {
    return `${month}-${String(day || 1).padStart(2, "0")}`;
  };

  const getDayFromDate = (date: string) => {
    return Number(date.slice(8, 10));
  };

  const getMonthFromDate = (date: string) => {
    return date.slice(0, 7);
  };

  const addMonths = (monthValue: string, offset: number) => {
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

  const [showAddFixed, setShowAddFixed] = useState(false);
  const [showAddVariable, setShowAddVariable] = useState(false);

  const [showFixedSection, setShowFixedSection] = useState(false);
  const [showVariableSection, setShowVariableSection] = useState(false);

  const [fixedSectionTitle, setFixedSectionTitle] = useState("Gastos fijos");
  const [variableSectionTitle, setVariableSectionTitle] =
    useState("Otros gastos");
  const [editingSectionTitle, setEditingSectionTitle] = useState<
    "fixed" | "variable" | null
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

  const openCalendar = (
    target: "fixedCreate" | "variableCreate" | "edit",
    currentDate: string,
  ) => {
    setCalendarTarget(target);
    setCalendarMonth(currentDate.slice(0, 7));
    setCalendarVisible(true);
  };

  const selectCalendarDate = (date: string) => {
    if (calendarTarget === "fixedCreate") {
      setFixedDate(date);
    }

    if (calendarTarget === "variableCreate") {
      setVariableDate(date);
    }

    if (calendarTarget === "edit") {
      setEditDate(date);
    }

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
          {
            text: "Cancelar",
            style: "cancel",
            onPress: () => resolve(false),
          },
          {
            text: "Continuar",
            onPress: () => resolve(true),
          },
        ],
      );
    });
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
        <View style={styles.modalOverlay}>
          <View style={styles.calendarCard}>
            <View style={styles.calendarHeader}>
              <Pressable
                style={styles.monthButton}
                onPress={() => changeCalendarMonth(-1)}
              >
                <Text style={styles.monthButtonText}>‹</Text>
              </Pressable>

              <Text style={styles.calendarTitle}>{calendarMonth}</Text>

              <Pressable
                style={styles.monthButton}
                onPress={() => changeCalendarMonth(1)}
              >
                <Text style={styles.monthButtonText}>›</Text>
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
              style={styles.cancelButton}
              onPress={() => setCalendarVisible(false)}
            >
              <Text style={styles.cancelButtonText}>Cancelar</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    );
  };

  const loadProfile = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;

    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    if (!data) {
      await supabase.from("profiles").insert({
        id: user.id,
        salary: 0,
      });

      setSalary(0);
      return;
    }

    setSalary(Number(data.salary));
  };

  const loadCategories = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;

    const { data, error } = await supabase
      .from("expense_categories")
      .select("name")
      .eq("user_id", user.id)
      .order("name", { ascending: true });

    if (error) {
      setCategories(defaultCategories);
      return;
    }

    if (!data || data.length === 0) {
      await supabase.from("expense_categories").insert(
        defaultCategories.map((name) => ({
          user_id: user.id,
          name,
        })),
      );

      setCategories(defaultCategories);
      return;
    }

    const loaded = data.map((item) => normalizeCategory(item.name));
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

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;

    const { error } = await supabase.from("expense_categories").insert({
      user_id: user.id,
      name: cleanName,
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

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;

    const todayDay = getDayFromDate(getTodayDate());

    await supabase
      .from("fixed_expenses")
      .update({ is_paid: true })
      .eq("user_id", user.id)
      .eq("month", selectedMonth)
      .eq("is_paid", false)
      .lte("day_of_month", todayDay);
  };

  const loadExpenses = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;

    const { data } = await supabase
      .from("transactions")
      .select("*")
      .eq("user_id", user.id)
      .eq("type", "expense")
      .eq("month", selectedMonth)
      .order("day_of_month", { ascending: true })
      .order("created_at", { ascending: true });

    setExpenses(data || []);
  };

  const loadFixedExpenses = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;

    await autoMarkDueFixedExpenses();

    const { data } = await supabase
      .from("fixed_expenses")
      .select("*")
      .eq("user_id", user.id)
      .eq("month", selectedMonth)
      .order("day_of_month", { ascending: true });

    setFixedExpenses(data || []);
  };

  const ensureTemplatesForMonth = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;

    const { data: currentTemplates } = await supabase
      .from("fixed_templates")
      .select("*")
      .eq("user_id", user.id)
      .eq("month", selectedMonth);

    if (Array.isArray(currentTemplates) && currentTemplates.length > 0) return;

    const prevMonth = addMonths(selectedMonth, -1);

    const { data: prevTemplates } = await supabase
      .from("fixed_templates")
      .select("*")
      .eq("user_id", user.id)
      .eq("month", prevMonth);

    if (!prevTemplates?.length) return;

    const toInsert = prevTemplates.map((item) => ({
      title: item.title,
      amount: item.amount,
      day_of_month: item.day_of_month,
      user_id: user.id,
      month: selectedMonth,
      category: normalizeCategory(item.category),
    }));

    await supabase.from("fixed_templates").insert(toInsert);
  };

  const generateFixedForMonth = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;

    await ensureTemplatesForMonth();

    const { data: templates } = await supabase
      .from("fixed_templates")
      .select("*")
      .eq("user_id", user.id)
      .eq("month", selectedMonth);

    if (!templates?.length) return;

    const { data: existing } = await supabase
      .from("fixed_expenses")
      .select("title")
      .eq("user_id", user.id)
      .eq("month", selectedMonth);

    const existingTitles = existing?.map((item) => item.title) || [];

    const toInsert = templates
      .filter((item) => !existingTitles.includes(item.title))
      .map((item) => ({
        title: item.title,
        amount: item.amount,
        day_of_month: item.day_of_month,
        user_id: user.id,
        month: selectedMonth,
        is_paid: false,
        category: normalizeCategory(item.category),
      }));

    if (toInsert.length > 0) {
      await supabase.from("fixed_expenses").insert(toInsert);
    }
  };

  const loadAll = async () => {
    await loadProfile();
    await loadCategories();
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

      await loadAll();
    };

    checkSession();

    const { data: subscription } = supabase.auth.onAuthStateChange(
      async (_, session) => {
        if (session?.user) {
          await loadAll();
        }
      },
    );

    return () => subscription.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const init = async () => {
      setFixedExpenses([]);
      setExpenses([]);

      await generateFixedForMonth();
      await loadFixedExpenses();
      await loadExpenses();
    };

    init();
  }, [selectedMonth]);

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

  const saveSalary = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;

    const value = Number(salaryInput);

    if (isNaN(value)) return;

    await supabase.from("profiles").upsert({
      id: user.id,
      salary: value,
    });

    await loadProfile();
    setEditingSalary(false);
  };

  const handleAddExpense = async () => {
    if (!title || !amount) return;

    const {
      data: { user },
    } = await supabase.auth.getUser();

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
      },
    ]);

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

    const {
      data: { user },
    } = await supabase.auth.getUser();

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
      },
    ]);

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

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        await supabase
          .from("fixed_templates")
          .update({
            amount: newAmount,
            month: newMonth,
            day_of_month: newDay,
            category: editCategory,
          })
          .eq("title", editingItem.title)
          .eq("user_id", user.id)
          .eq("month", editingItem.month || selectedMonth);
      }

      closeEditModal();
      await loadFixedExpenses();
      return;
    }

    if (editingType === "variable") {
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
    }
  };

  const togglePaid = async (item: any) => {
    await supabase
      .from("fixed_expenses")
      .update({ is_paid: !item.is_paid })
      .eq("id", item.id);

    await loadFixedExpenses();
  };

  const deleteFixed = async (item: any) => {
    const executeDelete = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return;

      await supabase.from("fixed_expenses").delete().eq("id", item.id);

      await supabase
        .from("fixed_templates")
        .delete()
        .eq("title", item.title)
        .eq("user_id", user.id)
        .eq("month", item.month || selectedMonth);

      await loadFixedExpenses();
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
  ) => {
    return (
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
  };

  const renderFilterSelector = (
    selected: string,
    onSelect: (category: string) => void,
  ) => {
    return (
      <View style={styles.categoryList}>
        {["Todas", ...categories].map((category) => (
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
  };

  const renderCategoryBadge = (category: string) => {
    return (
      <View style={styles.categoryBadge}>
        <Text style={styles.categoryBadgeText}>
          {normalizeCategory(category)}
        </Text>
      </View>
    );
  };

  const renderDateButton = (date: string, onPress: () => void) => {
    return (
      <Pressable style={styles.dateButton} onPress={onPress}>
        <Text style={styles.dateButtonText}>{date}</Text>
        <Text style={styles.dateButtonIcon}>📅</Text>
      </Pressable>
    );
  };

  const renderEditableTitle = (
    type: "fixed" | "variable",
    value: string,
    setValue: (value: string) => void,
  ) => {
    const isEditing = editingSectionTitle === type;

    if (isEditing) {
      return (
        <View style={styles.editTitleRow}>
          <TextInput
            style={styles.editTitleInput}
            value={value}
            onChangeText={setValue}
          />

          <Pressable
            style={styles.titleIconButton}
            onPress={() => setEditingSectionTitle(null)}
          >
            <Text style={styles.titleIconText}>✓</Text>
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
          <Text style={styles.titleIconTextSoft}>✏️</Text>
        </Pressable>
      </View>
    );
  };

  return (
    <View style={styles.screen}>
      <Header title="Gastos" />

      <Pressable
        style={styles.settingsButton}
        onPress={() => router.push("/settings")}
      >
        <Text style={styles.settingsButtonText}>☰</Text>
      </Pressable>

      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.content}>
          <View style={styles.monthBar}>
            <Pressable
              onPress={() => changeMonth(-1)}
              style={styles.monthButton}
            >
              <Text style={styles.monthButtonText}>‹</Text>
            </Pressable>

            <Text style={styles.monthText}>{selectedMonth}</Text>

            <Pressable
              onPress={() => changeMonth(1)}
              style={styles.monthButton}
            >
              <Text style={styles.monthButtonText}>›</Text>
            </Pressable>
          </View>

          <View style={styles.balanceCard}>
            <View>
              <Text style={styles.balanceLabel}>Balance mensual</Text>
              <Text style={styles.balanceSubText}>Disponible</Text>
            </View>

            <Text style={styles.balanceAmount}>{available} €</Text>
          </View>

          <View style={styles.summaryCard}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Sueldo</Text>

              {!editingSalary ? (
                <View style={styles.amountWithAction}>
                  <Text style={styles.summaryAmount}>{salary} €</Text>

                  <Pressable
                    style={styles.textAction}
                    onPress={() => {
                      setSalaryInput(String(salary));
                      setEditingSalary(true);
                    }}
                  >
                    <Text style={styles.textActionIcon}>✏️</Text>
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

                  <Pressable style={styles.textActionDark} onPress={saveSalary}>
                    <Text style={styles.textActionDarkIcon}>💾</Text>
                  </Pressable>
                </View>
              )}
            </View>

            <View style={styles.separator} />

            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Fijos pagados</Text>
              <Text style={styles.summaryAmount}>{fixedPaidTotal} €</Text>
            </View>

            <View style={styles.separator} />

            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>{variableSectionTitle}</Text>
              <Text style={styles.summaryAmount}>{totalExpenses} €</Text>
            </View>
          </View>

          <View style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <Pressable
                style={styles.sectionTitleButton}
                onPress={() => setShowFixedSection(!showFixedSection)}
              >
                <Text style={styles.sectionArrow}>
                  {showFixedSection ? "⌄" : "›"}
                </Text>

                <View>
                  {renderEditableTitle(
                    "fixed",
                    fixedSectionTitle,
                    setFixedSectionTitle,
                  )}

                  <Text style={styles.sectionSubtitle}>
                    {fixedExpenses.length} gastos · Total: {totalFixed} €
                  </Text>
                </View>
              </Pressable>

              <Pressable
                style={styles.addButton}
                onPress={() => {
                  setShowAddFixed(!showAddFixed);
                  setShowFixedSection(true);
                }}
              >
                <Text style={styles.addButtonText}>
                  {showAddFixed ? "Cerrar" : "+ Añadir"}
                </Text>
              </Pressable>
            </View>

            {showFixedSection && (
              <>
                <Text style={styles.filterTitle}>Filtrar por categoría</Text>
                {renderFilterSelector(
                  fixedFilterCategory,
                  setFixedFilterCategory,
                )}

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

                  return (
                    <View key={item.id} style={styles.expenseRow}>
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
                          {fullDate} · {item.amount} €
                        </Text>
                      </View>

                      <View style={styles.rowActions}>
                        <Pressable
                          style={styles.smallAction}
                          onPress={() => openEditFixed(item)}
                        >
                          <Text style={styles.smallActionIcon}>✏️</Text>
                        </Pressable>

                        <Pressable
                          style={[
                            styles.smallActionDark,
                            item.is_paid && styles.smallActionMuted,
                          ]}
                          onPress={() => togglePaid(item)}
                        >
                          <Text
                            style={[
                              styles.smallActionIconDark,
                              item.is_paid && styles.smallActionMutedText,
                            ]}
                          >
                            {item.is_paid ? "↺" : "✓"}
                          </Text>
                        </Pressable>

                        <Pressable
                          style={styles.deleteAction}
                          onPress={() => deleteFixed(item)}
                        >
                          <Text style={styles.deleteActionIcon}>🗑</Text>
                        </Pressable>
                      </View>
                    </View>
                  );
                })}
              </>
            )}
          </View>

          <View style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <Pressable
                style={styles.sectionTitleButton}
                onPress={() => setShowVariableSection(!showVariableSection)}
              >
                <Text style={styles.sectionArrow}>
                  {showVariableSection ? "⌄" : "›"}
                </Text>

                <View>
                  {renderEditableTitle(
                    "variable",
                    variableSectionTitle,
                    setVariableSectionTitle,
                  )}

                  <Text style={styles.sectionSubtitle}>
                    {expenses.length} gastos · Total: {totalExpenses} €
                  </Text>
                </View>
              </Pressable>

              <Pressable
                style={styles.addButton}
                onPress={() => {
                  setShowAddVariable(!showAddVariable);
                  setShowVariableSection(true);
                  setVariableDate(getTodayDate());
                }}
              >
                <Text style={styles.addButtonText}>
                  {showAddVariable ? "Cerrar" : "+ Añadir"}
                </Text>
              </Pressable>
            </View>

            {showVariableSection && (
              <>
                <Text style={styles.filterTitle}>Filtrar por categoría</Text>
                {renderFilterSelector(
                  variableFilterCategory,
                  setVariableFilterCategory,
                )}

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
                    {renderCategorySelector(
                      variableCategory,
                      setVariableCategory,
                    )}

                    <Pressable
                      style={styles.primaryButton}
                      onPress={handleAddExpense}
                    >
                      <Text style={styles.primaryButtonText}>
                        Guardar gasto
                      </Text>
                    </Pressable>
                  </View>
                )}

                {filteredVariableExpenses.map((item: any) => {
                  const currentCategory = normalizeCategory(item.category);
                  const fullDate = getDateFromMonthAndDay(
                    item.month || selectedMonth,
                    item.day_of_month || 1,
                  );

                  return (
                    <View key={item.id} style={styles.expenseRow}>
                      <View style={styles.expenseInfo}>
                        <View style={styles.expenseTopLine}>
                          <Text style={styles.expenseTitle} numberOfLines={1}>
                            {item.title}
                          </Text>

                          {renderCategoryBadge(currentCategory)}
                        </View>

                        <Text style={styles.expenseMeta}>
                          {fullDate} · {item.amount} €
                        </Text>
                      </View>

                      <View style={styles.rowActions}>
                        <Pressable
                          style={styles.smallAction}
                          onPress={() => openEditVariable(item)}
                        >
                          <Text style={styles.smallActionIcon}>✏️</Text>
                        </Pressable>

                        <Pressable
                          style={styles.deleteAction}
                          onPress={() => deleteVariable(item)}
                        >
                          <Text style={styles.deleteActionIcon}>🗑</Text>
                        </Pressable>
                      </View>
                    </View>
                  );
                })}
              </>
            )}
          </View>
        </View>
      </ScrollView>

      <Modal
        visible={!!editingItem}
        transparent
        animationType="fade"
        onRequestClose={closeEditModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.editModalCard}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>
                  {editingType === "fixed"
                    ? "Editar gasto fijo"
                    : "Editar gasto"}
                </Text>

                <Text style={styles.modalSubtitle}>{editingItem?.title}</Text>
              </View>

              <Pressable
                style={styles.modalCloseButton}
                onPress={closeEditModal}
              >
                <Text style={styles.modalCloseText}>×</Text>
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
                  <Text style={styles.dropdownArrow}>
                    {showEditCategoryDropdown ? "⌃" : "⌄"}
                  </Text>
                </Pressable>

                <Pressable
                  style={styles.addCategoryIconButton}
                  onPress={() =>
                    setShowAddCategoryInModal(!showAddCategoryInModal)
                  }
                >
                  <Text style={styles.addCategoryIconText}>+</Text>
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

            <View style={styles.modalActions}>
              <Pressable style={styles.cancelButton} onPress={closeEditModal}>
                <Text style={styles.cancelButtonText}>Cancelar</Text>
              </Pressable>

              <Pressable style={styles.saveButton} onPress={saveEdit}>
                <Text style={styles.saveButtonText}>Guardar</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {renderCalendar()}
    </View>
  );
}

const isWeb = Platform.OS === "web";

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },

  container: {
    flexGrow: 1,
    padding: isWeb ? 28 : 14,
    paddingBottom: 42,
    alignItems: "center",
  },

  content: {
    width: "100%",
    maxWidth: 940,
  },

  monthBar: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 8,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },

  monthButton: {
    width: isWeb ? 34 : 32,
    height: isWeb ? 34 : 32,
    borderRadius: 999,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },

  monthButtonText: {
    fontSize: isWeb ? 24 : 22,
    lineHeight: isWeb ? 26 : 24,
    color: colors.primaryDark,
    fontWeight: "900",
  },

  monthText: {
    fontSize: isWeb ? 16 : 14,
    fontWeight: "900",
    color: colors.text,
  },

  balanceCard: {
    backgroundColor: colors.primary,
    borderRadius: 16,
    padding: isWeb ? 18 : 15,
    marginBottom: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  balanceLabel: {
    fontSize: isWeb ? 15 : 13,
    fontWeight: "900",
    color: colors.white,
  },

  balanceSubText: {
    fontSize: isWeb ? 13 : 11,
    color: colors.white,
    opacity: 0.85,
    marginTop: 3,
  },

  balanceAmount: {
    fontSize: isWeb ? 28 : 24,
    fontWeight: "900",
    color: colors.white,
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
    paddingVertical: isWeb ? 13 : 11,
    paddingHorizontal: isWeb ? 16 : 13,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  summaryLabel: {
    fontSize: isWeb ? 14 : 12,
    color: colors.mutedText,
    fontWeight: "800",
  },

  summaryAmount: {
    fontSize: isWeb ? 17 : 15,
    fontWeight: "900",
    color: colors.text,
  },

  separator: {
    height: 1,
    backgroundColor: colors.borderSoft,
  },

  amountWithAction: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },

  textAction: {
    width: isWeb ? 30 : 28,
    height: isWeb ? 30 : 28,
    borderRadius: 8,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },

  textActionIcon: {
    fontSize: isWeb ? 12 : 10,
  },

  textActionDark: {
    width: isWeb ? 30 : 28,
    height: isWeb ? 30 : 28,
    borderRadius: 8,
    backgroundColor: colors.primaryDark,
    alignItems: "center",
    justifyContent: "center",
  },

  textActionDarkIcon: {
    fontSize: isWeb ? 12 : 10,
  },

  sectionCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: isWeb ? 16 : 13,
    marginBottom: 18,
  },

  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
    gap: 10,
  },

  sectionTitleButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },

  sectionArrow: {
    width: 18,
    fontSize: isWeb ? 18 : 16,
    fontWeight: "900",
    color: colors.primaryDark,
  },

  sectionTitle: {
    fontSize: isWeb ? 18 : 16,
    fontWeight: "900",
    color: colors.text,
  },

  sectionSubtitle: {
    fontSize: isWeb ? 13 : 11,
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
    fontSize: isWeb ? 15 : 13,
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

  titleIconText: {
    color: colors.white,
    fontWeight: "900",
    fontSize: 12,
  },

  titleIconButtonSoft: {
    width: 24,
    height: 24,
    borderRadius: 7,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },

  titleIconTextSoft: {
    fontSize: 10,
  },

  addButton: {
    backgroundColor: colors.primaryDark,
    paddingVertical: isWeb ? 8 : 7,
    paddingHorizontal: isWeb ? 12 : 10,
    borderRadius: 10,
  },

  addButtonText: {
    color: colors.white,
    fontSize: isWeb ? 13 : 11,
    fontWeight: "900",
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
    padding: isWeb ? 11 : 9,
    marginBottom: 8,
    fontSize: isWeb ? 14 : 12,
    color: colors.text,
  },

  inlineInput: {
    width: isWeb ? 76 : 62,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: isWeb ? 7 : 5,
    textAlign: "center",
    backgroundColor: colors.white,
    fontSize: isWeb ? 13 : 11,
    color: colors.text,
  },

  inputLabel: {
    fontSize: isWeb ? 13 : 11,
    fontWeight: "800",
    color: colors.mutedText,
    marginBottom: 5,
  },

  dateButton: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    padding: isWeb ? 11 : 9,
    marginBottom: 8,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  dateButtonText: {
    fontSize: isWeb ? 14 : 12,
    color: colors.text,
    fontWeight: "700",
  },

  dateButtonIcon: {
    fontSize: isWeb ? 14 : 12,
  },

  filterTitle: {
    fontSize: isWeb ? 12 : 10,
    fontWeight: "800",
    color: colors.mutedText,
    marginBottom: 8,
  },

  categoryTitle: {
    fontSize: isWeb ? 13 : 11,
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
    fontSize: isWeb ? 12 : 10,
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
    padding: isWeb ? 10 : 8,
    fontSize: isWeb ? 13 : 11,
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
    paddingVertical: isWeb ? 10 : 8,
    paddingHorizontal: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  dropdownButtonText: {
    fontSize: isWeb ? 13 : 11,
    fontWeight: "800",
    color: colors.text,
  },

  dropdownArrow: {
    fontSize: isWeb ? 15 : 13,
    fontWeight: "900",
    color: colors.primaryDark,
  },

  addCategoryIconButton: {
    width: isWeb ? 40 : 36,
    height: isWeb ? 40 : 36,
    borderRadius: 10,
    backgroundColor: colors.primaryDark,
    alignItems: "center",
    justifyContent: "center",
  },

  addCategoryIconText: {
    color: colors.white,
    fontSize: isWeb ? 20 : 17,
    fontWeight: "900",
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
    fontSize: isWeb ? 12 : 10,
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
    paddingVertical: isWeb ? 10 : 8,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSoft,
  },

  dropdownOptionActive: {
    backgroundColor: colors.primarySoft,
  },

  dropdownOptionText: {
    fontSize: isWeb ? 13 : 11,
    fontWeight: "700",
    color: colors.mutedText,
  },

  dropdownOptionTextActive: {
    color: colors.primaryDark,
    fontWeight: "900",
  },

  primaryButton: {
    backgroundColor: colors.primaryDark,
    padding: isWeb ? 12 : 10,
    borderRadius: 10,
    alignItems: "center",
  },

  primaryButtonText: {
    color: colors.white,
    fontWeight: "900",
    fontSize: isWeb ? 14 : 12,
  },

  expenseRow: {
    backgroundColor: "#F8FCFD",
    borderWidth: 1,
    borderColor: colors.borderSoft,
    borderRadius: 12,
    paddingVertical: isWeb ? 9 : 8,
    paddingHorizontal: isWeb ? 11 : 9,
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
    fontSize: isWeb ? 14 : 12,
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
    fontSize: isWeb ? 10 : 8,
    fontWeight: "800",
  },

  expensePaid: {
    color: colors.mutedText,
    textDecorationLine: "line-through",
  },

  expenseMeta: {
    fontSize: isWeb ? 12 : 10,
    color: colors.mutedText,
    marginTop: 3,
  },

  rowActions: {
    flexDirection: "row",
    gap: 4,
    alignItems: "center",
  },

  smallAction: {
    width: isWeb ? 28 : 26,
    height: isWeb ? 28 : 26,
    borderRadius: 7,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },

  smallActionIcon: {
    fontSize: isWeb ? 11 : 9,
  },

  smallActionDark: {
    width: isWeb ? 28 : 26,
    height: isWeb ? 28 : 26,
    borderRadius: 7,
    backgroundColor: colors.primaryDark,
    alignItems: "center",
    justifyContent: "center",
  },

  smallActionIconDark: {
    color: colors.white,
    fontSize: isWeb ? 12 : 10,
    fontWeight: "900",
  },

  smallActionMuted: {
    backgroundColor: colors.borderSoft,
  },

  smallActionMutedText: {
    color: colors.mutedText,
  },

  deleteAction: {
    width: isWeb ? 28 : 26,
    height: isWeb ? 28 : 26,
    borderRadius: 7,
    backgroundColor: "#FEF2F2",
    alignItems: "center",
    justifyContent: "center",
  },

  deleteActionIcon: {
    fontSize: isWeb ? 11 : 9,
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.55)",
    justifyContent: "center",
    alignItems: "center",
    padding: 18,
  },

  editModalCard: {
    width: "100%",
    maxWidth: 480,
    backgroundColor: colors.surface,
    borderRadius: 18,
    padding: isWeb ? 20 : 16,
    borderWidth: 1,
    borderColor: colors.border,
  },

  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
    marginBottom: 16,
  },

  modalTitle: {
    fontSize: isWeb ? 20 : 17,
    fontWeight: "900",
    color: colors.text,
  },

  modalSubtitle: {
    fontSize: isWeb ? 13 : 11,
    color: colors.mutedText,
    marginTop: 3,
  },

  modalCloseButton: {
    width: 30,
    height: 30,
    borderRadius: 999,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },

  modalCloseText: {
    fontSize: 20,
    fontWeight: "900",
    color: colors.primaryDark,
    lineHeight: 22,
  },

  modalActions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 8,
  },

  cancelButton: {
    flex: 1,
    backgroundColor: colors.primarySoft,
    padding: isWeb ? 12 : 10,
    borderRadius: 10,
    alignItems: "center",
  },

  cancelButtonText: {
    color: colors.primaryDark,
    fontWeight: "900",
    fontSize: isWeb ? 13 : 11,
  },

  saveButton: {
    flex: 1,
    backgroundColor: colors.primaryDark,
    padding: isWeb ? 12 : 10,
    borderRadius: 10,
    alignItems: "center",
  },

  saveButtonText: {
    color: colors.white,
    fontWeight: "900",
    fontSize: isWeb ? 13 : 11,
  },

  calendarCard: {
    width: "100%",
    maxWidth: 420,
    backgroundColor: colors.surface,
    borderRadius: 18,
    padding: isWeb ? 20 : 16,
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
    fontSize: isWeb ? 18 : 16,
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
    fontSize: isWeb ? 12 : 10,
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
    width: isWeb ? 34 : 30,
    height: isWeb ? 34 : 30,
    borderRadius: 999,
    backgroundColor: colors.primarySoft,
    color: colors.primaryDark,
    fontSize: isWeb ? 13 : 11,
    fontWeight: "900",
    textAlign: "center",
    textAlignVertical: "center",
    lineHeight: isWeb ? 34 : 30,
  },

  settingsButton: {
    position: "absolute",
    top: 24,
    right: 24,
    width: isWeb ? 42 : 38,
    height: isWeb ? 42 : 38,
    borderRadius: 999,
    backgroundColor: colors.white,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
    zIndex: 10,
  },

  settingsButtonText: {
    fontSize: isWeb ? 22 : 20,
    lineHeight: 24,
    color: colors.text,
    fontWeight: "900",
  },
});
