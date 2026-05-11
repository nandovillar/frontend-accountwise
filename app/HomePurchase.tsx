import { Ionicons } from "@expo/vector-icons";
import { Header } from "@react-navigation/elements";
import { router } from "expo-router";
import { useEffect, useState } from "react";

import { supabase } from "@/src/lib/supabase";
import { colors } from "@/src/theme/colors";

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

export default function HomePurchaseScreen() {
  const [simulations, setSimulations] = useState<Simulation[]>([]);
  const [selectedSimulationId, setSelectedSimulationId] = useState<
    string | null
  >(null);

  const [originalSnapshot, setOriginalSnapshot] = useState<FormSnapshot | null>(
    null,
  );

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

  const toNumber = (value: string | number) => {
    return Number(String(value).replace(",", ".")) || 0;
  };

  const formatMoney = (value: number) => {
    return `${value.toLocaleString("es-ES", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })} €`;
  };

  const getCurrentUser = async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    return session?.user ?? null;
  };

  const buildDefaultSnapshot = (): FormSnapshot => {
    return {
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
    };
  };

  const buildSnapshotFromSimulation = (
    simulation: Simulation,
  ): FormSnapshot => {
    return {
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
    };
  };

  const buildCurrentSnapshot = (): FormSnapshot => {
    return {
      selectedSimulationId,
      name,
      propertyPrice,
      agencyPercent,
      taxPercent,
      financialFee,
      notaryPercent,
      downPayment,
      pendingNotary,
      years,
      tin,
      bonus,
      salaryBonus,
      lifeInsurance,
      homeInsurance,
    };
  };

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

  const loadSimulationIntoForm = (simulation: Simulation) => {
    const snapshot = buildSnapshotFromSimulation(simulation);

    applySnapshot(snapshot);
    setOriginalSnapshot(snapshot);
  };

  const cleanToExample = () => {
    const snapshot = buildDefaultSnapshot();

    applySnapshot(snapshot);
    setOriginalSnapshot(snapshot);
  };

  const exitSimulator = () => {
    router.push("/savings");
  };

  const loadSimulations = async () => {
    const user = await getCurrentUser();

    if (!user) return;

    const { data, error } = await supabase
      .from("home_purchase_simulations")
      .select("*")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false });

    if (error) {
      Alert.alert("Error", "No se pudieron cargar las simulaciones.");
      return;
    }

    setSimulations(data || []);

    if (!originalSnapshot) {
      const snapshot = buildDefaultSnapshot();
      setOriginalSnapshot(snapshot);
    }
  };

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

    const { error } = await supabase
      .from("home_purchase_simulations")
      .update(payload)
      .eq("id", selectedSimulationId)
      .eq("user_id", payload.user_id);

    if (error) {
      Alert.alert("Error", "No se pudo actualizar la simulación.");
      return;
    }

    const updatedSnapshot = buildCurrentSnapshot();
    setOriginalSnapshot(updatedSnapshot);

    await loadSimulations();
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
      setOriginalSnapshot(snapshot);
    }

    setSaveNameModalVisible(false);
    setNewSimulationName("");

    await loadSimulations();
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

      cleanToExample();
      await loadSimulations();
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

  const saveEdit = () => {
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
  };

  useEffect(() => {
    const init = async () => {
      const user = await getCurrentUser();

      if (!user) {
        router.replace("/login");
        return;
      }

      const snapshot = buildDefaultSnapshot();
      applySnapshot(snapshot);
      setOriginalSnapshot(snapshot);

      await loadSimulations();
    };

    init();
  }, []);

  return (
    <View style={styles.screen}>
      <Header title="Simulador de casa" />

      <Pressable
        style={styles.settingsButton}
        onPress={() => router.push("/settings")}
      >
        <Text style={styles.settingsButtonText}>☰</Text>
      </Pressable>

      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.content}>
          <View style={styles.titleCard}>
            <View style={styles.titleTextBlock}>
              <Text style={styles.titleLabel}>
                {selectedSimulationId
                  ? "Simulación guardada"
                  : "Simulación de ejemplo"}
              </Text>

              <Text style={styles.titleText} numberOfLines={1}>
                {name}
              </Text>

              <Text style={styles.titleSubtitle}>
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

          <View style={styles.heroCard}>
            <View style={styles.heroTextBlock}>
              <Text style={styles.heroLabel}>Coste total estimado</Text>

              <Text
                style={styles.heroAmount}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.55}
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

          <View style={styles.kpiGrid}>
            <KpiCard label="Entrada" value={formatMoney(down)} />
            <KpiCard label="Hipoteca" value={formatMoney(mortgage)} />
            <KpiCard label="Cuota" value={formatMoney(monthlyPayment)} />
          </View>

          <View style={styles.actionsCard}>
            <Pressable style={styles.primaryButton} onPress={saveSimulation}>
              <Ionicons name="save-outline" size={18} color={colors.white} />
              <Text style={styles.primaryButtonText}>
                {selectedSimulationId
                  ? "Guardar cambios"
                  : "Guardar simulación"}
              </Text>
            </Pressable>

            <Pressable style={styles.secondaryButton} onPress={cleanToExample}>
              <Ionicons
                name="refresh-outline"
                size={18}
                color={colors.primaryDark}
              />
              <Text style={styles.secondaryButtonText}>Limpiar</Text>
            </Pressable>

            <Pressable style={styles.secondaryButton} onPress={exitSimulator}>
              <Ionicons
                name="exit-outline"
                size={18}
                color={colors.primaryDark}
              />
              <Text style={styles.secondaryButtonText}>Salir</Text>
            </Pressable>

            {selectedSimulationId && (
              <Pressable style={styles.dangerButton} onPress={deleteSimulation}>
                <Ionicons name="trash-outline" size={18} color="#B91C1C" />
                <Text style={styles.dangerButtonText}>Eliminar</Text>
              </Pressable>
            )}
          </View>

          {simulations.length > 0 && (
            <View style={styles.savedCard}>
              <Text style={styles.savedTitle}>Simulaciones guardadas</Text>

              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.savedList}
              >
                {simulations.map((simulation) => (
                  <Pressable
                    key={simulation.id}
                    style={[
                      styles.savedItem,
                      selectedSimulationId === simulation.id &&
                        styles.savedItemActive,
                    ]}
                    onPress={() => loadSimulationIntoForm(simulation)}
                  >
                    <Text
                      style={[
                        styles.savedItemTitle,
                        selectedSimulationId === simulation.id &&
                          styles.savedItemTitleActive,
                      ]}
                      numberOfLines={1}
                    >
                      {simulation.name}
                    </Text>

                    <Text
                      style={[
                        styles.savedItemSubtitle,
                        selectedSimulationId === simulation.id &&
                          styles.savedItemSubtitleActive,
                      ]}
                      numberOfLines={1}
                    >
                      {formatMoney(Number(simulation.property_price || 0))}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>
            </View>
          )}

          <View style={styles.sectionCard}>
            <SectionHeader
              icon="home-outline"
              title="Costes del inmueble"
              subtitle="Precio, impuestos y gastos iniciales"
              onEdit={() => openEdit("property")}
            />

            <ResultRow label="Precio inmueble" value={formatMoney(price)} />
            <ResultRow
              label={`Agencia (${agencyPercent}%)`}
              value={formatMoney(agency)}
            />
            <ResultRow
              label={`ITP / IVA (${taxPercent}%)`}
              value={formatMoney(tax)}
            />
            <ResultRow
              label="Comisión financiera"
              value={formatMoney(financial)}
            />
            <ResultRow
              label={`Notaría + Registro (${notaryPercent}%)`}
              value={formatMoney(notary)}
            />
            <ResultRow
              label="Total inmueble"
              value={formatMoney(totalProperty)}
              strong
            />
          </View>

          <View style={styles.sectionCard}>
            <SectionHeader
              icon="cash-outline"
              title="Entrada e hipoteca"
              subtitle="Qué pagas tú y qué financias"
              onEdit={() => openEdit("mortgage")}
            />

            <ResultRow label="Entrada" value={formatMoney(down)} />
            <ResultRow label="Hipoteca" value={formatMoney(mortgage)} />
            <ResultRow
              label="% cubierto"
              value={`${coveredPercent.toFixed(2)}%`}
            />
            <ResultRow
              label="% restante"
              value={`${remainingPercent.toFixed(2)}%`}
            />
            <ResultRow
              label="Notaría pendiente"
              value={formatMoney(toNumber(pendingNotary))}
            />
          </View>

          <View style={styles.sectionCard}>
            <SectionHeader
              icon="business-outline"
              title="Banco"
              subtitle="TIN, bonificaciones y cuota"
              onEdit={() => openEdit("bank")}
            />

            <ResultRow label="Años" value={years} />
            <ResultRow
              label="TIN inicial"
              value={`${toNumber(tin).toFixed(2)}%`}
            />
            <ResultRow
              label="Bonificación total"
              value={`${bonusTotal.toFixed(2)}%`}
            />
            <ResultRow label="TIN final" value={`${finalTin.toFixed(2)}%`} />
            <ResultRow
              label="Cuota mensual"
              value={formatMoney(monthlyPayment)}
              strong
            />
            <ResultRow
              label="Intereses estimados"
              value={formatMoney(totalInterest)}
            />
            <ResultRow
              label="Total pagado al banco"
              value={formatMoney(totalBankCost)}
            />
          </View>
        </View>
      </ScrollView>

      <View style={styles.bottomBar}>
        <BottomItem
          label="Inicio"
          icon="home-outline"
          onPress={() => router.push("/")}
        />

        <BottomItem
          label="Gastos"
          icon="card-outline"
          onPress={() => router.push("/expenses")}
        />

        <BottomItem
          label="Ahorros"
          icon="wallet-outline"
          active
          onPress={() => router.push("/savings")}
        />
      </View>

      <Modal
        visible={editMode !== null}
        transparent
        animationType="fade"
        onRequestClose={closeEdit}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>
                  {editMode === "main" && "Editar simulación"}
                  {editMode === "property" && "Editar costes"}
                  {editMode === "mortgage" && "Editar entrada"}
                  {editMode === "bank" && "Editar banco"}
                </Text>

                <Text style={styles.modalSubtitle}>
                  Si cancelas, no se aplica ningún cambio
                </Text>
              </View>

              <Pressable style={styles.closeButton} onPress={closeEdit}>
                <Ionicons name="close" size={22} color={colors.primaryDark} />
              </Pressable>
            </View>

            <ScrollView
              style={styles.modalScroll}
              keyboardShouldPersistTaps="handled"
            >
              {editMode === "main" && (
                <Input
                  label="Nombre de la simulación"
                  value={draftName}
                  onChange={setDraftName}
                  keyboardType="default"
                />
              )}

              {editMode === "property" && (
                <>
                  <Input
                    label="Precio del inmueble (€)"
                    value={draftPropertyPrice}
                    onChange={setDraftPropertyPrice}
                  />

                  <Input
                    label="Agencia (%)"
                    value={draftAgencyPercent}
                    onChange={setDraftAgencyPercent}
                  />

                  <Input
                    label="ITP / IVA (%)"
                    value={draftTaxPercent}
                    onChange={setDraftTaxPercent}
                  />

                  <Input
                    label="Comisión financiera (€)"
                    value={draftFinancialFee}
                    onChange={setDraftFinancialFee}
                  />

                  <Input
                    label="Notaría + Registro (%)"
                    value={draftNotaryPercent}
                    onChange={setDraftNotaryPercent}
                  />
                </>
              )}

              {editMode === "mortgage" && (
                <>
                  <Input
                    label="Entrada (€)"
                    value={draftDownPayment}
                    onChange={setDraftDownPayment}
                  />

                  <Input
                    label="Notaría pendiente (€)"
                    value={draftPendingNotary}
                    onChange={setDraftPendingNotary}
                  />
                </>
              )}

              {editMode === "bank" && (
                <>
                  <Input
                    label="Años"
                    value={draftYears}
                    onChange={setDraftYears}
                  />

                  <Input
                    label="TIN (%)"
                    value={draftTin}
                    onChange={setDraftTin}
                  />

                  <Input
                    label="Bonificación base (%)"
                    value={draftBonus}
                    onChange={setDraftBonus}
                  />

                  <Input
                    label="Bonificación nómina (%)"
                    value={draftSalaryBonus}
                    onChange={setDraftSalaryBonus}
                  />

                  <Input
                    label="Seguro vida (%)"
                    value={draftLifeInsurance}
                    onChange={setDraftLifeInsurance}
                  />

                  <Input
                    label="Seguro hogar (%)"
                    value={draftHomeInsurance}
                    onChange={setDraftHomeInsurance}
                  />
                </>
              )}
            </ScrollView>

            <View style={styles.modalActions}>
              <Pressable style={styles.modalCancelButton} onPress={closeEdit}>
                <Text style={styles.modalCancelText}>Cancelar</Text>
              </Pressable>

              <Pressable style={styles.modalSaveButton} onPress={saveEdit}>
                <Text style={styles.modalSaveText}>Aplicar</Text>
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
        <View style={styles.modalOverlay}>
          <View style={styles.modalCardSmall}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Guardar simulación</Text>
                <Text style={styles.modalSubtitle}>
                  Ponle un nombre para encontrarla después
                </Text>
              </View>

              <Pressable
                style={styles.closeButton}
                onPress={() => setSaveNameModalVisible(false)}
              >
                <Ionicons name="close" size={22} color={colors.primaryDark} />
              </Pressable>
            </View>

            <Input
              label="Nombre"
              value={newSimulationName}
              onChange={setNewSimulationName}
              keyboardType="default"
            />

            <View style={styles.modalActions}>
              <Pressable
                style={styles.modalCancelButton}
                onPress={() => setSaveNameModalVisible(false)}
              >
                <Text style={styles.modalCancelText}>Cancelar</Text>
              </Pressable>

              <Pressable
                style={styles.modalSaveButton}
                onPress={confirmSaveNewSimulation}
              >
                <Text style={styles.modalSaveText}>Guardar</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function BottomItem({
  label,
  icon,
  active,
  onPress,
}: {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  active?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable style={styles.bottomItem} onPress={onPress}>
      <Ionicons
        name={icon}
        size={24}
        color={active ? colors.primaryDark : colors.mutedText}
      />
      <Text style={[styles.bottomText, active && styles.bottomTextActive]}>
        {label}
      </Text>
    </Pressable>
  );
}

function KpiCard({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.kpiCard}>
      <Text style={styles.kpiLabel}>{label}</Text>

      <Text
        style={styles.kpiValue}
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.55}
      >
        {value}
      </Text>
    </View>
  );
}

