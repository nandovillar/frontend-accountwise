import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { Header } from "@react-navigation/elements";
import { router } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { ActionNotice } from "@/src/components/ActionNotice";
import { AppTextInput } from "@/src/components/AppTextInput";
import { DataState } from "@/src/components/DataState";
import { EmptyState } from "@/src/components/EmptyState";
import { KpiCard } from "@/src/components/KpiCard";
import { ResultRow } from "@/src/components/ResultRow";
import { SpaceMenuButton } from "@/src/components/SpaceSwitcher";
import { useSpaces } from "@/src/context/SpaceContext";
import { useAppTheme } from "@/src/context/ThemeContext";
import { supabase } from "@/src/lib/supabase";
import { colors } from "@/src/theme/colors";
import { createCommonStyles } from "@/src/theme/commonStyles";
import { getCurrentUser } from "@/src/utils/auth";
import { formatDateText, getNextYearDate, getTodayDate } from "@/src/utils/dates";
import {
  formatCompactMoney,
  formatMoney,
  parseMoneyInput,
} from "@/src/utils/money";
import { applySpaceFilter, getSpacePayload } from "@/src/utils/spaceQueries";
import HomePurchaseScreen from "../HomePurchase";

import {
  Alert,
  Linking,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";

type SavingItem = {
  id: string;
  user_id: string;
  name: string;
  goal: number;
  start_date: string;
  end_date: string;
  monthly_amount: number;
  contributed: number;
  withdrawn_amount?: number;
  borrowed?: string;
  created_at?: string;
};

const defaultIpremAnnual = 8400;
const officialIpremUrl =
  "https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2025/guia-principales-novedades/otras-cuestiones-interes.html";

const getIpremStorageKey = (userId: string) => `accountwise_iprem_${userId}`;

const withLoadTimeout = async (task: Promise<void>) => {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(
      () => reject(new Error("La carga está tardando demasiado.")),
      15000,
    );
  });

  try {
    await Promise.race([task, timeout]);
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
};

