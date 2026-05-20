import { Ionicons } from "@expo/vector-icons";
import { Header } from "@react-navigation/elements";
import { router } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";

import { AppBottomMenu } from "@/src/components/AppBottomMenu";
import { AppTextInput } from "@/src/components/AppTextInput";
import { KpiCard } from "@/src/components/KpiCard";
import { ResultRow } from "@/src/components/ResultRow";
import { SpaceMenuButton } from "@/src/components/SpaceSwitcher";
import { useSpaces } from "@/src/context/SpaceContext";
import { useAppTheme } from "@/src/context/ThemeContext";
import { supabase } from "@/src/lib/supabase";
import { colors } from "@/src/theme/colors";
import { createCommonStyles } from "@/src/theme/commonStyles";
import { getCurrentUser } from "@/src/utils/auth";
import { confirmAction } from "@/src/utils/confirmAction";
import {
  formatCompactMoney,
  formatMoney,
  parseMoneyInput,
} from "@/src/utils/money";
import { applySpaceFilter, getSpacePayload } from "@/src/utils/spaceQueries";

import {
  Alert,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";

type EditMode = "main" | "property" | "mortgage" | "bank" | null;

type Simulation = {
  id: string;
  user_id: string;
  name: string;
  property_price: number;
  agency_percent: number;
  tax_percent: number;
  financial_fee: number;
  notary_percent: number;
  down_payment: number;
  pending_notary: number;
  years: number;
  tin: number;
  bonus: number;
  salary_bonus: number;
  life_insurance: number;
  home_insurance: number;
  created_at?: string;
  updated_at?: string;
};

type FormSnapshot = {
  selectedSimulationId: string | null;
  name: string;
  propertyPrice: string;
  agencyPercent: string;
  taxPercent: string;
  financialFee: string;
  notaryPercent: string;
  downPayment: string;
  pendingNotary: string;
  years: string;
  tin: string;
  bonus: string;
  salaryBonus: string;
  lifeInsurance: string;
  homeInsurance: string;
};

const defaultSimulation = {
  name: "Ejemplo de simulación",
  property_price: 300000,
  agency_percent: 3,
  tax_percent: 6,
  financial_fee: 5000,
  notary_percent: 1,
  down_payment: 90000,
  pending_notary: 500,
  years: 30,
  tin: 3.4,
  bonus: 0.85,
  salary_bonus: 0,
  life_insurance: 0,
  home_insurance: 0,
};

type HomePurchaseScreenProps = {
  embedded?: boolean;
  onClose?: () => void;
};

export default function HomePurchaseScreen({
  embedded = false,
  onClose,
}: HomePurchaseScreenProps = {}) {
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

  const [simulations, setSimulations] = useState<Simulation[]>([]);
  const [selectedSimulationId, setSelectedSimulationId] = useState<
    string | null
  >(null);

  const [name, setName] = useState(defaultSimulation.name);
  const [propertyPrice, setPropertyPrice] = useState(
    String(defaultSimulation.property_price),
  );
  const [agencyPercent, setAgencyPercent] = useState(
    String(defaultSimulation.agency_percent),
  );
  const [taxPercent, setTaxPercent] = useState(
    String(defaultSimulation.tax_percent),
  );
  const [financialFee, setFinancialFee] = useState(
    String(defaultSimulation.financial_fee),
  );
  const [notaryPercent, setNotaryPercent] = useState(
    String(defaultSimulation.notary_percent),
  );
  const [downPayment, setDownPayment] = useState(
    String(defaultSimulation.down_payment),
  );
  const [pendingNotary, setPendingNotary] = useState(
    String(defaultSimulation.pending_notary),
  );
  const [years, setYears] = useState(String(defaultSimulation.years));
  const [tin, setTin] = useState(String(defaultSimulation.tin));
  const [bonus, setBonus] = useState(String(defaultSimulation.bonus));
  const [salaryBonus, setSalaryBonus] = useState(
    String(defaultSimulation.salary_bonus),
  );
  const [lifeInsurance, setLifeInsurance] = useState(
    String(defaultSimulation.life_insurance),
  );
  const [homeInsurance, setHomeInsurance] = useState(
    String(defaultSimulation.home_insurance),
  );

  const [editMode, setEditMode] = useState<EditMode>(null);

  const [draftName, setDraftName] = useState("");
  const [draftPropertyPrice, setDraftPropertyPrice] = useState("");
  const [draftAgencyPercent, setDraftAgencyPercent] = useState("");
  const [draftTaxPercent, setDraftTaxPercent] = useState("");
  const [draftFinancialFee, setDraftFinancialFee] = useState("");
  const [draftNotaryPercent, setDraftNotaryPercent] = useState("");
  const [draftDownPayment, setDraftDownPayment] = useState("");
  const [draftPendingNotary, setDraftPendingNotary] = useState("");
  const [draftYears, setDraftYears] = useState("");
  const [draftTin, setDraftTin] = useState("");
  const [draftBonus, setDraftBonus] = useState("");
  const [draftSalaryBonus, setDraftSalaryBonus] = useState("");
  const [draftLifeInsurance, setDraftLifeInsurance] = useState("");
  const [draftHomeInsurance, setDraftHomeInsurance] = useState("");

  const [saveNameModalVisible, setSaveNameModalVisible] = useState(false);
  const [newSimulationName, setNewSimulationName] = useState("");
  const [simulatorModalVisible, setSimulatorModalVisible] = useState(false);

  const toNumber = (value: string | number) => {
    return parseMoneyInput(value);
  };

  const buildDefaultSnapshot = (): FormSnapshot => ({
    selectedSimulationId: null,
    name: defaultSimulation.name,
    propertyPrice: String(defaultSimulation.property_price),
    agencyPercent: String(defaultSimulation.agency_percent),
    taxPercent: String(defaultSimulation.tax_percent),
    financialFee: String(defaultSimulation.financial_fee),
    notaryPercent: String(defaultSimulation.notary_percent),
    downPayment: String(defaultSimulation.down_payment),
    pendingNotary: String(defaultSimulation.pending_notary),
    years: String(defaultSimulation.years),
    tin: String(defaultSimulation.tin),
    bonus: String(defaultSimulation.bonus),
    salaryBonus: String(defaultSimulation.salary_bonus),
    lifeInsurance: String(defaultSimulation.life_insurance),
    homeInsurance: String(defaultSimulation.home_insurance),
  });

  const buildEmptySnapshot = (): FormSnapshot => ({
    selectedSimulationId: null,
    name: "Nueva simulación",
    propertyPrice: "",
    agencyPercent: "",
    taxPercent: "",
    financialFee: "",
    notaryPercent: "",
    downPayment: "",
    pendingNotary: "",
    years: "",
    tin: "",
    bonus: "",
    salaryBonus: "",
    lifeInsurance: "",
    homeInsurance: "",
  });

  const buildSnapshotFromSimulation = (
    simulation: Simulation,
  ): FormSnapshot => ({
    selectedSimulationId: simulation.id,
    name: simulation.name || "Simulación guardada",
    propertyPrice: String(simulation.property_price ?? 300000),
    agencyPercent: String(simulation.agency_percent ?? 3),
    taxPercent: String(simulation.tax_percent ?? 6),
    financialFee: String(simulation.financial_fee ?? 5000),
    notaryPercent: String(simulation.notary_percent ?? 1),
    downPayment: String(simulation.down_payment ?? 90000),
    pendingNotary: String(simulation.pending_notary ?? 500),
    years: String(simulation.years ?? 30),
    tin: String(simulation.tin ?? 3.4),
    bonus: String(simulation.bonus ?? 0.85),
    salaryBonus: String(simulation.salary_bonus ?? 0),
    lifeInsurance: String(simulation.life_insurance ?? 0),
    homeInsurance: String(simulation.home_insurance ?? 0),
  });

  const applySnapshot = (snapshot: FormSnapshot) => {
    setSelectedSimulationId(snapshot.selectedSimulationId);
    setName(snapshot.name);
    setPropertyPrice(snapshot.propertyPrice);
    setAgencyPercent(snapshot.agencyPercent);
    setTaxPercent(snapshot.taxPercent);
    setFinancialFee(snapshot.financialFee);
    setNotaryPercent(snapshot.notaryPercent);
    setDownPayment(snapshot.downPayment);
    setPendingNotary(snapshot.pendingNotary);
    setYears(snapshot.years);
    setTin(snapshot.tin);
    setBonus(snapshot.bonus);
    setSalaryBonus(snapshot.salaryBonus);
    setLifeInsurance(snapshot.lifeInsurance);
    setHomeInsurance(snapshot.homeInsurance);
  };

  const price = toNumber(propertyPrice);
  const agency = (price * toNumber(agencyPercent)) / 100;
  const tax = (price * toNumber(taxPercent)) / 100;
  const notary = (price * toNumber(notaryPercent)) / 100;
  const financial = toNumber(financialFee);
  const totalProperty = price + agency + tax + financial + notary;

  const down = toNumber(downPayment);
  const mortgage = Math.max(0, totalProperty - down);
  const coveredPercent = totalProperty > 0 ? (down / totalProperty) * 100 : 0;
  const remainingPercent = Math.max(0, 100 - coveredPercent);

  const totalMonths = toNumber(years) * 12;

  const bonusTotal =
    toNumber(bonus) +
    toNumber(salaryBonus) +
    toNumber(lifeInsurance) +
    toNumber(homeInsurance);

  const finalTin = Math.max(0, toNumber(tin) - bonusTotal);
  const monthlyRate = finalTin / 100 / 12;

  const monthlyPayment =
    monthlyRate > 0 && totalMonths > 0
      ? (mortgage * (monthlyRate * Math.pow(1 + monthlyRate, totalMonths))) /
        (Math.pow(1 + monthlyRate, totalMonths) - 1)
      : totalMonths > 0
        ? mortgage / totalMonths
        : 0;

  const totalBankCost = monthlyPayment * totalMonths;
  const totalInterest = Math.max(0, totalBankCost - mortgage);

  const getSimulationSummary = (simulation: Simulation) => {
    const simulationPrice = Number(simulation.property_price || 0);
    const simulationAgency =
      (simulationPrice * Number(simulation.agency_percent || 0)) / 100;
    const simulationTax =
      (simulationPrice * Number(simulation.tax_percent || 0)) / 100;
    const simulationFinancial = Number(simulation.financial_fee || 0);
    const simulationNotary =
      (simulationPrice * Number(simulation.notary_percent || 0)) / 100;
    const simulationTotal =
      simulationPrice +
      simulationAgency +
      simulationTax +
      simulationFinancial +
      simulationNotary;
    const simulationDown = Number(simulation.down_payment || 0);
    const simulationMortgage = Math.max(0, simulationTotal - simulationDown);
    const simulationCovered =
      simulationTotal > 0 ? (simulationDown / simulationTotal) * 100 : 0;
    const simulationMonths = Number(simulation.years || 0) * 12;
    const simulationBonus =
      Number(simulation.bonus || 0) +
      Number(simulation.salary_bonus || 0) +
      Number(simulation.life_insurance || 0) +
      Number(simulation.home_insurance || 0);
    const simulationTin = Math.max(0, Number(simulation.tin || 0) - simulationBonus);
    const simulationRate = simulationTin / 100 / 12;
    const simulationPayment =
      simulationRate > 0 && simulationMonths > 0
        ? (simulationMortgage *
            (simulationRate * Math.pow(1 + simulationRate, simulationMonths))) /
          (Math.pow(1 + simulationRate, simulationMonths) - 1)
        : simulationMonths > 0
          ? simulationMortgage / simulationMonths
          : 0;

    return {
      price: simulationPrice,
      expenses: Math.max(0, simulationTotal - simulationPrice),
      total: simulationTotal,
      down: simulationDown,
      mortgage: simulationMortgage,
      covered: simulationCovered,
      monthlyPayment: simulationPayment,
    };
  };

  const cleanSimulationForm = () => {
    const snapshot = buildEmptySnapshot();
    applySnapshot(snapshot);
  };

  const exitSimulator = () => {
    setEditMode(null);
    setSaveNameModalVisible(false);
    setSimulatorModalVisible(false);
  };

  const loadSimulationIntoForm = (simulation: Simulation) => {
    const snapshot = buildSnapshotFromSimulation(simulation);
    applySnapshot(snapshot);
  };

  const openNewSimulation = () => {
    applySnapshot(buildEmptySnapshot());
    setSimulatorModalVisible(true);
  };

  const openExampleSimulation = () => {
    applySnapshot(buildDefaultSnapshot());
    setSimulatorModalVisible(true);
  };

  const openSavedSimulation = (simulation: Simulation) => {
    loadSimulationIntoForm(simulation);
    setSimulatorModalVisible(true);
  };

  const loadSimulations = useCallback(async () => {
    const user = await getCurrentUser();

    if (!user) return;

    const simulationsQuery = supabase
      .from("home_purchase_simulations")
      .select("*")
      .order("updated_at", { ascending: false });
    const { data, error } = await applySpaceFilter(
      simulationsQuery,
      user.id,
      activeSpaceId,
    );

    if (error) {
      Alert.alert("Error", "No se pudieron cargar las simulaciones.");
      return;
    }

    setSimulations(data || []);
  }, [activeSpaceId]);

  const getPayload = async (simulationName: string) => {
    const user = await getCurrentUser();

    if (!user) return null;

    return {
      user_id: user.id,
      name: simulationName.trim() || "Simulación sin nombre",
      property_price: toNumber(propertyPrice),
      agency_percent: toNumber(agencyPercent),
      tax_percent: toNumber(taxPercent),
      financial_fee: toNumber(financialFee),
      notary_percent: toNumber(notaryPercent),
      down_payment: toNumber(downPayment),
      pending_notary: toNumber(pendingNotary),
      years: toNumber(years),
      tin: toNumber(tin),
      bonus: toNumber(bonus),
      salary_bonus: toNumber(salaryBonus),
      life_insurance: toNumber(lifeInsurance),
      home_insurance: toNumber(homeInsurance),
      updated_at: new Date().toISOString(),
      ...getSpacePayload(activeSpaceId),
    };
  };

  const saveSimulation = async () => {
    if (!selectedSimulationId) {
      setNewSimulationName(name === defaultSimulation.name ? "" : name);
      setSaveNameModalVisible(true);
      return;
    }

    const payload = await getPayload(name);

    if (!payload) return;

    const confirmed = await confirmAction("¿Guardar los cambios de la simulación?");
    if (!confirmed) return;

    const { error } = await supabase
      .from("home_purchase_simulations")
      .update(payload)
      .eq("id", selectedSimulationId)
      .eq("user_id", payload.user_id);

    if (error) {
      Alert.alert("Error", "No se pudo actualizar la simulación.");
      return;
    }

    await loadSimulations();
    await recordActivity(
      "home_simulation_updated",
      "home_purchase_simulation",
      selectedSimulationId,
      `Se actualizó la simulación ${payload.name}.`,
    );
    Alert.alert("Guardado", "Cambios guardados correctamente.");
  };

  const confirmSaveNewSimulation = async () => {
    const finalName = newSimulationName.trim();

    if (!finalName) {
      Alert.alert(
        "Falta el nombre",
        "Pon un nombre para guardar la simulación.",
      );
      return;
    }

    const payload = await getPayload(finalName);

    if (!payload) return;

    const confirmed = await confirmAction("¿Guardar esta simulación?");
    if (!confirmed) return;

    const { data, error } = await supabase
      .from("home_purchase_simulations")
      .insert([payload])
      .select()
      .single();

    if (error) {
      Alert.alert("Error", "No se pudo guardar la simulación.");
      return;
    }

    if (data) {
      const snapshot = buildSnapshotFromSimulation(data);
      applySnapshot(snapshot);
    }

    setSaveNameModalVisible(false);
    setNewSimulationName("");

    await loadSimulations();
    await recordActivity(
      "home_simulation_created",
      "home_purchase_simulation",
      data?.id || null,
      `Se creó la simulación ${finalName}.`,
    );
    Alert.alert("Guardado", "Simulación guardada correctamente.");
  };

  const deleteSimulation = async () => {
    if (!selectedSimulationId) return;

    const user = await getCurrentUser();

    if (!user) return;

    const executeDelete = async () => {
      const { error } = await supabase
        .from("home_purchase_simulations")
        .delete()
        .eq("id", selectedSimulationId)
        .eq("user_id", user.id);

      if (error) {
        Alert.alert("Error", "No se pudo eliminar la simulación.");
        return;
      }

      setSimulatorModalVisible(false);
      applySnapshot(buildEmptySnapshot());
      await loadSimulations();
      await recordActivity(
        "home_simulation_deleted",
        "home_purchase_simulation",
        selectedSimulationId,
        "Se eliminó una simulación de casa.",
      );
    };

    if (Platform.OS === "web") {
      const confirmed = window.confirm("¿Eliminar esta simulación?");
      if (confirmed) await executeDelete();
      return;
    }

    Alert.alert("Eliminar simulación", "¿Seguro que quieres eliminarla?", [
      { text: "Cancelar", style: "cancel" },
      { text: "Eliminar", style: "destructive", onPress: executeDelete },
    ]);
  };

  const openEdit = (mode: EditMode) => {
    setEditMode(mode);

    setDraftName(name);
    setDraftPropertyPrice(propertyPrice);
    setDraftAgencyPercent(agencyPercent);
    setDraftTaxPercent(taxPercent);
    setDraftFinancialFee(financialFee);
    setDraftNotaryPercent(notaryPercent);
    setDraftDownPayment(downPayment);
    setDraftPendingNotary(pendingNotary);
    setDraftYears(years);
    setDraftTin(tin);
    setDraftBonus(bonus);
    setDraftSalaryBonus(salaryBonus);
    setDraftLifeInsurance(lifeInsurance);
    setDraftHomeInsurance(homeInsurance);
  };

  const closeEdit = () => {
    setEditMode(null);
  };

  const saveEdit = async () => {
    const confirmed = await confirmAction("¿Aplicar estos cambios?");
    if (!confirmed) return;

    if (editMode === "main") {
      setName(draftName);
    }

    if (editMode === "property") {
      setPropertyPrice(draftPropertyPrice);
      setAgencyPercent(draftAgencyPercent);
      setTaxPercent(draftTaxPercent);
      setFinancialFee(draftFinancialFee);
      setNotaryPercent(draftNotaryPercent);
    }

    if (editMode === "mortgage") {
      setDownPayment(draftDownPayment);
      setPendingNotary(draftPendingNotary);
    }

    if (editMode === "bank") {
      setYears(draftYears);
      setTin(draftTin);
      setBonus(draftBonus);
      setSalaryBonus(draftSalaryBonus);
      setLifeInsurance(draftLifeInsurance);
      setHomeInsurance(draftHomeInsurance);
    }

    closeEdit();
    Alert.alert("Aplicado", "Cambios aplicados correctamente.");
  };

  useEffect(() => {
    const init = async () => {
      const user = await getCurrentUser();

      if (!user) {
        router.replace("/login");
        return;
      }

      const snapshot = buildEmptySnapshot();
      applySnapshot(snapshot);

      await loadSimulations();
    };

    init();
  }, [loadSimulations]);

  return (
    <View style={embedded ? styles.embeddedScreen : commonStyles.screen}>
      {!embedded && (
        <>
          <Header
            title="Simulador de casa"
            headerStyle={{ backgroundColor: colors.surface }}
            headerTintColor={colors.text}
            headerTitleStyle={{ color: colors.text }}
          />
          <SpaceMenuButton isDesktop={isDesktop} />
        </>
      )}

      <ScrollView
        contentContainerStyle={[
          commonStyles.container,
          embedded && styles.embeddedContainer,
        ]}
      >
        <View style={commonStyles.content}>
          <View style={[commonStyles.card, styles.libraryCard]}>
            <View style={styles.libraryHeader}>
              <View style={styles.titleTextBlock}>
                <Text style={commonStyles.smallText}>Hipoteca</Text>
                <Text style={commonStyles.cardTitle}>
                  Simulaciones guardadas
                </Text>
                <Text style={commonStyles.subtitle}>
                  Abre una simulación propia o usa el ejemplo solo cuando lo
                  necesites.
                </Text>
              </View>

              {embedded && onClose && (
                <Pressable style={commonStyles.closeButton} onPress={onClose}>
                  <Ionicons
                    name="close"
                    size={22}
                    color={colors.primaryDark}
                  />
                </Pressable>
              )}
            </View>

            <View style={styles.libraryActions}>
              <Pressable
                style={[commonStyles.primaryButton, styles.libraryButton]}
                onPress={openNewSimulation}
              >
                <Ionicons name="add" size={19} color={colors.white} />
                <Text style={commonStyles.primaryButtonText}>
                  Nueva simulación
                </Text>
              </Pressable>

              <Pressable
                style={[commonStyles.secondaryButton, styles.libraryButton]}
                onPress={openExampleSimulation}
              >
                <Ionicons
                  name="sparkles-outline"
                  size={18}
                  color={colors.primaryDark}
                />
                <Text style={commonStyles.secondaryButtonText}>
                  Ver ejemplo
                </Text>
              </Pressable>
            </View>
          </View>

          {simulations.length === 0 ? (
            <View style={[commonStyles.card, styles.emptySimulationsCard]}>
              <View style={styles.emptyIcon}>
                <Ionicons
                  name="file-tray-outline"
                  size={24}
                  color={colors.primaryDark}
                />
              </View>

              <Text style={commonStyles.sectionTitle}>
                Aún no tienes simulaciones
              </Text>

              <Text style={commonStyles.subtitle}>
                Crea una nueva o abre el ejemplo para ver cómo quedaría un
                caso completo.
              </Text>
            </View>
          ) : (
            <View style={styles.savedGrid}>
              {simulations.map((simulation) => {
                const summary = getSimulationSummary(simulation);

                return (
                  <Pressable
                    key={simulation.id}
                    style={styles.savedCard}
                    onPress={() => openSavedSimulation(simulation)}
                  >
                    <View style={styles.savedCardTop}>
                      <Text style={styles.savedCardTitle} numberOfLines={1}>
                        {simulation.name}
                      </Text>

                      <View style={styles.savedCardIcon}>
                        <Ionicons
                          name="open-outline"
                          size={17}
                          color={colors.white}
                        />
                      </View>
                    </View>

                    <View style={styles.savedHero}>
                      <View style={styles.savedHeroText}>
                        <Text style={styles.savedHeroLabel}>
                          Precio del inmueble
                        </Text>
                        <Text
                          style={styles.savedHeroAmount}
                          numberOfLines={1}
                          adjustsFontSizeToFit
                          minimumFontScale={0.55}
                        >
                          {formatMoney(summary.price)}
                        </Text>
                        <Text style={styles.savedHeroSubtext}>
                          Coste total estimado: {formatCompactMoney(summary.total)}
                        </Text>
                      </View>

                      <View style={styles.savedCoveredBox}>
                        <Text style={styles.savedCoveredValue}>
                          {summary.covered.toFixed(0)}%
                        </Text>
                        <Text style={styles.savedCoveredLabel}>cubierto</Text>
                      </View>
                    </View>

                    <View style={styles.savedKpiGrid}>
                      <MiniSummaryCard
                        label="Entrada"
                        value={formatCompactMoney(summary.down)}
                        styles={styles}
                      />
                      <MiniSummaryCard
                        label="Gastos"
                        value={formatCompactMoney(summary.expenses)}
                        styles={styles}
                      />
                      <MiniSummaryCard
                        label="Préstamo"
                        value={formatCompactMoney(summary.mortgage)}
                        styles={styles}
                      />
                      <MiniSummaryCard
                        label="Cuota"
                        value={formatCompactMoney(summary.monthlyPayment)}
                        styles={styles}
                      />
                    </View>
                  </Pressable>
                );
              })}
            </View>
          )}

          <Modal
            visible={simulatorModalVisible}
            transparent
            animationType="fade"
            onRequestClose={exitSimulator}
          >
            <View style={commonStyles.modalOverlay}>
              <View style={styles.simulatorModalCard}>
                <View style={commonStyles.modalHeader}>
                  <View style={commonStyles.modalTitleBlock}>
                    <Text style={commonStyles.modalTitle}>
                      {selectedSimulationId
                        ? "Simulación guardada"
                        : name === defaultSimulation.name
                          ? "Simulación de ejemplo"
                          : "Nueva simulación"}
                    </Text>

                    <Text style={commonStyles.modalSubtitle}>
                      Revisa los datos, ajusta importes y guarda los cambios.
                    </Text>
                  </View>

                  <Pressable
                    style={commonStyles.closeButton}
                    onPress={exitSimulator}
                  >
                    <Ionicons
                      name="close"
                      size={22}
                      color={colors.primaryDark}
                    />
                  </Pressable>
                </View>

                <ScrollView
                  style={styles.simulatorModalScroll}
                  contentContainerStyle={styles.simulatorModalContent}
                  keyboardShouldPersistTaps="handled"
                >
          <View style={[commonStyles.card, styles.titleCard]}>
            <View style={styles.titleTextBlock}>
              <Text style={commonStyles.smallText}>
                {selectedSimulationId
                  ? "Simulación guardada"
                  : "Simulación de ejemplo"}
              </Text>

              <Text
                style={[commonStyles.cardTitle, styles.titleText]}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.7}
              >
                {name}
              </Text>

              <Text style={commonStyles.subtitle}>
                Precio base: {formatMoney(price)}
              </Text>
            </View>

            <Pressable
              style={styles.iconEditButton}
              onPress={() => openEdit("main")}
            >
              <Ionicons
                name="create-outline"
                size={20}
                color={colors.primaryDark}
              />
            </Pressable>
          </View>

          <View style={styles.propertyPriceCard}>
            <View style={styles.heroTextBlock}>
              <Text style={styles.heroLabel}>Precio del piso</Text>

              <Text
                style={[styles.heroAmount, styles.heroCardAmount]}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.45}
              >
                {formatMoney(price)}
              </Text>

              <Text style={styles.propertyPriceHint}>
                Es el precio que ves anunciado; los gastos se suman aparte.
              </Text>
            </View>

            <Pressable
              style={styles.priceEditButton}
              onPress={() => openEdit("property")}
            >
              <Ionicons
                name="create-outline"
                size={18}
                color={colors.primaryDark}
              />
              <Text style={styles.priceEditText}>Editar</Text>
            </Pressable>
          </View>

          <View style={styles.heroCard}>
            <View style={styles.heroTextBlock}>
              <Text style={styles.heroLabel}>Coste total estimado</Text>

              <Text
                style={styles.heroAmount}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.45}
              >
                {formatMoney(totalProperty)}
              </Text>
            </View>

            <View style={styles.coveredBox}>
              <Text style={styles.coveredValue}>
                {coveredPercent.toFixed(0)}%
              </Text>
              <Text style={styles.coveredLabel}>cubierto</Text>
            </View>
          </View>

          <View style={styles.purchaseFlowCard}>
            <FlowStep
              label="Precio piso"
              value={formatCompactMoney(price)}
              styles={styles}
            />
            <Ionicons
              name="chevron-forward"
              size={16}
              color={colors.mutedText}
            />
            <FlowStep
              label="Gastos"
              value={formatCompactMoney(totalProperty - price)}
              styles={styles}
            />
            <Ionicons
              name="chevron-forward"
              size={16}
              color={colors.mutedText}
            />
            <FlowStep
              label="A financiar"
              value={formatCompactMoney(mortgage)}
              styles={styles}
            />
          </View>

          <View style={styles.kpiGrid}>
            <KpiCard
              label="Entrada"
              value={formatCompactMoney(down)}
              styles={styles}
            />

            <KpiCard
              label="Hipoteca"
              value={formatCompactMoney(mortgage)}
              styles={styles}
            />

            <KpiCard
              label="Cuota"
              value={formatCompactMoney(monthlyPayment)}
              styles={styles}
            />
          </View>

          <View style={[commonStyles.card, styles.actionsCard]}>
            <Pressable
              style={[commonStyles.primaryButton, styles.fullButton]}
              onPress={saveSimulation}
            >
              <Ionicons name="save-outline" size={18} color={colors.white} />

              <Text style={commonStyles.primaryButtonText}>
                {selectedSimulationId
                  ? "Guardar cambios"
                  : "Guardar simulación"}
              </Text>
            </Pressable>

            <View style={styles.secondaryActionsRow}>
              <Pressable
                style={[commonStyles.secondaryButton, styles.halfButton]}
                onPress={cleanSimulationForm}
              >
                <Ionicons
                  name="refresh-outline"
                  size={17}
                  color={colors.primaryDark}
                />

                <Text style={commonStyles.secondaryButtonText}>Limpiar</Text>
              </Pressable>

              <Pressable
                style={[commonStyles.secondaryButton, styles.halfButton]}
                onPress={exitSimulator}
              >
                <Ionicons
                  name="exit-outline"
                  size={17}
                  color={colors.primaryDark}
                />

                <Text style={commonStyles.secondaryButtonText}>Salir</Text>
              </Pressable>
            </View>

            {selectedSimulationId && (
              <Pressable
                style={[commonStyles.dangerButton, styles.fullButton]}
                onPress={deleteSimulation}
              >
                <Ionicons name="trash-outline" size={17} color="#B91C1C" />

                <Text style={commonStyles.dangerButtonText}>Eliminar</Text>
              </Pressable>
            )}
          </View>

          <View style={commonStyles.card}>
            <SectionHeader
              icon="home-outline"
              title="Costes del inmueble"
              subtitle="Precio, impuestos y gastos iniciales"
              onEdit={() => openEdit("property")}
              styles={styles}
            />

            <ResultRow
              label="Precio inmueble"
              value={formatMoney(price)}
              styles={styles}
            />

            <ResultRow
              label={`Agencia (${agencyPercent}%)`}
              value={formatMoney(agency)}
              styles={styles}
            />

            <ResultRow
              label={`ITP / IVA (${taxPercent}%)`}
              value={formatMoney(tax)}
              styles={styles}
            />

            <ResultRow
              label="Comisión financiera"
              value={formatMoney(financial)}
              styles={styles}
            />

            <ResultRow
              label={`Notaría + Registro (${notaryPercent}%)`}
              value={formatMoney(notary)}
              styles={styles}
            />

            <ResultRow
              label="Total inmueble"
              value={formatMoney(totalProperty)}
              strong
              styles={styles}
            />
          </View>

          <View style={commonStyles.card}>
            <SectionHeader
              icon="cash-outline"
              title="Entrada e hipoteca"
              subtitle="Qué pagas tú y qué financias"
              onEdit={() => openEdit("mortgage")}
              styles={styles}
            />

            <ResultRow
              label="Entrada"
              value={formatMoney(down)}
              styles={styles}
            />

            <ResultRow
              label="Hipoteca"
              value={formatMoney(mortgage)}
              styles={styles}
            />

            <ResultRow
              label="% cubierto"
              value={`${coveredPercent.toFixed(2)}%`}
              styles={styles}
            />

            <ResultRow
              label="% restante"
              value={`${remainingPercent.toFixed(2)}%`}
              styles={styles}
            />

            <ResultRow
              label="Notaría pendiente"
              value={formatMoney(toNumber(pendingNotary))}
              styles={styles}
            />
          </View>

          <View style={commonStyles.card}>
            <SectionHeader
              icon="business-outline"
              title="Banco"
              subtitle="TIN, bonificaciones y cuota"
              onEdit={() => openEdit("bank")}
              styles={styles}
            />

            <ResultRow label="Años" value={years} styles={styles} />

            <ResultRow
              label="TIN inicial"
              value={`${toNumber(tin).toFixed(2)}%`}
              styles={styles}
            />

            <ResultRow
              label="Bonificación total"
              value={`${bonusTotal.toFixed(2)}%`}
              styles={styles}
            />

            <ResultRow
              label="TIN final"
              value={`${finalTin.toFixed(2)}%`}
              styles={styles}
            />

            <ResultRow
              label="Cuota mensual"
              value={formatMoney(monthlyPayment)}
              strong
              styles={styles}
            />

            <ResultRow
              label="Intereses estimados"
              value={formatMoney(totalInterest)}
              styles={styles}
            />

            <ResultRow
              label="Total pagado al banco"
              value={formatMoney(totalBankCost)}
              styles={styles}
            />
          </View>
                </ScrollView>
              </View>
            </View>
          </Modal>
        </View>
      </ScrollView>

      {!embedded && <AppBottomMenu active="savings" />}

      <Modal
        visible={editMode !== null}
        transparent
        animationType="fade"
        onRequestClose={closeEdit}
      >
        <View style={commonStyles.modalOverlay}>
          <View style={commonStyles.modalCard}>
            <View style={commonStyles.modalHeader}>
              <View style={commonStyles.modalTitleBlock}>
                <Text style={commonStyles.modalTitle}>
                  {editMode === "main" && "Editar simulación"}
                  {editMode === "property" && "Editar costes"}
                  {editMode === "mortgage" && "Editar entrada"}
                  {editMode === "bank" && "Editar banco"}
                </Text>

                <Text style={commonStyles.modalSubtitle}>
                  Si cancelas, no se aplica ningún cambio
                </Text>
              </View>

              <Pressable style={commonStyles.closeButton} onPress={closeEdit}>
                <Ionicons name="close" size={22} color={colors.primaryDark} />
              </Pressable>
            </View>

            <ScrollView
              style={commonStyles.modalScroll}
              keyboardShouldPersistTaps="handled"
            >
              {editMode === "main" && (
                <AppTextInput
                  label="Nombre de la simulación"
                  value={draftName}
                  onChange={setDraftName}
                  keyboardType="default"
                  commonStyles={commonStyles}
                />
              )}

              {editMode === "property" && (
                <>
                  <AppTextInput
                    label="Precio del inmueble (€)"
                    value={draftPropertyPrice}
                    onChange={setDraftPropertyPrice}
                    commonStyles={commonStyles}
                  />

                  <AppTextInput
                    label="Agencia (%)"
                    value={draftAgencyPercent}
                    onChange={setDraftAgencyPercent}
                    commonStyles={commonStyles}
                  />

                  <AppTextInput
                    label="ITP / IVA (%)"
                    value={draftTaxPercent}
                    onChange={setDraftTaxPercent}
                    commonStyles={commonStyles}
                  />

                  <AppTextInput
                    label="Comisión financiera (€)"
                    value={draftFinancialFee}
                    onChange={setDraftFinancialFee}
                    commonStyles={commonStyles}
                  />

                  <AppTextInput
                    label="Notaría + Registro (%)"
                    value={draftNotaryPercent}
                    onChange={setDraftNotaryPercent}
                    commonStyles={commonStyles}
                  />
                </>
              )}

              {editMode === "mortgage" && (
                <>
                  <AppTextInput
                    label="Entrada (€)"
                    value={draftDownPayment}
                    onChange={setDraftDownPayment}
                    commonStyles={commonStyles}
                  />

                  <AppTextInput
                    label="Notaría pendiente (€)"
                    value={draftPendingNotary}
                    onChange={setDraftPendingNotary}
                    commonStyles={commonStyles}
                  />
                </>
              )}

              {editMode === "bank" && (
                <>
                  <AppTextInput
                    label="Años"
                    value={draftYears}
                    onChange={setDraftYears}
                    commonStyles={commonStyles}
                  />

                  <AppTextInput
                    label="TIN (%)"
                    value={draftTin}
                    onChange={setDraftTin}
                    commonStyles={commonStyles}
                  />

                  <AppTextInput
                    label="Bonificación base (%)"
                    value={draftBonus}
                    onChange={setDraftBonus}
                    commonStyles={commonStyles}
                  />

                  <AppTextInput
                    label="Bonificación nómina (%)"
                    value={draftSalaryBonus}
                    onChange={setDraftSalaryBonus}
                    commonStyles={commonStyles}
                  />

                  <AppTextInput
                    label="Seguro vida (%)"
                    value={draftLifeInsurance}
                    onChange={setDraftLifeInsurance}
                    commonStyles={commonStyles}
                  />

                  <AppTextInput
                    label="Seguro hogar (%)"
                    value={draftHomeInsurance}
                    onChange={setDraftHomeInsurance}
                    commonStyles={commonStyles}
                  />
                </>
              )}
            </ScrollView>

            <View style={commonStyles.modalActions}>
              <Pressable
                style={commonStyles.modalCancelButton}
                onPress={closeEdit}
              >
                <Text style={commonStyles.modalCancelText}>Cancelar</Text>
              </Pressable>

              <Pressable
                style={commonStyles.modalSaveButton}
                onPress={saveEdit}
              >
                <Text style={commonStyles.modalSaveText}>Aplicar</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={saveNameModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setSaveNameModalVisible(false)}
      >
        <View style={commonStyles.modalOverlay}>
          <View style={commonStyles.modalCardSmall}>
            <View style={commonStyles.modalHeader}>
              <View style={commonStyles.modalTitleBlock}>
                <Text style={commonStyles.modalTitle}>Guardar simulación</Text>

                <Text style={commonStyles.modalSubtitle}>
                  Ponle un nombre para encontrarla después
                </Text>
              </View>

              <Pressable
                style={commonStyles.closeButton}
                onPress={() => setSaveNameModalVisible(false)}
              >
                <Ionicons name="close" size={22} color={colors.primaryDark} />
              </Pressable>
            </View>

            <AppTextInput
              label="Nombre"
              value={newSimulationName}
              onChange={setNewSimulationName}
              keyboardType="default"
              commonStyles={commonStyles}
            />

            <View style={commonStyles.modalActions}>
              <Pressable
                style={commonStyles.modalCancelButton}
                onPress={() => setSaveNameModalVisible(false)}
              >
                <Text style={commonStyles.modalCancelText}>Cancelar</Text>
              </Pressable>

              <Pressable
                style={commonStyles.modalSaveButton}
                onPress={confirmSaveNewSimulation}
              >
                <Text style={commonStyles.modalSaveText}>Guardar</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function SectionHeader({
  icon,
  title,
  subtitle,
  onEdit,
  styles,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle: string;
  onEdit: () => void;
  styles: ReturnType<typeof createStyles>;
}) {
  return (
    <View style={styles.sectionHeader}>
      <View style={styles.sectionHeaderLeft}>
        <View style={styles.sectionIcon}>
          <Ionicons name={icon} size={18} color={colors.primaryDark} />
        </View>

        <View style={styles.sectionTitleBlock}>
          <Text style={styles.sectionTitle} numberOfLines={1}>
            {title}
          </Text>

          <Text style={styles.sectionSubtitle} numberOfLines={1}>
            {subtitle}
          </Text>
        </View>
      </View>

      <Pressable style={styles.sectionEditButton} onPress={onEdit}>
        <Ionicons name="create-outline" size={17} color={colors.primaryDark} />
      </Pressable>
    </View>
  );
}

