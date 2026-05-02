import { supabase } from "@/src/lib/supabase";
import { Header } from "@react-navigation/elements";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

export default function SavingsScreen() {
  const [showSimulator, setShowSimulator] = useState(false);
  const [savings, setSavings] = useState<any[]>([]);
  const [selectedSaving, setSelectedSaving] = useState<any | null>(null);

  const [name, setName] = useState("");
  const [goal, setGoal] = useState("");
  const [monthly, setMonthly] = useState("");
  const [contributed, setContributed] = useState("");
  const [borrowed, setBorrowed] = useState("");

  const [startDate, setStartDate] = useState("2026-05-01");
  const [endDate, setEndDate] = useState("2026-12-01");

  const [editingId, setEditingId] = useState<string | null>(null);

  // -----------------------------------------------------
  // FUNCIÓN ÚNICA DE CÁLCULO
  // -----------------------------------------------------
  const calculateSaving = (
    startDate: string,
    endDate: string,
    monthly: number,
    contributed: number,
    goal: number,
  ) => {
    const now = new Date();
    const start = new Date(startDate);
    const end = new Date(endDate);

    const totalMonths =
      (end.getFullYear() - start.getFullYear()) * 12 +
      (end.getMonth() - start.getMonth());

    const passedMonths =
      now < start
        ? 0
        : Math.min(
            totalMonths,
            (now.getFullYear() - start.getFullYear()) * 12 +
              (now.getMonth() - start.getMonth()),
          );

    const remainingMonths = totalMonths - passedMonths;

    const ahorradoActual = contributed + passedMonths * monthly;

    const ahorroMensual = (goal - ahorradoActual) / totalMonths;

    const pendiente = goal - ahorradoActual;

    const completed = ahorradoActual >= goal;

    const pronosticoAhorrado = contributed + totalMonths * monthly;

    const objetivo = goal;

    return {
      totalMonths,
      passedMonths,
      remainingMonths,
      ahorradoActual,
      ahorroMensual,
      pendiente,
      completed,
      pronosticoAhorrado,
      objetivo,
    };
  };

  // -----------------------------------------------------
  // SUPABASE
  // -----------------------------------------------------

  const loadSavings = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from("savings")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    setSavings(data || []);
  };

  const saveSaving = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const payload = {
      user_id: user.id,
      name: name || "Ahorro sin nombre",
      goal: Number(goal),
      start_date: startDate,
      end_date: endDate,
      monthly_amount: Number(monthly),
      contributed: Number(contributed),
      borrowed,
    };

    if (editingId) {
      await supabase.from("savings").update(payload).eq("id", editingId);
    } else {
      await supabase.from("savings").insert([payload]);
    }

    await loadSavings();
    resetForm();
    setShowSimulator(false);
  };

  // 🔥 FUNCIÓN FINAL DE BORRADO (TU VERSIÓN)
  const deleteSaving = async (item: any) => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    await supabase.from("savings").delete().eq("id", item.id);

    await supabase
      .from("savings")
      .delete()
      .eq("title", item.name)
      .eq("user_id", user?.id);

    loadSavings();
    console.log("Ahorro eliminado:");
  };

  const editSaving = (item: any) => {
    setEditingId(item.id);
    setName(item.name);
    setGoal(String(item.goal));
    setMonthly(String(item.monthly_amount));
    setContributed(String(item.contributed));
    setBorrowed(item.borrowed || "");
    setStartDate(item.start_date);
    setEndDate(item.end_date);
    setShowSimulator(true); // ← NO usa el botón azul
  };

  const resetForm = () => {
    setEditingId(null);
    setName("");
    setGoal("");
    setMonthly("");
    setContributed("");
    setBorrowed("");
    setStartDate("2026-05-01");
    setEndDate("2026-12-01");
  };

  useEffect(() => {
    const { data: subscription } = supabase.auth.onAuthStateChange(
      async (_, session) => {
        if (session?.user) loadSavings();
      },
    );

    return () => subscription.subscription.unsubscribe();
  }, []);

  // -----------------------------------------------------
  // UI
  // -----------------------------------------------------

  return (
    <View style={{ flex: 1 }}>
      <Header title="Ahorro" />
      <Pressable
        style={styles.settingsButton}
        onPress={() => router.push("/settings")}
      >
        <Text style={styles.settingsButtonText}>☰</Text>
      </Pressable>

      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
      >
        {/* VISTA SOLO INFORMACIÓN */}
        {selectedSaving && (
          <View style={styles.detailCard}>
            <Text style={styles.detailTitle}>{selectedSaving.name}</Text>

            {(() => {
              const s = calculateSaving(
                selectedSaving.start_date,
                selectedSaving.end_date,
                selectedSaving.monthly_amount,
                selectedSaving.contributed,
                selectedSaving.goal,
              );

              return (
                <>
                  <Text>Objetivo: {s.objetivo} €</Text>
                  <Text>Meses totales: {s.totalMonths}</Text>
                  <Text>Meses pasados: {s.passedMonths}</Text>
                  <Text>Meses restantes: {s.remainingMonths}</Text>
                  <Text>
                    Ahorro necesario mensual: {s.ahorroMensual.toFixed(2)} €
                  </Text>
                  <Text>
                    Pronostico ahorrado: {s.pronosticoAhorrado.toFixed(2)} €
                  </Text>
                  <Text>Ahorro actual: {s.ahorradoActual.toFixed(2)} €</Text>
                  <Text>Pendiente: {s.pendiente.toFixed(2)} €</Text>
                  <Text>
                    Estado: {s.completed ? "✔️ Cumplido" : "⌛ En progreso"}
                  </Text>
                </>
              );
            })()}

            <Pressable
              style={[
                styles.button,
                { backgroundColor: "#6B7280", marginTop: 20 },
              ]}
              onPress={() => setSelectedSaving(null)}
            >
              <Text style={styles.buttonText}>Cerrar</Text>
            </Pressable>
          </View>
        )}

        {/* SIMULADOR */}
        {showSimulator && (
          <View style={styles.card}>
            <Text style={styles.title}>
              {editingId ? "Editar ahorro" : "Simulador de ahorro"}
            </Text>

            <TextInput
              placeholder="Nombre del ahorro"
              style={styles.input}
              value={name}
              onChangeText={setName}
            />

            <TextInput
              placeholder="Objetivo (€)"
              style={styles.input}
              keyboardType="numeric"
              value={goal}
              onChangeText={setGoal}
            />

            {Platform.OS === "web" ? (
              <>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  style={styles.webDate}
                />
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  style={styles.webDate}
                />
              </>
            ) : (
              <>
                <TextInput
                  style={styles.input}
                  value={startDate}
                  onChangeText={setStartDate}
                  placeholder="YYYY-MM-DD"
                />
                <TextInput
                  style={styles.input}
                  value={endDate}
                  onChangeText={setEndDate}
                  placeholder="YYYY-MM-DD"
                />
              </>
            )}

            <TextInput
              placeholder="Ahorro mensual (€)"
              style={styles.input}
              keyboardType="numeric"
              value={monthly}
              onChangeText={setMonthly}
            />

            <TextInput
              placeholder="Aportado (€)"
              style={styles.input}
              keyboardType="numeric"
              value={contributed}
              onChangeText={setContributed}
            />

            <TextInput
              placeholder="Prestado"
              style={styles.input}
              value={borrowed}
              onChangeText={setBorrowed}
            />

            {(() => {
              const s = calculateSaving(
                startDate,
                endDate,
                Number(monthly),
                Number(contributed),
                Number(goal),
              );

              return (
                <View style={styles.resultBox}>
                  <Text>Objetivo: {s.objetivo} €</Text>
                  <Text>Meses totales: {s.totalMonths}</Text>
                  <Text>Meses pasados: {s.passedMonths}</Text>
                  <Text>Meses restantes: {s.remainingMonths}</Text>
                  <Text>
                    Ahorro necesario mensual: {s.ahorroMensual.toFixed(2)} €
                  </Text>
                  <Text>
                    Pronostico ahorrado: {s.pronosticoAhorrado.toFixed(2)} €
                  </Text>
                  <Text>Ahorro actual: {s.ahorradoActual.toFixed(2)} €</Text>
                  <Text>Pendiente: {s.pendiente.toFixed(2)} €</Text>
                  <Text>
                    Estado: {s.completed ? "✔️ Cumplido" : "⌛ En progreso"}
                  </Text>
                </View>
              );
            })()}

            <Pressable style={styles.button} onPress={saveSaving}>
              <Text style={styles.buttonText}>
                {editingId ? "Guardar cambios" : "Guardar ahorro"}
              </Text>
            </Pressable>
            <Pressable
              style={[
                styles.button,
                { backgroundColor: "#6B7280", marginTop: 10 },
              ]}
              onPress={() => {
                resetForm();
                setShowSimulator(false);
              }}
            >
              <Text style={styles.buttonText}>Cancelar</Text>
            </Pressable>
          </View>
        )}

        {/* LISTA DE AHORROS */}

        {savings.length === 0 ? (
          <Text style={styles.emptyText}>No tienes ahorros todavía</Text>
        ) : (
          savings.map((item) => {
            const s = calculateSaving(
              item.start_date,
              item.end_date,
              item.monthly_amount,
              item.contributed,
              item.goal,
            );

            return (
              <View key={item.id} style={styles.savingRow}>
                <Text style={styles.savingName}>{item.name}</Text>

                <View style={styles.infoLine}>
                  <Text style={styles.infoText}>Objetivo: {item.goal}€</Text>
                  <Text style={styles.infoText}>
                    Mensual: {item.monthly_amount}€
                  </Text>
                  <Text style={styles.infoText}>
                    Ahorro: {s.ahorradoActual.toFixed(2)}€
                  </Text>
                  <Text style={styles.infoText}>
                    Pendiente: {s.pendiente.toFixed(2)}€
                  </Text>
                  <Text style={styles.infoText}>
                    Estado: {s.completed ? "✔️" : "⌛"}
                  </Text>
                </View>

                <View style={styles.actionsRowRight}>
                  <Pressable
                    style={styles.iconButton}
                    onPress={() => setSelectedSaving(item)}
                  >
                    <Text style={styles.icon}>👁</Text>
                  </Pressable>

                  <Pressable
                    style={styles.iconButton}
                    onPress={() => editSaving(item)}
                  >
                    <Text style={styles.icon}>✏️</Text>
                  </Pressable>

                  <Pressable
                    style={styles.iconButton}
                    onPress={() => deleteSaving(item)}
                  >
                    <Text style={styles.icon}>🗑</Text>
                  </Pressable>
                </View>
              </View>
            );
          })
        )}
        {/* BOTÓN SIMULAR (SOLO CREAR) */}
        <Pressable
          style={styles.expandButton}
          onPress={() => {
            resetForm();
            setEditingId(null); // ← evita modo edición
            setShowSimulator(true);
          }}
        >
          <Text style={styles.expandText}>Simular ahorro</Text>
        </Pressable>
        <Pressable
          style={styles.expandButton}
          onPress={() => router.push("/HomePurchase")}
        >
          <Text style={styles.expandText}>Simulador de casa</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

// -----------------------------------------------------
// ESTILOS
// -----------------------------------------------------

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: "#F4F7FA",
  },

  expandButton: {
    backgroundColor: "#2563EB",
    padding: 14,
    borderRadius: 10,
    marginBottom: 15,
  },

  expandText: {
    color: "#fff",
    textAlign: "center",
    fontWeight: "600",
  },

  card: {
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 14,
    marginBottom: 20,
  },

  detailCard: {
    backgroundColor: "#fff",
    padding: 20,
    borderRadius: 14,
    marginBottom: 20,
  },

  detailTitle: {
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 10,
  },

  title: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 10,
  },

  input: {
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 10,
    padding: 10,
    marginTop: 8,
  },

  webDate: {
    padding: 10,
    marginTop: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },

  resultBox: {
    marginTop: 12,
    padding: 12,
    backgroundColor: "#F3F4F6",
    borderRadius: 10,
  },

  button: {
    backgroundColor: "#16A34A",
    padding: 14,
    borderRadius: 10,
    marginTop: 12,
    alignItems: "center",
  },

  buttonText: {
    color: "#fff",
    fontWeight: "700",
  },

  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 10,
  },

  emptyText: {
    color: "#6B7280",
  },

  savingRow: {
    backgroundColor: "#fff",
    padding: 12,
    borderRadius: 10,
    marginBottom: 10,
    zIndex: 10,
    elevation: 3,
    pointerEvents: "auto",
  },

  savingName: {
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 4,
  },

  infoLine: {
    flexDirection: "row",
    flexWrap: "wrap",
    columnGap: 12,
    rowGap: 4,
    alignItems: "center",
  },

  infoText: {
    fontSize: 13,
    color: "#374151",
  },

  actionsRowRight: {
    marginTop: 6,
    flexDirection: "row",
    justifyContent: "flex-end",
    columnGap: 8,
    flexShrink: 1,
    zIndex: 20,
  },

  iconButton: {
    padding: 6,
    backgroundColor: "#E5E7EB",
    borderRadius: 8,
    zIndex: 30,
    elevation: 5,
  },

  icon: {
    fontSize: 16,
  },

  red: {
    color: "#DC2626",
    fontWeight: "600",
  },

  green: {
    color: "#16A34A",
    fontWeight: "600",
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
    marginBottom: 25,
    fontSize: 22,
  },
});