export default function SavingsScreen() {
  const { activeSpaceId, recordActivity } = useSpaces();
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

  const [savings, setSavings] = useState<SavingItem[]>([]);
  const [selectedSaving, setSelectedSaving] = useState<SavingItem | null>(null);
  const [movementSaving, setMovementSaving] = useState<SavingItem | null>(null);
  const [actionMessage, setActionMessage] = useState("");
  const [dataError, setDataError] = useState("");
  const [hasLoadedData, setHasLoadedData] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [showSavingsList, setShowSavingsList] = useState(false);
  const [showIpremCalculator, setShowIpremCalculator] = useState(false);
  const [showHomeSimulator, setShowHomeSimulator] = useState(false);
  const loadInProgressRef = useRef(false);

  const [formVisible, setFormVisible] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [goal, setGoal] = useState("");
  const [monthly, setMonthly] = useState("");
  const [contributed, setContributed] = useState("");
  const [borrowed, setBorrowed] = useState("");
  const [movementAmount, setMovementAmount] = useState("");
  const [isMovingSavingMoney, setIsMovingSavingMoney] = useState(false);
  const [ipremAnnual, setIpremAnnual] = useState(String(defaultIpremAnnual));
  const [userGeneralBase, setUserGeneralBase] = useState("");
  const [userSavingsBase, setUserSavingsBase] = useState("");
  const [partnerGeneralBase, setPartnerGeneralBase] = useState("");
  const [partnerSavingsBase, setPartnerSavingsBase] = useState("");
  const [ipremSavedMessage, setIpremSavedMessage] = useState("");

  const [startDate, setStartDate] = useState(getTodayDate());
  const [endDate, setEndDate] = useState(getNextYearDate());

  const showActionMessage = (message: string) => {
    setActionMessage(message);
    setTimeout(() => setActionMessage(""), 2600);
  };

  const loadIpremDraft = useCallback(async (userId: string) => {
    const stored = await AsyncStorage.getItem(getIpremStorageKey(userId));

    if (!stored) {
      return;
    }

    try {
      const parsed = JSON.parse(stored) as {
        ipremAnnual?: string;
        userGeneralBase?: string;
        userSavingsBase?: string;
        partnerGeneralBase?: string;
        partnerSavingsBase?: string;
      };

      setIpremAnnual(parsed.ipremAnnual || String(defaultIpremAnnual));
      setUserGeneralBase(parsed.userGeneralBase || "");
      setUserSavingsBase(parsed.userSavingsBase || "");
      setPartnerGeneralBase(parsed.partnerGeneralBase || "");
      setPartnerSavingsBase(parsed.partnerSavingsBase || "");
    } catch {
      await AsyncStorage.removeItem(getIpremStorageKey(userId));
    }
  }, []);

  const saveIpremDraft = useCallback(async (showMessage = false) => {
    const user = await getCurrentUser();

    if (!user) return;

    await AsyncStorage.setItem(
      getIpremStorageKey(user.id),
      JSON.stringify({
        ipremAnnual,
        userGeneralBase,
        userSavingsBase,
        partnerGeneralBase,
        partnerSavingsBase,
      }),
    );

    if (showMessage) {
      setIpremSavedMessage("IPREM guardado correctamente.");
      setTimeout(() => setIpremSavedMessage(""), 2600);
    }
  }, [
    ipremAnnual,
    userGeneralBase,
    userSavingsBase,
    partnerGeneralBase,
    partnerSavingsBase,
  ]);

  const calculateSaving = (
    startDateValue: string,
    endDateValue: string,
    monthlyValue: number,
    contributedValue: number,
    goalValue: number,
    withdrawnValue = 0,
  ) => {
    const now = new Date();
    const start = new Date(startDateValue);
    const end = new Date(endDateValue);

    const totalMonths = Math.max(
      0,
      (end.getFullYear() - start.getFullYear()) * 12 +
        (end.getMonth() - start.getMonth()),
    );

    const rawPassed =
      (now.getFullYear() - start.getFullYear()) * 12 +
      (now.getMonth() - start.getMonth());

    const passedMonths =
      now < start ? 0 : Math.min(totalMonths, Math.max(0, rawPassed));

    const remainingMonths = Math.max(0, totalMonths - passedMonths);
    const grossSaved = contributedValue + passedMonths * monthlyValue;
    const currentSaved = Math.max(0, grossSaved - withdrawnValue);
    const pending = Math.max(0, goalValue - currentSaved);
    const forecastSaved = Math.max(
      0,
      contributedValue + totalMonths * monthlyValue - withdrawnValue,
    );
    const completed = currentSaved >= goalValue && goalValue > 0;

    const neededMonthly =
      remainingMonths > 0 ? Math.max(0, pending / remainingMonths) : 0;

    const progress =
      goalValue > 0 ? Math.min(100, (currentSaved / goalValue) * 100) : 0;

    return {
      totalMonths,
      passedMonths,
      remainingMonths,
      currentSaved,
      withdrawn: withdrawnValue,
      pending,
      forecastSaved,
      completed,
      neededMonthly,
      progress,
    };
  };

  const loadSavings = useCallback(async () => {
    if (loadInProgressRef.current) return;

    loadInProgressRef.current = true;
    setIsLoadingData(true);
    setDataError("");

    const user = await getCurrentUser();

    if (!user) {
      setHasLoadedData(true);
      setIsLoadingData(false);
      loadInProgressRef.current = false;
      return;
    }

    const savingsQuery = supabase
      .from("savings")
      .select("*")
      .order("created_at", { ascending: false });
    const { data, error } = await applySpaceFilter(
      savingsQuery,
      user.id,
      activeSpaceId,
    );

    if (error) {
      setDataError("No se pudieron cargar los ahorros.");
      setHasLoadedData(true);
      setIsLoadingData(false);
      loadInProgressRef.current = false;
      return;
    }

    setSavings(data || []);
    setHasLoadedData(true);
    setIsLoadingData(false);
    loadInProgressRef.current = false;
  }, [activeSpaceId]);

  const refreshSavings = useCallback(async () => {
    try {
      await withLoadTimeout(loadSavings());
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "No se pudieron cargar los ahorros.";
      setDataError(message);
      setHasLoadedData(true);
      setIsLoadingData(false);
      loadInProgressRef.current = false;
    }
  }, [loadSavings]);

  const forceRefreshSavings = useCallback(async () => {
    loadInProgressRef.current = false;
    await refreshSavings();
  }, [refreshSavings]);

  const retrySavings = useCallback(() => {
    forceRefreshSavings();
  }, [forceRefreshSavings]);

  const openOfficialIprem = async () => {
    const canOpen = await Linking.canOpenURL(officialIpremUrl);

    if (canOpen) {
      await Linking.openURL(officialIpremUrl);
    }
  };

  const resetForm = () => {
    setEditingId(null);
    setName("");
    setGoal("");
    setMonthly("");
    setContributed("");
    setBorrowed("");
    setStartDate(getTodayDate());
    setEndDate(getNextYearDate());
  };

  const openCreateForm = () => {
    resetForm();
    setFormVisible(true);
  };

  const openEditForm = (item: SavingItem) => {
    setEditingId(item.id);
    setName(item.name);
    setGoal(String(item.goal ?? 0));
    setMonthly(String(item.monthly_amount ?? 0));
    setContributed(String(item.contributed ?? 0));
    setBorrowed(item.borrowed || "");
    setStartDate(item.start_date || getTodayDate());
    setEndDate(item.end_date || getNextYearDate());
    setSelectedSaving(null);
    setFormVisible(true);
  };

  const openSavingDetail = (item: SavingItem) => {
    setMovementAmount("");
    setSelectedSaving(item);
  };

  const closeSavingDetail = () => {
    setSelectedSaving(null);
  };

  const openMovementForm = (item: SavingItem) => {
    setMovementAmount("");
    setMovementSaving(item);
  };

  const closeMovementForm = () => {
    setMovementAmount("");
    setMovementSaving(null);
  };

  const closeForm = () => {
    resetForm();
    setFormVisible(false);
  };

  const saveSaving = async () => {
    const user = await getCurrentUser();

    if (!user) return;

    if (!name.trim()) {
      Alert.alert("Falta el nombre", "Pon un nombre para el objetivo.");
      return;
    }

    const goalAmount = parseMoneyInput(goal);
    const monthlyAmount = parseMoneyInput(monthly);
    const contributedAmount = parseMoneyInput(contributed);

    if (goalAmount <= 0) {
      Alert.alert("Importe no válido", "El objetivo debe ser mayor que 0.");
      return;
    }

    const payload = {
      user_id: user.id,
      name: name.trim() || "Ahorro sin nombre",
      goal: goalAmount,
      start_date: startDate,
      end_date: endDate,
      monthly_amount: monthlyAmount,
      contributed: contributedAmount,
      borrowed: borrowed.trim(),
      ...getSpacePayload(activeSpaceId),
    };

    if (editingId) {
      const { error } = await supabase
        .from("savings")
        .update(payload)
        .eq("id", editingId)
        .eq("user_id", user.id);

      if (error) {
        Alert.alert("Error", "No se pudo actualizar el ahorro.");
        return;
      }

      await recordActivity(
        "saving_updated",
        "saving",
        editingId,
        `Se actualizó el ahorro ${payload.name}.`,
      );
    } else {
      const { error } = await supabase.from("savings").insert([
        {
          ...payload,
          withdrawn_amount: 0,
        },
      ]);

      if (error) {
        Alert.alert("Error", "No se pudo guardar el ahorro.");
        return;
      }

      await recordActivity(
        "saving_created",
        "saving",
        null,
        `Se creó el ahorro ${payload.name}.`,
      );
    }

    await forceRefreshSavings();
    closeForm();
    showActionMessage(editingId ? "Ahorro actualizado." : "Ahorro creado.");
  };

  const getPersonalIncome = async (userId: string) => {
    const { data, error } = await supabase
      .from("profiles")
      .select("salary")
      .eq("id", userId)
      .maybeSingle();

    if (error) throw error;

    if (!data) {
      await supabase.from("profiles").insert({ id: userId, salary: 0 });
      return 0;
    }

    return Number(data.salary || 0);
  };

  const updatePersonalIncome = async (userId: string, value: number) => {
    const { error } = await supabase.from("profiles").upsert({
      id: userId,
      salary: Math.max(0, value),
    });

    if (error) throw error;
  };

  const moveSavingMoney = async (direction: "withdraw" | "return") => {
    if (!movementSaving || isMovingSavingMoney) return;

    const user = await getCurrentUser();

    if (!user) return;

    const amount = parseMoneyInput(movementAmount);

    if (!amount || amount <= 0) {
      Alert.alert("Importe no válido", "Introduce un importe mayor que 0.");
      return;
    }

    const result = calculateSaving(
      movementSaving.start_date,
      movementSaving.end_date,
      Number(movementSaving.monthly_amount || 0),
      Number(movementSaving.contributed || 0),
      Number(movementSaving.goal || 0),
      Number(movementSaving.withdrawn_amount || 0),
    );
    const currentWithdrawn = Number(movementSaving.withdrawn_amount || 0);

    if (direction === "withdraw" && amount > result.currentSaved) {
      Alert.alert(
        "Importe demasiado alto",
        "No puedes retirar más dinero del que hay disponible en este ahorro.",
      );
      return;
    }

    if (direction === "return" && amount > currentWithdrawn) {
      Alert.alert(
        "Importe demasiado alto",
        "No puedes devolver más dinero del que habías retirado.",
      );
      return;
    }

    setIsMovingSavingMoney(true);

    try {
      const currentIncome = await getPersonalIncome(user.id);
      const nextIncome =
        direction === "withdraw" ? currentIncome + amount : currentIncome - amount;

      if (direction === "return" && nextIncome < 0) {
        Alert.alert(
          "No hay suficiente dinero",
          "Tu cuenta personal no tiene ese importe disponible para devolverlo al ahorro.",
        );
        return;
      }

      const nextWithdrawn =
        direction === "withdraw"
          ? currentWithdrawn + amount
          : Math.max(0, currentWithdrawn - amount);

      const { error } = await supabase
        .from("savings")
        .update({ withdrawn_amount: nextWithdrawn })
        .eq("id", movementSaving.id)
        .eq("user_id", user.id);

      if (error) throw error;

      await updatePersonalIncome(user.id, nextIncome);

      const updatedSaving = {
        ...movementSaving,
        withdrawn_amount: nextWithdrawn,
      };

      setMovementSaving(updatedSaving);
      setSelectedSaving((current) =>
        current?.id === updatedSaving.id ? updatedSaving : current,
      );
      setSavings((current) =>
        current.map((item) =>
          item.id === updatedSaving.id ? updatedSaving : item,
        ),
      );
      setMovementAmount("");

      await forceRefreshSavings();
      await recordActivity(
        direction === "withdraw"
          ? "saving_money_withdrawn"
          : "saving_money_returned",
        "saving",
        movementSaving.id,
        direction === "withdraw"
          ? `Se retiraron ${amount} euros del ahorro ${movementSaving.name}.`
          : `Se devolvieron ${amount} euros al ahorro ${movementSaving.name}.`,
      );

      showActionMessage(
        direction === "withdraw"
          ? "Dinero retirado a tu cuenta personal."
          : "Dinero devuelto al ahorro.",
      );
    } catch {
      Alert.alert(
        "Error",
        "No se pudo completar el movimiento. Revisa que la base de datos tenga la columna withdrawn_amount.",
      );
    } finally {
      setIsMovingSavingMoney(false);
    }
  };

  const deleteSaving = async (item: SavingItem) => {
    const user = await getCurrentUser();

    if (!user) return;

    const executeDelete = async () => {
      const { error } = await supabase
        .from("savings")
        .delete()
        .eq("id", item.id)
        .eq("user_id", user.id);

      if (error) {
        Alert.alert("Error", "No se pudo eliminar el ahorro.");
        return;
      }

      if (selectedSaving?.id === item.id) {
        setSelectedSaving(null);
      }

      await forceRefreshSavings();
      showActionMessage("Ahorro eliminado.");
      await recordActivity(
        "saving_deleted",
        "saving",
        item.id,
        `Se eliminó el ahorro ${item.name}.`,
      );
    };

    if (Platform.OS === "web") {
      const confirmed = window.confirm(`¿Eliminar "${item.name}"?`);

      if (confirmed) {
        await executeDelete();
      }

      return;
    }

    Alert.alert("Eliminar ahorro", `¿Eliminar "${item.name}"?`, [
      { text: "Cancelar", style: "cancel" },
      { text: "Eliminar", style: "destructive", onPress: executeDelete },
    ]);
  };

  const getTotals = () => {
    return savings.reduce(
      (acc, item) => {
        const result = calculateSaving(
          item.start_date,
          item.end_date,
          Number(item.monthly_amount || 0),
          Number(item.contributed || 0),
          Number(item.goal || 0),
          Number(item.withdrawn_amount || 0),
        );

        return {
          goals: acc.goals + Number(item.goal || 0),
          saved: acc.saved + result.currentSaved,
          withdrawn: acc.withdrawn + Number(item.withdrawn_amount || 0),
          pending: acc.pending + result.pending,
        };
      },
      {
        goals: 0,
        saved: 0,
        withdrawn: 0,
        pending: 0,
      },
    );
  };

  useEffect(() => {
    const init = async () => {
      const user = await getCurrentUser();

      if (!user) {
        router.replace("/login");
        return;
      }

      await loadIpremDraft(user.id);
      await forceRefreshSavings();
    };

    init();

    const { data: subscription } = supabase.auth.onAuthStateChange(
      async (_, session) => {
        if (session?.user) {
          await loadIpremDraft(session.user.id);
          await forceRefreshSavings();
        }
      },
    );

    return () => subscription.subscription.unsubscribe();
  }, [forceRefreshSavings, loadIpremDraft]);

  useFocusEffect(
    useCallback(() => {
      forceRefreshSavings();
    }, [forceRefreshSavings]),
  );

  const totals = getTotals();
  const hasVisibleSavingsData = savings.length > 0;
  const ipremBase = parseMoneyInput(ipremAnnual) || defaultIpremAnnual;
  const userIpremIncome =
    parseMoneyInput(userGeneralBase) + parseMoneyInput(userSavingsBase);
  const partnerIpremIncome =
    parseMoneyInput(partnerGeneralBase) + parseMoneyInput(partnerSavingsBase);
  const householdIpremIncome = userIpremIncome + partnerIpremIncome;
  const hasIpremIncome = householdIpremIncome > 0;
  const vppbLimit = ipremBase * 5.5;
  const vpplLimit = ipremBase * 7.5;
  const vppbEligible = hasIpremIncome && householdIpremIncome <= vppbLimit;
  const vpplEligible = hasIpremIncome && householdIpremIncome <= vpplLimit;

  const currentFormResult = calculateSaving(
    startDate,
    endDate,
    parseMoneyInput(monthly),
    parseMoneyInput(contributed),
    parseMoneyInput(goal),
  );

  return (
    <View style={commonStyles.screen}>
      <Header
        title="Planes"
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
            loading={isLoadingData && !hasLoadedData && !hasVisibleSavingsData}
            error={dataError}
            autoRetryMs={2000}
            onRetry={retrySavings}
          />
          <ActionNotice message={actionMessage} />

          <View style={styles.heroCard}>
            <View style={styles.heroTextBlock}>
              <Text style={styles.heroLabel}>Ahorros</Text>

              <Text
                style={styles.heroAmount}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.6}
              >
                {formatCompactMoney(totals.saved)}
              </Text>

              <Text style={styles.heroSubtitle}>
                Ahorrado actualmente entre todos tus objetivos
              </Text>
            </View>

            <View style={styles.heroIcon}>
              <Ionicons name="wallet-outline" size={28} color={colors.white} />
            </View>
          </View>

          <View style={styles.kpiGrid}>
            <KpiCard
              label="Objetivos"
              value={formatCompactMoney(totals.goals)}
              styles={styles}
            />

            <KpiCard
              label="Pendiente"
              value={formatCompactMoney(totals.pending)}
              styles={styles}
            />

            <KpiCard
              label="Recogido"
              value={formatCompactMoney(totals.withdrawn)}
              styles={styles}
            />
          </View>

          <Pressable
            style={[commonStyles.card, styles.toolCard]}
            onPress={() => setShowSavingsList(true)}
          >
            <View style={styles.toolCardIcon}>
              <Ionicons
                name="flag-outline"
                size={20}
                color={colors.primaryDark}
              />
            </View>
            <View style={styles.cardHeaderText}>
              <Text style={commonStyles.smallText}>Ahorro</Text>
              <Text style={commonStyles.cardTitle}>Mis objetivos</Text>
              <Text style={styles.collapsedHint}>
                {savings.length} objetivo{savings.length === 1 ? "" : "s"} guardado{savings.length === 1 ? "" : "s"}
              </Text>
            </View>
            <Ionicons
              name="chevron-forward"
              size={18}
              color={colors.primaryDark}
            />
          </Pressable>

          {false && (
          <View style={commonStyles.card}>
            <Pressable
              style={styles.cardHeader}
              onPress={() => setShowSavingsList(true)}
            >
              <View style={styles.cardHeaderText}>
                <Text style={commonStyles.smallText}>Ahorro</Text>
                <Text style={commonStyles.cardTitle}>Mis objetivos</Text>
                <Text style={styles.collapsedHint}>
                  {showSavingsList
                    ? "Objetivos abiertos"
                    : `${savings.length} objetivo${savings.length === 1 ? "" : "s"} guardado${savings.length === 1 ? "" : "s"}`}
                </Text>
              </View>

              <View style={styles.headerActions}>
                <Pressable
                  style={styles.addButton}
                  onPress={(event) => {
                    event.stopPropagation();
                    openCreateForm();
                  }}
                >
                  <Ionicons name="add" size={21} color={colors.white} />
                </Pressable>

                <View style={styles.expandButton}>
                  <Ionicons
                    name="chevron-forward"
                    size={19}
                    color={colors.primaryDark}
                  />
                </View>
              </View>
            </Pressable>

            {!showSavingsList ? null : savings.length === 0 ? (
              <EmptyState
                title="No tienes ahorros todavía"
                text="Crea tu primer objetivo para ver el resumen y el progreso."
                actionLabel="Crear objetivo"
                icon="wallet-outline"
                onAction={openCreateForm}
              />
            ) : (
              savings.map((item) => {
                const result = calculateSaving(
                  item.start_date,
                  item.end_date,
                  Number(item.monthly_amount || 0),
                  Number(item.contributed || 0),
                  Number(item.goal || 0),
                  Number(item.withdrawn_amount || 0),
                );

                return (
                  <Pressable
                    key={item.id}
                    style={styles.savingRow}
                    onPress={() => openSavingDetail(item)}
                  >
                    <View style={styles.savingTopRow}>
                      <View style={styles.savingTextBlock}>
                        <Text style={styles.savingName} numberOfLines={1}>
                          {item.name}
                        </Text>

                        <Text style={styles.savingStatus}>
                          {result.completed ? "Cumplido" : "En progreso"} ·{" "}
                          {result.progress.toFixed(0)}%
                          {Number(item.withdrawn_amount || 0) > 0
                            ? ` · ${formatCompactMoney(Number(item.withdrawn_amount || 0))} recogidos`
                            : ""}
                        </Text>
                      </View>

                      <Text
                        style={styles.savingAmount}
                        numberOfLines={1}
                        adjustsFontSizeToFit
                        minimumFontScale={0.65}
                      >
                        {formatCompactMoney(result.currentSaved)}
                      </Text>
                    </View>

                    <View style={styles.progressTrack}>
                      <View
                        style={[
                          styles.progressFill,
                          { width: `${result.progress}%` },
                        ]}
                      />
                    </View>

                    <View style={styles.infoLine}>
                      <InfoPill
                        label="Objetivo"
                        value={formatCompactMoney(Number(item.goal || 0))}
                      />

                      <InfoPill
                        label="Recogido"
                        value={formatCompactMoney(
                          Number(item.withdrawn_amount || 0),
                        )}
                      />

                      <InfoPill
                        label="Pendiente"
                        value={formatCompactMoney(result.pending)}
                      />
                    </View>
                  </Pressable>
                );
              })
            )}
          </View>
          )}

          <Pressable
            style={[commonStyles.card, styles.toolCard]}
            onPress={() => setShowHomeSimulator(true)}
          >
            <View style={styles.toolCardIcon}>
              <Ionicons
                name="home-outline"
                size={20}
                color={colors.primaryDark}
              />
            </View>
            <View style={styles.cardHeaderText}>
              <Text style={commonStyles.smallText}>Compra de vivienda</Text>
              <Text style={commonStyles.cardTitle}>Simular hipoteca</Text>
              <Text style={styles.collapsedHint}>
                Pulsa para abrir tus simulaciones guardadas
              </Text>
            </View>
            <Ionicons
              name="chevron-forward"
              size={18}
              color={colors.primaryDark}
            />
          </Pressable>

          <Pressable
            style={[commonStyles.card, styles.toolCard]}
            onPress={() => setShowIpremCalculator(true)}
          >
            <View style={styles.toolCardIcon}>
              <Ionicons
                name="calculator-outline"
                size={20}
                color={colors.primaryDark}
              />
            </View>
            <View style={styles.cardHeaderText}>
              <Text style={commonStyles.smallText}>Vivienda protegida</Text>
              <Text style={commonStyles.cardTitle}>Calcular IPREM</Text>
              <Text style={styles.collapsedHint}>
                Pulsa para abrir la calculadora VPPB / VPPL
              </Text>
            </View>
            <Ionicons
              name="chevron-forward"
              size={18}
              color={colors.primaryDark}
            />
          </Pressable>
        </View>
      </ScrollView>

      <Modal
        visible={showSavingsList}
        transparent
        animationType="fade"
        onRequestClose={() => setShowSavingsList(false)}
      >
        <View style={commonStyles.modalOverlay}>
          <View style={commonStyles.modalCard}>
            <View style={commonStyles.modalHeader}>
              <View style={commonStyles.modalTitleBlock}>
                <Text style={commonStyles.modalTitle}>Mis objetivos</Text>
                <Text style={commonStyles.modalSubtitle}>
                  Revisa tus objetivos de ahorro y abre cualquiera para ver el
                  detalle.
                </Text>
              </View>

              <Pressable
                style={commonStyles.closeButton}
                onPress={() => setShowSavingsList(false)}
              >
                <Ionicons name="close" size={22} color={colors.primaryDark} />
              </Pressable>
            </View>

            <Pressable
              style={[commonStyles.primaryButton, styles.modalCreateButton]}
              onPress={() => {
                setShowSavingsList(false);
                openCreateForm();
              }}
            >
              <Ionicons name="add" size={18} color={colors.white} />
              <Text style={commonStyles.primaryButtonText}>Nuevo objetivo</Text>
            </Pressable>

            <ScrollView
              style={commonStyles.modalScroll}
              keyboardShouldPersistTaps="handled"
            >
              {savings.length === 0 ? (
                <EmptyState
                  title="No tienes ahorros todavía"
                  text="Crea tu primer objetivo para ver el resumen y el progreso."
                  actionLabel="Crear objetivo"
                  icon="wallet-outline"
                  onAction={() => {
                    setShowSavingsList(false);
                    openCreateForm();
                  }}
                />
              ) : (
                savings.map((item) => {
                  const result = calculateSaving(
                    item.start_date,
                    item.end_date,
                    Number(item.monthly_amount || 0),
                    Number(item.contributed || 0),
                    Number(item.goal || 0),
                    Number(item.withdrawn_amount || 0),
                  );

                  return (
                    <Pressable
                      key={item.id}
                      style={styles.savingRow}
                      onPress={() => {
                        setShowSavingsList(false);
                        openSavingDetail(item);
                      }}
                    >
                      <View style={styles.savingTopRow}>
                        <View style={styles.savingTextBlock}>
                          <Text style={styles.savingName} numberOfLines={1}>
                            {item.name}
                          </Text>

                          <Text style={styles.savingStatus}>
                            {result.completed ? "Cumplido" : "En progreso"} ·{" "}
                            {result.progress.toFixed(0)}%
                            {Number(item.withdrawn_amount || 0) > 0
                              ? ` · ${formatCompactMoney(Number(item.withdrawn_amount || 0))} recogidos`
                              : ""}
                          </Text>
                        </View>

                        <Text
                          style={styles.savingAmount}
                          numberOfLines={1}
                          adjustsFontSizeToFit
                          minimumFontScale={0.65}
                        >
                          {formatCompactMoney(result.currentSaved)}
                        </Text>
                      </View>

                      <View style={styles.progressTrack}>
                        <View
                          style={[
                            styles.progressFill,
                            { width: `${result.progress}%` },
                          ]}
                        />
                      </View>

                      <View style={styles.infoLine}>
                        <InfoPill
                          label="Objetivo"
                          value={formatCompactMoney(Number(item.goal || 0))}
                        />

                        <InfoPill
                          label="Recogido"
                          value={formatCompactMoney(
                            Number(item.withdrawn_amount || 0),
                          )}
                        />

                        <InfoPill
                          label="Pendiente"
                          value={formatCompactMoney(result.pending)}
                        />
                      </View>
                    </Pressable>
                  );
                })
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal
        visible={showIpremCalculator}
        transparent
        animationType="fade"
        onRequestClose={() => setShowIpremCalculator(false)}
      >
        <View style={commonStyles.modalOverlay}>
          <View style={commonStyles.modalCard}>
            <View style={commonStyles.modalHeader}>
              <View style={commonStyles.modalTitleBlock}>
                <Text style={commonStyles.modalTitle}>Calcular IPREM</Text>
                <Text style={commonStyles.modalSubtitle}>
                  En la declaración de la renta busca el apartado Base imponible.
                  Suele corresponder a base imponible general y base imponible
                  del ahorro; en muchos modelos aparecen como casillas 435 y
                  460. Confirma siempre el ejercicio que estés usando.
                </Text>
              </View>

              <Pressable
                style={commonStyles.closeButton}
                onPress={() => setShowIpremCalculator(false)}
              >
                <Ionicons name="close" size={22} color={colors.primaryDark} />
              </Pressable>
            </View>

            <ScrollView
              style={commonStyles.modalScroll}
              keyboardShouldPersistTaps="handled"
            >
              <Pressable style={styles.officialLink} onPress={openOfficialIprem}>
                <Ionicons
                  name="open-outline"
                  size={16}
                  color={colors.primaryDark}
                />
                <Text style={styles.officialLinkText}>
                  Consultar IPREM oficial
                </Text>
              </Pressable>

              <AppTextInput
                label="IPREM anual (€)"
                value={ipremAnnual}
                onChange={setIpremAnnual}
                commonStyles={commonStyles}
              />

              <View style={styles.ipremPersonGrid}>
                <View style={styles.ipremPersonBox}>
                  <Text style={styles.ipremPersonTitle}>Usuario</Text>
                  <AppTextInput
                    label="Base imponible general (€)"
                    value={userGeneralBase}
                    onChange={setUserGeneralBase}
                    commonStyles={commonStyles}
                  />
                  <AppTextInput
                    label="Base imponible del ahorro (€)"
                    value={userSavingsBase}
                    onChange={setUserSavingsBase}
                    commonStyles={commonStyles}
                  />
                </View>

                <View style={styles.ipremPersonBox}>
                  <Text style={styles.ipremPersonTitle}>Pareja opcional</Text>
                  <AppTextInput
                    label="Base imponible general (€)"
                    value={partnerGeneralBase}
                    onChange={setPartnerGeneralBase}
                    commonStyles={commonStyles}
                  />
                  <AppTextInput
                    label="Base imponible del ahorro (€)"
                    value={partnerSavingsBase}
                    onChange={setPartnerSavingsBase}
                    commonStyles={commonStyles}
                  />
                </View>
              </View>

              <View style={styles.ipremResultGrid}>
                <IpremResultCard
                  title="VPPB"
                  description="Límite 5,5 veces IPREM anual"
                  limit={vppbLimit}
                  eligible={vppbEligible}
                  hasIncome={hasIpremIncome}
                  styles={styles}
                />

                <IpremResultCard
                  title="VPPL"
                  description="Límite 7,5 veces IPREM anual"
                  limit={vpplLimit}
                  eligible={vpplEligible}
                  hasIncome={hasIpremIncome}
                  styles={styles}
                />
              </View>

              <View style={styles.summaryBox}>
                <Text style={styles.summaryTitle}>Resumen IPREM</Text>
                <ResultRow
                  label="Ingresos usuario"
                  value={formatMoney(userIpremIncome)}
                  styles={styles}
                />
                <ResultRow
                  label="Ingresos pareja"
                  value={
                    partnerIpremIncome > 0
                      ? formatMoney(partnerIpremIncome)
                      : "No indicado"
                  }
                  styles={styles}
                />
                <ResultRow
                  label="Ingresos totales"
                  value={formatMoney(householdIpremIncome)}
                  strong
                  styles={styles}
                />
              </View>

              {ipremSavedMessage ? (
                <View style={styles.ipremSavedNotice}>
                  <Ionicons
                    name="checkmark-circle-outline"
                    size={18}
                    color={colors.primaryDark}
                  />
                  <Text style={styles.ipremSavedText}>{ipremSavedMessage}</Text>
                </View>
              ) : null}

              <Pressable
                style={[commonStyles.primaryButton, styles.ipremSaveButton]}
                onPress={() => saveIpremDraft(true)}
              >
                <Ionicons name="save-outline" size={18} color={colors.white} />
                <Text style={commonStyles.primaryButtonText}>
                  Guardar IPREM
                </Text>
              </Pressable>
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal
        visible={showHomeSimulator}
        transparent
        animationType="fade"
        onRequestClose={() => setShowHomeSimulator(false)}
      >
        <View style={commonStyles.modalOverlay}>
          <View style={styles.homeSimulatorModalCard}>
            <HomePurchaseScreen
              embedded
              onClose={() => setShowHomeSimulator(false)}
            />
          </View>
        </View>
      </Modal>

      <Modal
        visible={formVisible}
        transparent
        animationType="fade"
        onRequestClose={closeForm}
      >
        <View style={commonStyles.modalOverlay}>
          <View style={commonStyles.modalCard}>
            <View style={commonStyles.modalHeader}>
              <View style={commonStyles.modalTitleBlock}>
                <Text style={commonStyles.modalTitle}>
                  {editingId ? "Editar ahorro" : "Nuevo ahorro"}
                </Text>

                <Text style={commonStyles.modalSubtitle}>
                  Si cancelas, no se guarda ningún cambio
                </Text>
              </View>

              <Pressable style={commonStyles.closeButton} onPress={closeForm}>
                <Ionicons name="close" size={22} color={colors.primaryDark} />
              </Pressable>
            </View>

            <ScrollView
              style={commonStyles.modalScroll}
              keyboardShouldPersistTaps="handled"
            >
              <AppTextInput
                label="Nombre del ahorro"
                value={name}
                onChange={setName}
                keyboardType="default"
                commonStyles={commonStyles}
              />

              <AppTextInput
                label="Objetivo (€)"
                value={goal}
                onChange={setGoal}
                commonStyles={commonStyles}
              />

              <View style={styles.dateGrid}>
                <View style={styles.dateColumn}>
                  <AppTextInput
                    label="Fecha inicio"
                    value={startDate}
                    onChange={setStartDate}
                    keyboardType="default"
                    commonStyles={commonStyles}
                  />
                </View>

                <View style={styles.dateColumn}>
                  <AppTextInput
                    label="Fecha fin"
                    value={endDate}
                    onChange={setEndDate}
                    keyboardType="default"
                    commonStyles={commonStyles}
                  />
                </View>
              </View>

              <AppTextInput
                label="Ahorro mensual (€)"
                value={monthly}
                onChange={setMonthly}
                commonStyles={commonStyles}
              />

              <AppTextInput
                label="Aportado hasta ahora (€)"
                value={contributed}
                onChange={setContributed}
                commonStyles={commonStyles}
              />

              <AppTextInput
                label="Prestado / notas"
                value={borrowed}
                onChange={setBorrowed}
                keyboardType="default"
                commonStyles={commonStyles}
              />

              <View style={styles.summaryBox}>
                <Text style={styles.summaryTitle}>Resumen</Text>

                <ResultRow
                  label="Objetivo"
                  value={formatMoney(parseMoneyInput(goal))}
                  styles={styles}
                />

                <ResultRow
                  label="Ahorro actual"
                  value={formatMoney(currentFormResult.currentSaved)}
                  styles={styles}
                />

                <ResultRow
                  label="Pendiente"
                  value={formatMoney(currentFormResult.pending)}
                  strong
                  styles={styles}
                />

                <ResultRow
                  label="Mensual necesario"
                  value={formatMoney(currentFormResult.neededMonthly)}
                  styles={styles}
                />
              </View>
            </ScrollView>

            <View style={commonStyles.modalActions}>
              <Pressable
                style={commonStyles.modalCancelButton}
                onPress={closeForm}
              >
                <Text style={commonStyles.modalCancelText}>Cancelar</Text>
              </Pressable>

              <Pressable
                style={commonStyles.modalSaveButton}
                onPress={saveSaving}
              >
                <Text style={commonStyles.modalSaveText}>
                  {editingId ? "Guardar cambios" : "Guardar"}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={!!selectedSaving}
        transparent
        animationType="fade"
        onRequestClose={closeSavingDetail}
      >
        <View style={commonStyles.modalOverlay}>
          <View style={commonStyles.modalCardSmall}>
            <View style={commonStyles.modalHeader}>
              <View style={commonStyles.modalTitleBlock}>
                <Text style={commonStyles.modalTitle}>
                  {selectedSaving?.name}
                </Text>

                <Text style={commonStyles.modalSubtitle}>
                  Detalle del objetivo
                </Text>
              </View>

              <Pressable
                style={commonStyles.closeButton}
                onPress={closeSavingDetail}
              >
                <Ionicons name="close" size={22} color={colors.primaryDark} />
              </Pressable>
            </View>

            {selectedSaving &&
              (() => {
                const result = calculateSaving(
                  selectedSaving.start_date,
                  selectedSaving.end_date,
                  Number(selectedSaving.monthly_amount || 0),
                  Number(selectedSaving.contributed || 0),
                  Number(selectedSaving.goal || 0),
                  Number(selectedSaving.withdrawn_amount || 0),
                );

                return (
                  <ScrollView
                    style={commonStyles.modalScroll}
                    keyboardShouldPersistTaps="handled"
                  >
                    <View style={styles.detailHero}>
                      <Text style={styles.detailHeroLabel}>Ahorrado</Text>

                      <Text
                        style={styles.detailHeroAmount}
                        numberOfLines={1}
                        adjustsFontSizeToFit
                        minimumFontScale={0.65}
                      >
                        {formatCompactMoney(result.currentSaved)}
                      </Text>

                      <Text style={styles.detailHeroSubtitle}>
                        {result.progress.toFixed(0)}% del objetivo
                      </Text>
                    </View>

                    <ResultRow
                      label="Objetivo"
                      value={formatMoney(Number(selectedSaving.goal || 0))}
                      styles={styles}
                    />

                    <ResultRow
                      label="Pendiente"
                      value={formatMoney(result.pending)}
                      strong
                      styles={styles}
                    />

                    <ResultRow
                      label="Dinero recogido"
                      value={formatMoney(
                        Number(selectedSaving.withdrawn_amount || 0),
                      )}
                      styles={styles}
                    />

                    <ResultRow
                      label="Ahorro mensual"
                      value={formatMoney(
                        Number(selectedSaving.monthly_amount || 0),
                      )}
                      styles={styles}
                    />

                    <ResultRow
                      label="Inicio"
                      value={formatDateText(selectedSaving.start_date)}
                      styles={styles}
                    />

                    <ResultRow
                      label="Fin"
                      value={formatDateText(selectedSaving.end_date)}
                      styles={styles}
                    />

                    <ResultRow
                      label="Mensual necesario"
                      value={formatMoney(result.neededMonthly)}
                      styles={styles}
                    />

                    <ResultRow
                      label="Meses restantes"
                      value={String(result.remainingMonths)}
                      styles={styles}
                    />

                    <ResultRow
                      label="Estado"
                      value={result.completed ? "Cumplido" : "En progreso"}
                      styles={styles}
                    />

                    <View
                      style={[commonStyles.modalActions, styles.detailActionsGrid]}
                    >
                      <Pressable
                        style={commonStyles.secondaryButton}
                        onPress={() => openMovementForm(selectedSaving)}
                      >
                        <Ionicons
                          name="swap-horizontal-outline"
                          size={18}
                          color={colors.primaryDark}
                        />

                        <Text style={commonStyles.secondaryButtonText}>
                          Mover
                        </Text>
                      </Pressable>

                      <Pressable
                        style={commonStyles.secondaryButton}
                        onPress={() => openEditForm(selectedSaving)}
                      >
                        <Ionicons
                          name="create-outline"
                          size={18}
                          color={colors.primaryDark}
                        />

                        <Text style={commonStyles.secondaryButtonText}>
                          Editar
                        </Text>
                      </Pressable>

                      <Pressable
                        style={commonStyles.dangerButton}
                        onPress={() => deleteSaving(selectedSaving)}
                      >
                        <Ionicons
                          name="trash-outline"
                          size={18}
                          color="#B91C1C"
                        />

                        <Text style={commonStyles.dangerButtonText}>
                          Eliminar
                        </Text>
                      </Pressable>
                    </View>
                  </ScrollView>
                );
              })()}
          </View>
        </View>
      </Modal>

      <Modal
        visible={!!movementSaving}
        transparent
        animationType="fade"
        onRequestClose={closeMovementForm}
      >
        <View style={commonStyles.modalOverlay}>
          <View style={commonStyles.modalCardSmall}>
            <View style={commonStyles.modalHeader}>
              <View style={commonStyles.modalTitleBlock}>
                <Text style={commonStyles.modalTitle}>Mover dinero</Text>

                <Text style={commonStyles.modalSubtitle}>
                  {movementSaving?.name}
                </Text>
              </View>

              <Pressable
                style={commonStyles.closeButton}
                onPress={closeMovementForm}
              >
                <Ionicons name="close" size={22} color={colors.primaryDark} />
              </Pressable>
            </View>

            {movementSaving &&
              (() => {
                const result = calculateSaving(
                  movementSaving.start_date,
                  movementSaving.end_date,
                  Number(movementSaving.monthly_amount || 0),
                  Number(movementSaving.contributed || 0),
                  Number(movementSaving.goal || 0),
                  Number(movementSaving.withdrawn_amount || 0),
                );

                return (
                  <View>
                    <View style={styles.movementSummary}>
                      <ResultRow
                        label="Disponible en ahorro"
                        value={formatMoney(result.currentSaved)}
                        strong
                        styles={styles}
                      />

                      <ResultRow
                        label="Dinero recogido"
                        value={formatMoney(
                          Number(movementSaving.withdrawn_amount || 0),
                        )}
                        styles={styles}
                      />
                    </View>

                    <View style={styles.movementBox}>
                      <Text style={styles.movementText}>
                        Retira dinero del ahorro a tu cuenta personal o
                        devuélvelo cuando lo vuelvas a reservar.
                      </Text>

                      <AppTextInput
                        label="Importe (€)"
                        value={movementAmount}
                        onChange={setMovementAmount}
                        commonStyles={commonStyles}
                      />

                      <View style={styles.movementActions}>
                        <Pressable
                          style={[
                            commonStyles.secondaryButton,
                            styles.movementButton,
                          ]}
                          onPress={() => moveSavingMoney("return")}
                          disabled={isMovingSavingMoney}
                        >
                          <Ionicons
                            name="arrow-undo-outline"
                            size={18}
                            color={colors.primaryDark}
                          />

                          <Text style={commonStyles.secondaryButtonText}>
                            Devolver
                          </Text>
                        </Pressable>

                        <Pressable
                          style={[
                            commonStyles.primaryButton,
                            styles.movementButton,
                          ]}
                          onPress={() => moveSavingMoney("withdraw")}
                          disabled={isMovingSavingMoney}
                        >
                          <Ionicons
                            name="arrow-redo-outline"
                            size={18}
                            color={colors.white}
                          />

                          <Text style={commonStyles.primaryButtonText}>
                            Retirar
                          </Text>
                        </Pressable>
                      </View>
                    </View>
                  </View>
                );
              })()}
          </View>
        </View>
      </Modal>
    </View>
  );
}

function InfoPill({ label, value }: { label: string; value: string }) {
  return (
    <View style={infoPillStyles.pill}>
      <Text style={infoPillStyles.pillLabel}>{label}</Text>

      <Text
        style={infoPillStyles.pillValue}
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.65}
      >
        {value}
      </Text>
    </View>
  );
}

