import { useState } from "react";
import { ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

export default function HomePurchaseScreen() {
  // -----------------------------
  // STATE
  // -----------------------------
  const [propertyPrice, setPropertyPrice] = useState("");
  const [agencyPercent, setAgencyPercent] = useState("3");
  const [taxPercent, setTaxPercent] = useState("6");
  const [financialFee, setFinancialFee] = useState("5000");
  const [notaryPercent, setNotaryPercent] = useState("1");
  const [downPayment, setDownPayment] = useState("90000");
  const [pendingNotary, setPendingNotary] = useState("500");

  const [years, setYears] = useState("30");
  const [tin, setTin] = useState("3.40");
  const [bonus, setBonus] = useState("0.85"); // suma de bonificaciones
  const [salaryBonus, setSalaryBonus] = useState("0");
  const [lifeInsurance, setLifeInsurance] = useState("0");
  const [homeInsurance, setHomeInsurance] = useState("0");

  // -----------------------------
  // CALCULATIONS
  // -----------------------------
  const price = Number(propertyPrice) || 0;
  const agency = (price * Number(agencyPercent || 0)) / 100;
  const tax = (price * Number(taxPercent || 0)) / 100;
  const notary = (price * Number(notaryPercent || 0)) / 100;
  const financial = Number(financialFee || 0);

  const totalProperty = price + agency + tax + financial + notary;

  const down = Number(downPayment || 0);
  const mortgage = totalProperty - down;

  const coveredPercent = totalProperty > 0 ? (down / totalProperty) * 100 : 0;
  const remainingPercent = 100 - coveredPercent;

  // Mortgage formula
  const n = Number(years || 0) * 12;

  const bonusTotal =
    Number(bonus || 0) +
    Number(salaryBonus || 0) +
    Number(lifeInsurance || 0) +
    Number(homeInsurance || 0);

  const annualRate = Number(tin || 0) - bonusTotal;
  const monthlyRate = annualRate / 100 / 12;

  let monthlyPayment = 0;

  if (monthlyRate > 0 && n > 0) {
    monthlyPayment =
      (mortgage * (monthlyRate * Math.pow(1 + monthlyRate, n))) /
      (Math.pow(1 + monthlyRate, n) - 1);
  }

  // -----------------------------
  // UI
  // -----------------------------
  return (
    <ScrollView contentContainerStyle={styles.container}>
      {/* ----------------------------- */}
      {/* TARJETA 1: COSTES DEL INMUEBLE */}
      {/* ----------------------------- */}
      <View style={styles.card}>
        <Text style={styles.title}>🏠 Costes del inmueble</Text>

        <Input
          label="Precio del inmueble (€)"
          value={propertyPrice}
          onChange={setPropertyPrice}
        />
        <Input
          label="Agencia (%)"
          value={agencyPercent}
          onChange={setAgencyPercent}
        />
        <Input
          label="ITP / IVA (%)"
          value={taxPercent}
          onChange={setTaxPercent}
        />
        <Input
          label="Comisión financiera (€)"
          value={financialFee}
          onChange={setFinancialFee}
        />
        <Input
          label="Notaría + Registro (%)"
          value={notaryPercent}
          onChange={setNotaryPercent}
        />

        <Text style={styles.result}>
          Total inmueble: {totalProperty.toFixed(2)} €
        </Text>

        <Input
          label="Entrada (€)"
          value={downPayment}
          onChange={setDownPayment}
        />

        <Text style={styles.result}>Hipoteca: {mortgage.toFixed(2)} €</Text>
        <Text style={styles.result}>
          % cubierto: {coveredPercent.toFixed(2)}%
        </Text>
        <Text style={styles.result}>
          % restante: {remainingPercent.toFixed(2)}%
        </Text>

        <Input
          label="Notaría pendiente (€)"
          value={pendingNotary}
          onChange={setPendingNotary}
        />
      </View>

      {/* ----------------------------- */}
      {/* TARJETA 2: CÁLCULO HIPOTECA */}
      {/* ----------------------------- */}
      <View style={styles.card}>
        <Text style={styles.title}>💰 Cálculo de hipoteca</Text>

        <Text style={styles.result}>Entrada: {down.toFixed(2)} €</Text>
        <Text style={styles.result}>Hipoteca: {mortgage.toFixed(2)} €</Text>
        <Text style={styles.result}>
          % cubierto: {coveredPercent.toFixed(2)}%
        </Text>
        <Text style={styles.result}>
          % restante: {remainingPercent.toFixed(2)}%
        </Text>
      </View>

      {/* ----------------------------- */}
      {/* TARJETA 3: BANCO */}
      {/* ----------------------------- */}
      <View style={styles.card}>
        <Text style={styles.title}>🏦 Banco</Text>

        <Input label="Años" value={years} onChange={setYears} />
        <Input label="TIN (%)" value={tin} onChange={setTin} />
        <Input
          label="Bonificación total (%)"
          value={bonus}
          onChange={setBonus}
        />

        <Text style={styles.result}>
          Cuota mensual: {monthlyPayment.toFixed(2)} €
        </Text>
      </View>
    </ScrollView>
  );
}

// -----------------------------
// INPUT COMPONENT
// -----------------------------
function Input({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (text: string) => void;
}) {
  return (
    <View style={{ marginBottom: 8 }}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChange}
        keyboardType="numeric"
      />
    </View>
  );
}

// -----------------------------
// STYLES
// -----------------------------
const styles = StyleSheet.create({
  container: {
    padding: 12,
    backgroundColor: "#F4F7FA",
  },
  card: {
    backgroundColor: "#fff",
    padding: 12,
    borderRadius: 12,
    marginBottom: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 8,
  },
  label: {
    fontSize: 13,
    marginBottom: 2,
    color: "#374151",
  },
  input: {
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 8,
    padding: 8,
  },
  result: {
    fontSize: 14,
    fontWeight: "600",
    marginTop: 4,
  },
  settingsButton: {
    position: "absolute",
    top: 24,
    right: 24,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  settingsButtonText: {
    fontSize: 22,
  },
});
