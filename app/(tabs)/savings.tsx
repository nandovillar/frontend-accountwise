import DateTimePicker from "@react-native-community/datetimepicker";
import { useMemo, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";

export default function SavingsScreen() {
  const [showSimulator, setShowSimulator] = useState(false);
  const [savings, setSavings] = useState<any[]>([]);

  // INPUTS
  const [goal, setGoal] = useState("");
  const [monthly, setMonthly] = useState("");
  const [current, setCurrent] = useState("");

  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(new Date());

  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);

  // CALCULO
  const result = useMemo(() => {
    const m = Number(monthly) || 0;
    const c = Number(current) || 0;
    const g = Number(goal) || 0;

    let months =
      (endDate.getFullYear() - startDate.getFullYear()) * 12 +
      (endDate.getMonth() - startDate.getMonth());

    if (months < 0) months = 0;

    const totalSaved = m * (months + 1) + c;
    const remaining = g ? g - totalSaved : 0;

    return { months, totalSaved, remaining };
  }, [monthly, current, goal, startDate, endDate]);

  // GUARDAR
  const saveSimulation = () => {
    const newSaving = {
      id: Date.now().toString(),
      name: `Ahorro ${goal || result.totalSaved.toFixed(0)}€`,
      monthly_amount: monthly,
      total: result.totalSaved,
    };

    setSavings((prev) => [newSaving, ...prev]);
    setShowSimulator(false);
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {/* BOTÓN */}
      <Pressable
        style={styles.expandButton}
        onPress={() => setShowSimulator(!showSimulator)}
      >
        <Text style={styles.expandText}>
          {showSimulator ? "Cerrar simulador" : "+ Simular ahorro"}
        </Text>
      </Pressable>

      {/* SIMULADOR */}
      {showSimulator && (
        <View style={styles.card}>
          <Text style={styles.title}>Simulador de ahorro</Text>

          {/* OBJETIVO */}
          <TextInput
            placeholder="Objetivo (€)"
            keyboardType="numeric"
            style={styles.input}
            value={goal}
            onChangeText={setGoal}
          />

          {/* FECHAS */}
          <Pressable
            style={styles.dateButton}
            onPress={() => setShowStartPicker(true)}
          >
            <Text style={styles.dateText}>
              Inicio: {startDate.toLocaleDateString()}
            </Text>
          </Pressable>

          <Pressable
            style={styles.dateButton}
            onPress={() => setShowEndPicker(true)}
          >
            <Text style={styles.dateText}>
              Fin: {endDate.toLocaleDateString()}
            </Text>
          </Pressable>

          {showStartPicker && (
            <DateTimePicker
              value={startDate}
              mode="date"
              display="default"
              onChange={(event, date) => {
                setShowStartPicker(false);
                if (date) setStartDate(date);
              }}
            />
          )}

          {showEndPicker && (
            <DateTimePicker
              value={endDate}
              mode="date"
              display="default"
              onChange={(event, date) => {
                setShowEndPicker(false);
                if (date) setEndDate(date);
              }}
            />
          )}

          {/* INPUTS */}
          <TextInput
            placeholder="Importe mensual (€)"
            keyboardType="numeric"
            style={styles.input}
            value={monthly}
            onChangeText={setMonthly}
          />

          <TextInput
            placeholder="Ahorro actual (€)"
            keyboardType="numeric"
            style={styles.input}
            value={current}
            onChangeText={setCurrent}
          />

          {/* RESULTADOS */}
          <View style={styles.resultBox}>
            <Text style={styles.resultText}>Meses: {result.months}</Text>

            <Text style={styles.resultText}>
              Deberías tener: {result.totalSaved.toFixed(2)} €
            </Text>

            <Text style={styles.resultText}>Objetivo: {goal || 0} €</Text>

            {goal ? (
              <Text
                style={[
                  styles.resultText,
                  {
                    color: result.remaining > 0 ? "#DC2626" : "#16A34A",
                    fontWeight: "700",
                  },
                ]}
              >
                {result.remaining > 0
                  ? `Te faltan ${result.remaining.toFixed(2)} €`
                  : "✔ Objetivo alcanzado"}
              </Text>
            ) : null}
          </View>

          {/* GUARDAR */}
          <Pressable style={styles.saveButton} onPress={saveSimulation}>
            <Text style={styles.saveText}>
              Guardar como "Ahorro {goal || "nuevo"}"
            </Text>
          </Pressable>
        </View>
      )}

      {/* LISTA */}
      <Text style={styles.sectionTitle}>Ahorros</Text>

      {savings.length === 0 ? (
        <Text style={styles.emptyText}>No tienes ahorros todavía</Text>
      ) : (
        savings.map((s) => (
          <View key={s.id} style={styles.savingCard}>
            <Text style={styles.savingTitle}>{s.name}</Text>
            <Text style={styles.savingInfo}>
              {s.monthly_amount}€/mes · Total: {s.total.toFixed(0)}€
            </Text>
          </View>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: "#EEF2F7",
  },

  expandButton: {
    backgroundColor: "#3B82F6",
    padding: 14,
    borderRadius: 12,
    marginBottom: 12,
  },

  expandText: {
    color: "#fff",
    textAlign: "center",
    fontWeight: "700",
  },

  card: {
    backgroundColor: "#FFFFFF",
    padding: 18,
    borderRadius: 20,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },

  title: {
    fontSize: 20,
    fontWeight: "800",
    marginBottom: 12,
  },

  input: {
    backgroundColor: "#F3F4F6",
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
  },

  dateButton: {
    backgroundColor: "#E0E7FF",
    padding: 12,
    borderRadius: 12,
    marginBottom: 10,
  },

  dateText: {
    color: "#1E3A8A",
    fontWeight: "600",
  },

  resultBox: {
    marginTop: 10,
    padding: 14,
    backgroundColor: "#F3F4F6",
    borderRadius: 14,
  },

  resultText: {
    fontSize: 14,
    marginBottom: 4,
  },

  saveButton: {
    marginTop: 12,
    backgroundColor: "#16A34A",
    padding: 14,
    borderRadius: 12,
  },

  saveText: {
    color: "#fff",
    textAlign: "center",
    fontWeight: "700",
  },

  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 8,
  },

  savingCard: {
    backgroundColor: "#fff",
    padding: 12,
    borderRadius: 12,
    marginBottom: 10,
  },

  savingTitle: {
    fontWeight: "700",
  },

  savingInfo: {
    color: "#6B7280",
  },

  emptyText: {
    color: "#6B7280",
  },
});