function IpremResultCard({
  title,
  description,
  limit,
  eligible,
  hasIncome,
  styles,
}: {
  title: string;
  description: string;
  limit: number;
  eligible: boolean;
  hasIncome: boolean;
  styles: ReturnType<typeof createStyles>;
}) {
  const statusText = !hasIncome ? "Sin datos" : eligible ? "Cumple" : "Supera";
  const statusStyle = !hasIncome
    ? styles.ipremStatusNeutral
    : eligible
      ? styles.ipremStatusOk
      : styles.ipremStatusBad;

  return (
    <View style={styles.ipremResultCard}>
      <View style={styles.ipremResultTop}>
        <Text style={styles.ipremResultTitle}>{title}</Text>
        <View style={[styles.ipremStatus, statusStyle]}>
          <Text style={styles.ipremStatusText}>{statusText}</Text>
        </View>
      </View>

      <Text style={styles.ipremResultDescription}>{description}</Text>
      <Text style={styles.ipremResultLimit}>{formatMoney(limit)}</Text>
    </View>
  );
}

const infoPillStyles = StyleSheet.create({
  pill: {
    flex: 1,
    minWidth: 0,
    backgroundColor: colors.surface,
    borderRadius: 12,
    paddingVertical: 7,
    paddingHorizontal: 7,
    borderWidth: 1,
    borderColor: colors.borderSoft,
  },

  pillLabel: {
    fontSize: 9,
    color: colors.mutedText,
    fontWeight: "800",
    marginBottom: 2,
  },

  pillValue: {
    width: "100%",
    fontSize: 10,
    color: colors.text,
    fontWeight: "900",
  },
});

