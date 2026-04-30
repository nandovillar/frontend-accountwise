import { supabase } from "@/src/lib/supabase";
import { router } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
export default function SettingsScreen() {
  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();

    if (error) {
      alert(error.message);
      return;
    }

    router.replace("/login");
  };
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Ajustes</Text>
      <Text style={styles.subtitle}>
        Aquí irá la información del usuario y el cierre de sesión.
      </Text>
      <Pressable style={styles.logoutButton} onPress={handleLogout}>
        <Text style={styles.logoutButtonText}>Cerrar sesión</Text>
      </Pressable>
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
  logoutButton: {
    width: "100%",
    maxWidth: 420,
    backgroundColor: "#DC2626",
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: "center",
    marginTop: 24,
  },
  logoutButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
});
