import { router } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";

export default function SavingsScreen() {
  return (
    <View style={styles.container}>
      <Pressable
        style={styles.settingsButton}
        onPress={() => router.push("/settings")}
      >
        <Text style={styles.settingsButtonText}>⚙️</Text>
      </Pressable>
      <Text style={styles.title}>Ahorros</Text>
      <Text style={styles.subtitle}>
        Aquí añadiremos los objetivos de ahorro del usuario.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F4F7FA",
    padding: 24,
    justifyContent: "center",
  },
  title: {
    fontSize: 32,
    fontWeight: "800",
    color: "#111827",
    marginBottom: 12,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 16,
    color: "#6B7280",
    textAlign: "center",
    lineHeight: 24,
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