function MiniSummaryCard({
  label,
  value,
  styles,
}: {
  label: string;
  value: string;
  styles: ReturnType<typeof createStyles>;
}) {
  return (
    <View style={styles.savedMiniCard}>
      <Text style={styles.savedMiniLabel}>{label}</Text>
      <Text
        style={styles.savedMiniValue}
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.65}
      >
        {value}
      </Text>
    </View>
  );
}

function FlowStep({
  label,
  value,
  styles,
}: {
  label: string;
  value: string;
  styles: ReturnType<typeof createStyles>;
}) {
  return (
    <View style={styles.flowStep}>
      <Text style={styles.flowStepLabel}>{label}</Text>
      <Text
        style={styles.flowStepValue}
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.65}
      >
        {value}
      </Text>
    </View>
  );
}

const createStyles = (isDesktop: boolean) =>
  StyleSheet.create({
    embeddedScreen: {
      flex: 1,
      backgroundColor: "transparent",
    },

    embeddedContainer: {
      paddingHorizontal: 0,
      paddingTop: 0,
      paddingBottom: 0,
    },

    libraryCard: {
      gap: isDesktop ? 16 : 12,
    },

    libraryHeader: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
    },

    libraryActions: {
      flexDirection: isDesktop ? "row" : "column",
      gap: 8,
    },

    libraryButton: {
      flex: isDesktop ? 1 : undefined,
      width: isDesktop ? undefined : "100%",
    },

    emptySimulationsCard: {
      alignItems: "flex-start",
      gap: 8,
    },

    emptyIcon: {
      width: 46,
      height: 46,
      borderRadius: 16,
      backgroundColor: colors.primarySoft,
      alignItems: "center",
      justifyContent: "center",
    },

    savedGrid: {
      gap: isDesktop ? 12 : 10,
    },

    savedCard: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: isDesktop ? 18 : 16,
      overflow: "hidden",
      gap: 0,
    },

    savedCardTop: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 10,
      paddingHorizontal: isDesktop ? 18 : 14,
      paddingTop: isDesktop ? 16 : 14,
      paddingBottom: 10,
    },

    savedCardTitle: {
      flex: 1,
      minWidth: 0,
      fontSize: isDesktop ? 18 : 16,
      color: colors.text,
      fontWeight: "900",
    },

    savedCardIcon: {
      width: 36,
      height: 36,
      borderRadius: 12,
      backgroundColor: colors.primaryDark,
      alignItems: "center",
      justifyContent: "center",
    },

    savedHero: {
      backgroundColor: colors.primaryDark,
      padding: isDesktop ? 22 : 16,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 12,
    },

    savedHeroText: {
      flex: 1,
      minWidth: 0,
    },

    savedHeroLabel: {
      color: colors.white,
      fontSize: isDesktop ? 13 : 11,
      fontWeight: "900",
      opacity: 0.9,
      marginBottom: 8,
    },

    savedHeroAmount: {
      color: colors.white,
      fontSize: isDesktop ? 34 : 25,
      fontWeight: "900",
    },

    savedHeroSubtext: {
      color: colors.white,
      opacity: 0.86,
      fontSize: isDesktop ? 12 : 10,
      fontWeight: "800",
      marginTop: 6,
    },

    savedCoveredBox: {
      width: isDesktop ? 96 : 76,
      height: isDesktop ? 76 : 66,
      backgroundColor: "rgba(255,255,255,0.16)",
      borderRadius: 18,
      alignItems: "center",
      justifyContent: "center",
    },

    savedCoveredValue: {
      color: colors.white,
      fontSize: isDesktop ? 24 : 20,
      fontWeight: "900",
    },

    savedCoveredLabel: {
      color: colors.white,
      fontSize: isDesktop ? 11 : 9,
      fontWeight: "800",
      opacity: 0.9,
    },

    savedKpiGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: isDesktop ? 12 : 7,
      padding: isDesktop ? 16 : 12,
      backgroundColor: colors.surface,
    },

    savedMiniCard: {
      flex: 1,
      flexBasis: isDesktop ? "22%" : "47%",
      minWidth: 0,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 14,
      paddingVertical: isDesktop ? 13 : 10,
      paddingHorizontal: isDesktop ? 12 : 8,
      backgroundColor: colors.white,
    },

    savedMiniLabel: {
      color: colors.mutedText,
      fontSize: isDesktop ? 12 : 10,
      fontWeight: "900",
      marginBottom: 8,
    },

    savedMiniValue: {
      color: colors.text,
      fontSize: isDesktop ? 19 : 14,
      fontWeight: "900",
    },

    simulatorModalCard: {
      width: isDesktop ? "72%" : "92%",
      maxWidth: 760,
      maxHeight: "88%",
      backgroundColor: colors.background,
      borderRadius: isDesktop ? 22 : 18,
      padding: isDesktop ? 18 : 12,
      borderWidth: 1,
      borderColor: colors.border,
    },

    simulatorModalScroll: {
      marginTop: isDesktop ? 8 : 6,
    },

    simulatorModalContent: {
      gap: isDesktop ? 14 : 12,
      paddingBottom: isDesktop ? 6 : 4,
    },

    titleCard: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
    },

    titleTextBlock: {
      flex: 1,
      minWidth: 0,
    },

    titleText: {
      marginVertical: 3,
    },

    iconEditButton: {
      width: isDesktop ? 42 : 40,
      height: isDesktop ? 42 : 40,
      borderRadius: 12,
      backgroundColor: colors.primarySoft,
      alignItems: "center",
      justifyContent: "center",
    },

    propertyPriceCard: {
      backgroundColor: colors.primaryDark,
      borderRadius: isDesktop ? 20 : 18,
      padding: isDesktop ? 22 : 16,
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      gap: 12,
      minHeight: isDesktop ? 128 : 112,
    },

    propertyPriceHint: {
      color: colors.white,
      opacity: 0.86,
      fontSize: isDesktop ? 12 : 10,
      fontWeight: "700",
      marginTop: 8,
    },

    priceEditButton: {
      minWidth: isDesktop ? 88 : 74,
      minHeight: isDesktop ? 46 : 42,
      borderRadius: 14,
      backgroundColor: colors.white,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 6,
      paddingHorizontal: 10,
    },

    priceEditText: {
      color: colors.primaryDark,
      fontSize: isDesktop ? 12 : 10,
      fontWeight: "900",
    },

    heroCard: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: isDesktop ? 20 : 18,
      padding: isDesktop ? 22 : 16,
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      gap: 12,
      minHeight: isDesktop ? 112 : 96,
    },

    heroTextBlock: {
      flex: 1,
      minWidth: 0,
    },

    heroLabel: {
      fontSize: isDesktop ? 13 : 11,
      color: colors.mutedText,
      fontWeight: "800",
      marginBottom: 4,
    },

    heroAmount: {
      fontSize: isDesktop ? 34 : 28,
      color: colors.white,
      fontWeight: "900",
      maxWidth: "100%",
    },

    heroCardAmount: {
      color: colors.primaryDark,
    },

    coveredBox: {
      width: isDesktop ? 96 : 76,
      height: isDesktop ? 76 : 66,
      backgroundColor: colors.primarySoft,
      borderRadius: 18,
      alignItems: "center",
      justifyContent: "center",
    },

    coveredValue: {
      color: colors.primaryDark,
      fontSize: isDesktop ? 23 : 20,
      fontWeight: "900",
    },

    coveredLabel: {
      color: colors.primaryDark,
      fontSize: isDesktop ? 11 : 9,
      fontWeight: "800",
      opacity: 0.9,
    },

    purchaseFlowCard: {
      flexDirection: "row",
      alignItems: "center",
      gap: isDesktop ? 8 : 5,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 16,
      padding: isDesktop ? 12 : 8,
    },

    flowStep: {
      flex: 1,
      minWidth: 0,
      backgroundColor: colors.background,
      borderRadius: 12,
      paddingVertical: isDesktop ? 10 : 8,
      paddingHorizontal: isDesktop ? 10 : 7,
    },

    flowStepLabel: {
      color: colors.mutedText,
      fontSize: isDesktop ? 11 : 9,
      fontWeight: "900",
      marginBottom: 4,
    },

    flowStepValue: {
      color: colors.text,
      fontSize: isDesktop ? 15 : 11,
      fontWeight: "900",
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

    actionsCard: {
      padding: isDesktop ? 10 : 9,
      gap: 8,
    },

    fullButton: {
      width: "100%",
    },

    secondaryActionsRow: {
      flexDirection: "row",
      gap: 8,
    },

    halfButton: {
      flex: 1,
    },

    sectionHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: isDesktop ? 12 : 10,
      gap: 10,
    },

    sectionHeaderLeft: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      minWidth: 0,
    },

    sectionIcon: {
      width: isDesktop ? 38 : 34,
      height: isDesktop ? 38 : 34,
      borderRadius: 12,
      backgroundColor: colors.primarySoft,
      alignItems: "center",
      justifyContent: "center",
    },

    sectionTitleBlock: {
      flex: 1,
      minWidth: 0,
    },

    sectionTitle: {
      fontSize: isDesktop ? 17 : 15,
      color: colors.text,
      fontWeight: "900",
    },

    sectionSubtitle: {
      fontSize: isDesktop ? 12 : 10,
      color: colors.mutedText,
      marginTop: 2,
    },

    sectionEditButton: {
      width: isDesktop ? 36 : 32,
      height: isDesktop ? 36 : 32,
      borderRadius: 10,
      backgroundColor: colors.primarySoft,
      alignItems: "center",
      justifyContent: "center",
    },

    resultRow: {
      paddingVertical: isDesktop ? 11 : 9,
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
  });