function SectionHeader({
  icon,
  title,
  subtitle,
  onEdit,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle: string;
  onEdit: () => void;
}) {
  return (
    <View style={styles.sectionHeader}>
      <View style={styles.sectionHeaderLeft}>
        <View style={styles.sectionIcon}>
          <Ionicons name={icon} size={20} color={colors.primaryDark} />
        </View>

        <View style={styles.sectionTitleBlock}>
          <Text style={styles.sectionTitle}>{title}</Text>
          <Text style={styles.sectionSubtitle}>{subtitle}</Text>
        </View>
      </View>

      <Pressable style={styles.sectionEditButton} onPress={onEdit}>
        <Ionicons name="create-outline" size={18} color={colors.primaryDark} />
      </Pressable>
    </View>
  );
}

function ResultRow({
  label,
  value,
  strong,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <View style={styles.resultRow}>
      <Text style={styles.resultLabel}>{label}</Text>

      <Text
        style={[styles.resultValue, strong && styles.resultValueStrong]}
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.75}
      >
        {value}
      </Text>
    </View>
  );
}

function Input({
  label,
  value,
  onChange,
  keyboardType = "numeric",
}: {
  label: string;
  value: string;
  onChange: (text: string) => void;
  keyboardType?: "numeric" | "default";
}) {
  return (
    <View style={styles.inputGroup}>
      <Text style={styles.inputLabel}>{label}</Text>

      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChange}
        keyboardType={keyboardType}
      />
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
    paddingBottom: 100,
    alignItems: "center",
  },

  content: {
    width: "100%",
    maxWidth: 980,
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
    zIndex: 20,
  },

  settingsButtonText: {
    fontSize: isWeb ? 22 : 20,
    lineHeight: 24,
    color: colors.text,
    fontWeight: "900",
  },

  titleCard: {
    backgroundColor: colors.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    padding: isWeb ? 18 : 15,
    marginBottom: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },

  titleTextBlock: {
    flex: 1,
    minWidth: 0,
  },

  titleLabel: {
    fontSize: isWeb ? 12 : 10,
    color: colors.mutedText,
    fontWeight: "800",
    marginBottom: 4,
  },

  titleText: {
    fontSize: isWeb ? 22 : 18,
    color: colors.text,
    fontWeight: "900",
  },

  titleSubtitle: {
    fontSize: isWeb ? 13 : 11,
    color: colors.mutedText,
    marginTop: 4,
  },

  iconEditButton: {
    width: isWeb ? 42 : 38,
    height: isWeb ? 42 : 38,
    borderRadius: 12,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },

  heroCard: {
    backgroundColor: colors.primaryDark,
    borderRadius: 20,
    padding: isWeb ? 22 : 18,
    marginBottom: 14,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 14,
  },

  heroTextBlock: {
    flex: 1,
    minWidth: 0,
  },

  heroLabel: {
    fontSize: isWeb ? 13 : 11,
    color: colors.white,
    opacity: 0.85,
    fontWeight: "800",
    marginBottom: 5,
  },

  heroAmount: {
    fontSize: isWeb ? 34 : 31,
    color: colors.white,
    fontWeight: "900",
  },

  coveredBox: {
    width: isWeb ? 96 : 76,
    height: isWeb ? 76 : 68,
    backgroundColor: "rgba(255,255,255,0.16)",
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },

  coveredValue: {
    color: colors.white,
    fontSize: isWeb ? 23 : 20,
    fontWeight: "900",
  },

  coveredLabel: {
    color: colors.white,
    fontSize: isWeb ? 11 : 9,
    fontWeight: "800",
    opacity: 0.9,
  },

  kpiGrid: {
    flexDirection: isWeb ? "row" : "column",
    gap: 10,
    marginBottom: 14,
  },

  kpiCard: {
    flex: 1,
    minWidth: 0,
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: isWeb ? 15 : 14,
  },

  kpiLabel: {
    fontSize: isWeb ? 12 : 11,
    color: colors.mutedText,
    fontWeight: "800",
    marginBottom: 5,
  },

  kpiValue: {
    fontSize: isWeb ? 19 : 20,
    color: colors.text,
    fontWeight: "900",
  },

  actionsCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 10,
    marginBottom: 14,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },

  primaryButton: {
    width: "100%",
    backgroundColor: colors.primaryDark,
    borderRadius: 12,
    paddingVertical: isWeb ? 12 : 11,
    paddingHorizontal: 10,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 6,
  },

  primaryButtonText: {
    color: colors.white,
    fontSize: isWeb ? 13 : 11,
    fontWeight: "900",
  },

  secondaryButton: {
    flexGrow: 1,
    width: isWeb ? undefined : "48%",
    minWidth: isWeb ? 140 : 0,
    backgroundColor: colors.primarySoft,
    borderRadius: 12,
    paddingVertical: isWeb ? 12 : 11,
    paddingHorizontal: 10,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 6,
  },

  secondaryButtonText: {
    color: colors.primaryDark,
    fontSize: isWeb ? 13 : 11,
    fontWeight: "900",
  },

  dangerButton: {
    flexGrow: 1,
    width: isWeb ? undefined : "48%",
    minWidth: isWeb ? 140 : 0,
    backgroundColor: "#FEF2F2",
    borderRadius: 12,
    paddingVertical: isWeb ? 12 : 11,
    paddingHorizontal: 10,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 6,
  },

  dangerButtonText: {
    color: "#B91C1C",
    fontSize: isWeb ? 13 : 11,
    fontWeight: "900",
  },

  savedCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 13,
    marginBottom: 14,
  },

  savedTitle: {
    fontSize: isWeb ? 15 : 13,
    fontWeight: "900",
    color: colors.text,
    marginBottom: 10,
  },

  savedList: {
    gap: 8,
  },

  savedItem: {
    width: isWeb ? 170 : 150,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    padding: 11,
  },

  savedItemActive: {
    backgroundColor: colors.primaryDark,
    borderColor: colors.primaryDark,
  },

  savedItemTitle: {
    fontSize: isWeb ? 13 : 11,
    fontWeight: "900",
    color: colors.text,
    marginBottom: 4,
  },

  savedItemTitleActive: {
    color: colors.white,
  },

  savedItemSubtitle: {
    fontSize: isWeb ? 12 : 10,
    color: colors.mutedText,
    fontWeight: "700",
  },

  savedItemSubtitleActive: {
    color: colors.white,
    opacity: 0.9,
  },

  sectionCard: {
    backgroundColor: colors.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    padding: isWeb ? 16 : 13,
    marginBottom: 14,
  },

  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
    gap: 10,
  },

  sectionHeaderLeft: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },

  sectionIcon: {
    width: isWeb ? 38 : 34,
    height: isWeb ? 38 : 34,
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
    fontSize: isWeb ? 17 : 15,
    color: colors.text,
    fontWeight: "900",
  },

  sectionSubtitle: {
    fontSize: isWeb ? 12 : 10,
    color: colors.mutedText,
    marginTop: 3,
  },

  sectionEditButton: {
    width: isWeb ? 36 : 32,
    height: isWeb ? 36 : 32,
    borderRadius: 10,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },

  resultRow: {
    paddingVertical: isWeb ? 11 : 9,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSoft,
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
  },

  resultLabel: {
    flex: 1,
    fontSize: isWeb ? 13 : 11,
    color: colors.mutedText,
    fontWeight: "800",
  },

  resultValue: {
    flexShrink: 1,
    fontSize: isWeb ? 13 : 11,
    color: colors.text,
    fontWeight: "800",
    textAlign: "right",
  },

  resultValueStrong: {
    fontSize: isWeb ? 14 : 12,
    fontWeight: "900",
    color: colors.primaryDark,
  },

  bottomBar: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: isWeb ? 72 : 66,
    paddingTop: 6,
    paddingBottom: isWeb ? 10 : 8,
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    zIndex: 15,
    elevation: 8,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: -4 },
  },

  bottomItem: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  bottomText: {
    fontSize: isWeb ? 12 : 10,
    color: colors.mutedText,
    fontWeight: "800",
    marginTop: 2,
  },

  bottomTextActive: {
    color: colors.primaryDark,
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.55)",
    justifyContent: "center",
    alignItems: "center",
    padding: 18,
  },

  modalCard: {
    width: "100%",
    maxWidth: 520,
    maxHeight: "86%",
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: isWeb ? 20 : 16,
    borderWidth: 1,
    borderColor: colors.border,
  },

  modalCardSmall: {
    width: "100%",
    maxWidth: 420,
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: isWeb ? 20 : 16,
    borderWidth: 1,
    borderColor: colors.border,
  },

  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
    marginBottom: 14,
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

  closeButton: {
    width: 30,
    height: 30,
    borderRadius: 999,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },

  modalScroll: {
    maxHeight: isWeb ? 430 : 390,
  },

  modalActions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 14,
  },

  modalCancelButton: {
    flex: 1,
    backgroundColor: colors.primarySoft,
    padding: isWeb ? 12 : 10,
    borderRadius: 11,
    alignItems: "center",
  },

  modalCancelText: {
    color: colors.primaryDark,
    fontSize: isWeb ? 13 : 11,
    fontWeight: "900",
  },

  modalSaveButton: {
    flex: 1,
    backgroundColor: colors.primaryDark,
    padding: isWeb ? 12 : 10,
    borderRadius: 11,
    alignItems: "center",
  },

  modalSaveText: {
    color: colors.white,
    fontSize: isWeb ? 13 : 11,
    fontWeight: "900",
  },

  inputGroup: {
    marginBottom: 11,
  },

  inputLabel: {
    fontSize: isWeb ? 13 : 11,
    color: colors.mutedText,
    fontWeight: "800",
    marginBottom: 5,
  },

  input: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 11,
    paddingVertical: isWeb ? 11 : 9,
    paddingHorizontal: 11,
    fontSize: isWeb ? 14 : 12,
    color: colors.text,
  },
});
