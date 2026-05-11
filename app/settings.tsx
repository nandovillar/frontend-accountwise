import { Ionicons } from "@expo/vector-icons";
import { Header } from "@react-navigation/elements";
import { router } from "expo-router";
import { useEffect, useState } from "react";

import { supabase } from "@/src/lib/supabase";
import { colors } from "@/src/theme/colors";

import {
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

export default function SettingsScreen() {
  const [email, setEmail] = useState("");
  const [userId, setUserId] = useState("");

  const loadUser = async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.user) {
      router.replace("/login");
      return;
    }

    setEmail(session.user.email || "");
    setUserId(session.user.id || "");
  };

  const handleLogout = async () => {
    const executeLogout = async () => {
      const { error } = await supabase.auth.signOut();

      if (error) {
        Alert.alert("Error", error.message);
        return;
      }

      router.replace("/login");
    };

    if (Platform.OS === "web") {
      const confirmed = window.confirm("¿Quieres cerrar sesión?");
      if (confirmed) await executeLogout();
      return;
    }

    Alert.alert("Cerrar sesión", "¿Quieres cerrar sesión?", [
      { text: "Cancelar", style: "cancel" },
      { text: "Cerrar sesión", style: "destructive", onPress: executeLogout },
    ]);
  };

  useEffect(() => {
    loadUser();
  }, []);

  return (
    <View style={styles.screen}>
      <Header title="Ajustes" />

      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.content}>
          <View style={styles.heroCard}>
            <View style={styles.heroIconBox}>
              <Ionicons name="person-outline" size={28} color={colors.white} />
            </View>

            <View style={styles.heroTextBlock}>
              <Text style={styles.heroLabel}>Cuenta activa</Text>

              <Text
                style={styles.heroEmail}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.75}
              >
                {email || "Usuario"}
              </Text>

              <Text style={styles.heroSubtitle}>
                Datos guardados por usuario
              </Text>
            </View>
          </View>

          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Cuenta</Text>
            <Text style={styles.sectionSubtitle}>
              Información básica de tu sesión actual.
            </Text>

            <View style={styles.infoBox}>
              <InfoRow label="Email" value={email || "No disponible"} />
              <InfoRow
                label="Usuario"
                value={userId ? `${userId.slice(0, 8)}...` : "No disponible"}
              />
            </View>
          </View>

          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Accesos rápidos</Text>
            <Text style={styles.sectionSubtitle}>
              Vuelve a las secciones principales de la app.
            </Text>

            <View style={styles.actionsGrid}>
              <Pressable
                style={styles.actionButton}
                onPress={() => router.push("/")}
              >
                <Ionicons
                  name="home-outline"
                  size={20}
                  color={colors.primaryDark}
                />
                <Text style={styles.actionButtonText}>Inicio</Text>
              </Pressable>

              <Pressable
                style={styles.actionButton}
                onPress={() => router.push("/expenses")}
              >
                <Ionicons
                  name="card-outline"
                  size={20}
                  color={colors.primaryDark}
                />
                <Text style={styles.actionButtonText}>Gastos</Text>
              </Pressable>

              <Pressable
                style={styles.actionButton}
                onPress={() => router.push("/savings")}
              >
                <Ionicons
                  name="wallet-outline"
                  size={20}
                  color={colors.primaryDark}
                />
                <Text style={styles.actionButtonText}>Ahorros</Text>
              </Pressable>

              <Pressable
                style={styles.actionButton}
                onPress={() => router.push("/HomePurchase")}
              >
                <Ionicons
                  name="home-outline"
                  size={20}
                  color={colors.primaryDark}
                />
                <Text style={styles.actionButtonText}>Casa</Text>
              </Pressable>
            </View>
          </View>

          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Seguridad</Text>
            <Text style={styles.sectionSubtitle}>
              Puedes cerrar la sesión de este dispositivo.
            </Text>

            <Pressable style={styles.logoutButton} onPress={handleLogout}>
              <Ionicons name="log-out-outline" size={20} color="#B91C1C" />
              <Text style={styles.logoutButtonText}>Cerrar sesión</Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>

      <Text
        style={styles.infoValue}
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.75}
      >
        {value}
      </Text>
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
    paddingBottom: 36,
    alignItems: "center",
  },

  content: {
    width: "100%",
    maxWidth: 940,
  },

  heroCard: {
    backgroundColor: colors.primaryDark,
    borderRadius: 20,
    padding: isWeb ? 22 : 18,
    marginBottom: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },

  heroIconBox: {
    width: isWeb ? 56 : 48,
    height: isWeb ? 56 : 48,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.16)",
    alignItems: "center",
    justifyContent: "center",
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

  heroEmail: {
    fontSize: isWeb ? 24 : 19,
    color: colors.white,
    fontWeight: "900",
  },

  heroSubtitle: {
    fontSize: isWeb ? 13 : 11,
    color: colors.white,
    opacity: 0.9,
    marginTop: 4,
  },

  sectionCard: {
    backgroundColor: colors.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    padding: isWeb ? 16 : 13,
    marginBottom: 14,
  },

  sectionTitle: {
    fontSize: isWeb ? 18 : 16,
    fontWeight: "900",
    color: colors.text,
  },

  sectionSubtitle: {
    fontSize: isWeb ? 12 : 10,
    color: colors.mutedText,
    marginTop: 3,
    marginBottom: 12,
  },

  infoBox: {
    borderWidth: 1,
    borderColor: colors.borderSoft,
    borderRadius: 14,
    overflow: "hidden",
  },

  infoRow: {
    paddingVertical: isWeb ? 12 : 10,
    paddingHorizontal: isWeb ? 12 : 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSoft,
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
  },

  infoLabel: {
    fontSize: isWeb ? 13 : 11,
    color: colors.mutedText,
    fontWeight: "800",
  },

  infoValue: {
    flex: 1,
    textAlign: "right",
    fontSize: isWeb ? 13 : 11,
    color: colors.text,
    fontWeight: "800",
  },

  actionsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },

  actionButton: {
    flexGrow: 1,
    minWidth: isWeb ? 180 : "47%",
    backgroundColor: colors.primarySoft,
    borderRadius: 14,
    paddingVertical: isWeb ? 14 : 12,
    paddingHorizontal: 12,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },

  actionButtonText: {
    color: colors.primaryDark,
    fontSize: isWeb ? 13 : 11,
    fontWeight: "900",
  },

  logoutButton: {
    backgroundColor: "#FEF2F2",
    borderRadius: 14,
    paddingVertical: isWeb ? 14 : 12,
    paddingHorizontal: 12,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },

  logoutButtonText: {
    color: "#B91C1C",
    fontSize: isWeb ? 13 : 11,
    fontWeight: "900",
  },
});
