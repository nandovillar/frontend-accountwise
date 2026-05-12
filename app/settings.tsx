import { Ionicons } from "@expo/vector-icons";
import { Header } from "@react-navigation/elements";
import { router } from "expo-router";
import { useEffect, useMemo, useState } from "react";

import { AppBottomMenu } from "@/src/components/AppBottomMenu";
import { supabase } from "@/src/lib/supabase";
import { colors } from "@/src/theme/colors";
import { createCommonStyles } from "@/src/theme/commonStyles";

import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";

export default function SettingsScreen() {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 768;

  const commonStyles = useMemo(
    () => createCommonStyles(isDesktop),
    [isDesktop],
  );

  const styles = useMemo(() => createStyles(isDesktop), [isDesktop]);

  const [email, setEmail] = useState("");

  const loadUser = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    setEmail(user?.email || "");
  };

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();

    if (error) {
      Alert.alert("Error", error.message);
      return;
    }

    router.replace("/login");
  };

  useEffect(() => {
    loadUser();
  }, []);

  return (
    <View style={commonStyles.screen}>
      <Header title="Ajustes" />

      <ScrollView contentContainerStyle={commonStyles.container}>
        <View style={commonStyles.content}>
          <View style={styles.heroCard}>
            <View style={styles.heroIcon}>
              <Ionicons
                name="person-outline"
                size={28}
                color={colors.primaryDark}
              />
            </View>

            <View style={styles.heroTextBlock}>
              <Text style={styles.heroLabel}>Cuenta activa</Text>

              <Text
                style={styles.emailText}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.75}
              >
                {email || "Usuario"}
              </Text>
            </View>
          </View>

          <View style={commonStyles.card}>
            <Text style={commonStyles.cardTitle}>Preferencias</Text>

            <Text style={[commonStyles.subtitle, styles.description]}>
              Desde aquí puedes revisar tu cuenta y acceder a opciones básicas
              de la aplicación.
            </Text>

            <View style={styles.optionRow}>
              <View style={styles.optionIcon}>
                <Ionicons
                  name="shield-checkmark-outline"
                  size={20}
                  color={colors.primaryDark}
                />
              </View>

              <View style={styles.optionTextBlock}>
                <Text style={styles.optionTitle}>Sesión protegida</Text>

                <Text style={styles.optionDescription}>
                  Tus gastos, ahorros y simulaciones se cargan usando tu
                  usuario.
                </Text>
              </View>
            </View>

            <View style={styles.optionRow}>
              <View style={styles.optionIcon}>
                <Ionicons
                  name="color-palette-outline"
                  size={20}
                  color={colors.primaryDark}
                />
              </View>

              <View style={styles.optionTextBlock}>
                <Text style={styles.optionTitle}>Tema visual</Text>

                <Text style={styles.optionDescription}>
                  Tema turquesa con diseño financiero limpio.
                </Text>
              </View>
            </View>
          </View>

          <View style={commonStyles.card}>
            <Text style={commonStyles.cardTitle}>Acciones</Text>

            <Text style={[commonStyles.subtitle, styles.description]}>
              Cierra la sesión cuando termines de usar la aplicación.
            </Text>

            <Pressable
              style={[commonStyles.dangerButton, styles.logoutButton]}
              onPress={handleLogout}
            >
              <Ionicons name="log-out-outline" size={18} color="#B91C1C" />

              <Text style={commonStyles.dangerButtonText}>Cerrar sesión</Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>

      <AppBottomMenu active="settings" />
    </View>
  );
}

const createStyles = (isDesktop: boolean) =>
  StyleSheet.create({
    heroCard: {
      backgroundColor: colors.primaryDark,
      borderRadius: isDesktop ? 20 : 18,
      padding: isDesktop ? 22 : 16,
      marginBottom: isDesktop ? 16 : 12,
      flexDirection: "row",
      alignItems: "center",
      gap: 14,
    },

    heroIcon: {
      width: isDesktop ? 58 : 48,
      height: isDesktop ? 58 : 48,
      borderRadius: 999,
      backgroundColor: colors.white,
      alignItems: "center",
      justifyContent: "center",
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

    emailText: {
      fontSize: isDesktop ? 22 : 18,
      fontWeight: "900",
      color: colors.white,
    },

    description: {
      marginTop: 6,
      marginBottom: 14,
      lineHeight: isDesktop ? 20 : 17,
    },

    optionRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      paddingVertical: isDesktop ? 13 : 11,
      borderTopWidth: 1,
      borderTopColor: colors.borderSoft,
    },

    optionIcon: {
      width: 38,
      height: 38,
      borderRadius: 12,
      backgroundColor: colors.primarySoft,
      alignItems: "center",
      justifyContent: "center",
    },

    optionTextBlock: {
      flex: 1,
      minWidth: 0,
    },

    optionTitle: {
      fontSize: isDesktop ? 14 : 12,
      fontWeight: "900",
      color: colors.text,
      marginBottom: 2,
    },

    optionDescription: {
      fontSize: isDesktop ? 13 : 11,
      color: colors.mutedText,
      fontWeight: "600",
      lineHeight: isDesktop ? 18 : 16,
    },

    logoutButton: {
      marginTop: 8,
      width: "100%",
    },
  });