const createStyles = (isDesktop: boolean) =>
  StyleSheet.create({
    heroCard: {
      backgroundColor: colors.primaryDark,
      borderRadius: isDesktop ? 20 : 18,
      padding: isDesktop ? 22 : 16,
      marginBottom: isDesktop ? 14 : 12,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 14,
      minHeight: isDesktop ? 132 : 112,
    },

    heroTextBlock: {
      flex: 1,
      minWidth: 0,
    },

    heroLabel: {
      fontSize: isDesktop ? 13 : 11,
      color: colors.white,
      opacity: 0.85,
      fontWeight: "800",
      marginBottom: 4,
    },

    heroAmount: {
      fontSize: isDesktop ? 34 : 28,
      color: colors.white,
      fontWeight: "900",
    },

    heroSubtitle: {
      fontSize: isDesktop ? 13 : 11,
      color: colors.white,
      opacity: 0.85,
      fontWeight: "600",
      marginTop: 4,
    },

    heroIcon: {
      width: isDesktop ? 58 : 48,
      height: isDesktop ? 58 : 48,
      borderRadius: 999,
      backgroundColor: "rgba(255,255,255,0.16)",
      alignItems: "center",
      justifyContent: "center",
    },

    kpiGrid: {
      flexDirection: "row",
      gap: isDesktop ? 10 : 6,
      marginBottom: isDesktop ? 14 : 12,
    },

    kpiCard: {
      flex: 1,
      minWidth: 0,
      backgroundColor: colors.surface,
      borderRadius: isDesktop ? 16 : 12,
      borderWidth: 1,
      borderColor: colors.border,
      paddingVertical: isDesktop ? 15 : 9,
      paddingHorizontal: isDesktop ? 15 : 8,
    },

    kpiLabel: {
      fontSize: isDesktop ? 12 : 9,
      color: colors.mutedText,
      fontWeight: "800",
      marginBottom: 4,
    },

    kpiValue: {
      fontSize: isDesktop ? 19 : 14,
      color: colors.text,
      fontWeight: "900",
    },

    cardHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 12,
      marginBottom: 14,
    },

    cardHeaderText: {
      flex: 1,
      minWidth: 0,
    },

    collapsedHint: {
      marginTop: 3,
      color: colors.mutedText,
      fontSize: isDesktop ? 12 : 10,
      fontWeight: "800",
    },

    headerActions: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },

    addButton: {
      width: 38,
      height: 38,
      borderRadius: 12,
      backgroundColor: colors.primaryDark,
      alignItems: "center",
      justifyContent: "center",
    },

    expandButton: {
      width: 38,
      height: 38,
      borderRadius: 12,
      backgroundColor: colors.primarySoft,
      alignItems: "center",
      justifyContent: "center",
    },

    modalCreateButton: {
      width: "100%",
      marginBottom: 12,
    },

    emptyBox: {
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: isDesktop ? 30 : 22,
      paddingHorizontal: 14,
      backgroundColor: colors.background,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.borderSoft,
    },

    emptyTitle: {
      fontSize: isDesktop ? 16 : 14,
      color: colors.text,
      fontWeight: "900",
      marginTop: 10,
      marginBottom: 4,
      textAlign: "center",
    },

    emptyText: {
      fontSize: isDesktop ? 13 : 11,
      color: colors.mutedText,
      textAlign: "center",
      fontWeight: "600",
    },

    savingRow: {
      backgroundColor: colors.background,
      borderWidth: 1,
      borderColor: colors.borderSoft,
      borderRadius: 16,
      padding: isDesktop ? 14 : 12,
      marginBottom: 10,
    },

    savingTopRow: {
      flexDirection: "row",
      alignItems: "flex-start",
      justifyContent: "space-between",
      gap: 12,
      marginBottom: 10,
    },

    savingTextBlock: {
      flex: 1,
      minWidth: 0,
    },

    savingName: {
      fontSize: isDesktop ? 15 : 13,
      fontWeight: "900",
      color: colors.text,
      marginBottom: 2,
    },

    savingStatus: {
      fontSize: isDesktop ? 12 : 10,
      color: colors.mutedText,
      fontWeight: "700",
    },

    savingAmount: {
      maxWidth: isDesktop ? 180 : 120,
      fontSize: isDesktop ? 18 : 15,
      fontWeight: "900",
      color: colors.primaryDark,
      textAlign: "right",
    },

    progressTrack: {
      height: 8,
      backgroundColor: colors.borderSoft,
      borderRadius: 999,
      overflow: "hidden",
      marginBottom: 10,
    },

    progressFill: {
      height: "100%",
      backgroundColor: colors.primaryDark,
      borderRadius: 999,
    },

    infoLine: {
      flexDirection: "row",
      gap: isDesktop ? 8 : 5,
      marginBottom: 10,
    },

    actionsRowRight: {
      flexDirection: "row",
      justifyContent: "flex-end",
      gap: 8,
    },

    iconButton: {
      width: 34,
      height: 34,
      borderRadius: 10,
      backgroundColor: colors.primarySoft,
      alignItems: "center",
      justifyContent: "center",
    },

    deleteIconButton: {
      width: 34,
      height: 34,
      borderRadius: 10,
      backgroundColor: "#FEF2F2",
      alignItems: "center",
      justifyContent: "center",
    },

    homeButton: {
      marginBottom: 14,
    },

    toolCard: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      marginBottom: 14,
    },

    toolCardIcon: {
      width: 42,
      height: 42,
      borderRadius: 13,
      backgroundColor: colors.primarySoft,
      alignItems: "center",
      justifyContent: "center",
    },

    homeSimulatorModalCard: {
      width: isDesktop ? "78%" : "94%",
      maxWidth: 820,
      maxHeight: "88%",
      backgroundColor: colors.background,
      borderRadius: isDesktop ? 22 : 18,
      padding: isDesktop ? 14 : 10,
      borderWidth: 1,
      borderColor: colors.border,
    },

    ipremHelpText: {
      marginTop: 6,
      color: colors.mutedText,
      fontSize: isDesktop ? 12 : 10,
      fontWeight: "700",
      lineHeight: isDesktop ? 18 : 15,
    },

    officialLink: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 7,
      minHeight: 42,
      borderRadius: 13,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.primarySoft,
      marginBottom: 12,
    },

    officialLinkText: {
      color: colors.primaryDark,
      fontSize: isDesktop ? 12 : 10,
      fontWeight: "900",
    },

    ipremPersonGrid: {
      flexDirection: isDesktop ? "row" : "column",
      gap: 10,
    },

    ipremPersonBox: {
      flex: 1,
      minWidth: 0,
      borderWidth: 1,
      borderColor: colors.borderSoft,
      borderRadius: 14,
      padding: isDesktop ? 12 : 10,
      backgroundColor: colors.background,
    },

    ipremPersonTitle: {
      color: colors.text,
      fontSize: isDesktop ? 14 : 12,
      fontWeight: "900",
      marginBottom: 8,
    },

    ipremResultGrid: {
      flexDirection: isDesktop ? "row" : "column",
      gap: 10,
      marginTop: 12,
      marginBottom: 10,
    },

    ipremResultCard: {
      flex: 1,
      minWidth: 0,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 14,
      padding: isDesktop ? 14 : 12,
      backgroundColor: colors.surface,
      gap: 7,
    },

    ipremResultTop: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 8,
    },

    ipremResultTitle: {
      color: colors.text,
      fontSize: isDesktop ? 16 : 14,
      fontWeight: "900",
    },

    ipremResultDescription: {
      color: colors.mutedText,
      fontSize: isDesktop ? 12 : 10,
      fontWeight: "800",
    },

    ipremResultLimit: {
      color: colors.primaryDark,
      fontSize: isDesktop ? 18 : 16,
      fontWeight: "900",
    },

    ipremStatus: {
      borderRadius: 999,
      paddingHorizontal: 9,
      paddingVertical: 5,
    },

    ipremStatusNeutral: {
      backgroundColor: colors.primarySoft,
    },

    ipremStatusOk: {
      backgroundColor: "#DCFCE7",
    },

    ipremStatusBad: {
      backgroundColor: "#FEE2E2",
    },

    ipremStatusText: {
      color: colors.text,
      fontSize: isDesktop ? 11 : 9,
      fontWeight: "900",
    },

    ipremSavedNotice: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.primarySoft,
      borderRadius: 13,
      paddingVertical: 10,
      paddingHorizontal: 12,
      marginTop: 10,
    },

    ipremSavedText: {
      flex: 1,
      color: colors.primaryDark,
      fontSize: isDesktop ? 12 : 10,
      fontWeight: "900",
    },

    ipremSaveButton: {
      width: "100%",
      marginTop: 12,
    },

    dateGrid: {
      flexDirection: isDesktop ? "row" : "column",
      gap: isDesktop ? 12 : 0,
    },

    dateColumn: {
      flex: 1,
    },

    summaryBox: {
      backgroundColor: colors.background,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.borderSoft,
      padding: isDesktop ? 14 : 12,
      marginTop: 6,
    },

    summaryTitle: {
      fontSize: isDesktop ? 15 : 13,
      color: colors.text,
      fontWeight: "900",
      marginBottom: 8,
    },

    movementBox: {
      backgroundColor: colors.background,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.borderSoft,
      padding: isDesktop ? 14 : 12,
      marginTop: 12,
      marginBottom: 12,
    },

    movementSummary: {
      backgroundColor: colors.background,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.borderSoft,
      paddingHorizontal: isDesktop ? 14 : 12,
      paddingVertical: isDesktop ? 8 : 6,
      marginBottom: 10,
    },

    movementText: {
      fontSize: isDesktop ? 12 : 10,
      color: colors.mutedText,
      fontWeight: "700",
      marginBottom: 10,
      lineHeight: isDesktop ? 18 : 15,
    },

    movementActions: {
      flexDirection: "row",
      gap: 8,
      marginTop: 4,
    },

    movementButton: {
      flex: 1,
    },

    resultRow: {
      paddingVertical: isDesktop ? 10 : 8,
      borderBottomWidth: 1,
      borderBottomColor: colors.borderSoft,
      flexDirection: "row",
      justifyContent: "space-between",
      gap: 12,
    },

    resultLabel: {
      flex: 1,
      fontSize: isDesktop ? 13 : 11,
      color: colors.mutedText,
      fontWeight: "800",
    },

    resultValue: {
      flexShrink: 1,
      maxWidth: "55%",
      fontSize: isDesktop ? 13 : 11,
      color: colors.text,
      fontWeight: "800",
      textAlign: "right",
    },

    resultValueStrong: {
      fontSize: isDesktop ? 14 : 12,
      fontWeight: "900",
      color: colors.primaryDark,
    },

    detailHero: {
      backgroundColor: colors.primaryDark,
      borderRadius: 16,
      padding: isDesktop ? 18 : 14,
      marginBottom: 14,
    },

    detailHeroLabel: {
      fontSize: isDesktop ? 12 : 10,
      color: colors.white,
      opacity: 0.85,
      fontWeight: "800",
      marginBottom: 4,
    },

    detailHeroAmount: {
      fontSize: isDesktop ? 28 : 24,
      color: colors.white,
      fontWeight: "900",
    },

    detailHeroSubtitle: {
      fontSize: isDesktop ? 13 : 11,
      color: colors.white,
      opacity: 0.85,
      fontWeight: "700",
      marginTop: 4,
    },

    detailActionsGrid: {
      flexWrap: "wrap",
    },
  });
