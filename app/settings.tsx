import { Ionicons } from "@expo/vector-icons";
import { Header } from "@react-navigation/elements";
import { router } from "expo-router";
import { useEffect, useMemo, useState } from "react";

import { AppBottomMenu } from "@/src/components/AppBottomMenu";
import { AppTextInput } from "@/src/components/AppTextInput";
import { SpaceSwitcher } from "@/src/components/SpaceSwitcher";
import { useSpaces } from "@/src/context/SpaceContext";
import { useAppTheme } from "@/src/context/ThemeContext";
import { supabase } from "@/src/lib/supabase";
import { colors, themePalettes } from "@/src/theme/colors";
import { createCommonStyles } from "@/src/theme/commonStyles";
import { getCurrentUser } from "@/src/utils/auth";

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
  const {
    activeSpace,
    createSharedSpace,
    inviteMemberByEmail,
    refreshSpaces,
  } = useSpaces();
  const { themeId, setThemeId, options: themeOptions } = useAppTheme();
  const { width } = useWindowDimensions();
  const isDesktop = width >= 1024;
  const isTablet = width >= 600 && width < 1024;

  const commonStyles = useMemo(() => {
    void themeId;
    return createCommonStyles(isDesktop);
  }, [isDesktop, themeId]);

  const styles = useMemo(() => {
    void themeId;
    return createStyles(isDesktop, isTablet);
  }, [isDesktop, isTablet, themeId]);

  const [email, setEmail] = useState("");
  const [sharedSpaceName, setSharedSpaceName] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [spaceMessage, setSpaceMessage] = useState("");
  const [spaceMessageType, setSpaceMessageType] = useState<
    "success" | "error" | null
  >(null);

  const loadUser = async () => {
    const user = await getCurrentUser();

    setEmail(user?.email || "");

    if (user?.email) {
      await supabase
        .from("profiles")
        .update({ email: user.email.toLowerCase() })
        .eq("id", user.id);
    }
  };

  const handleCreateSharedSpace = async () => {
    setSpaceMessage("");
    setSpaceMessageType(null);
    const error = await createSharedSpace(sharedSpaceName);

    if (error) {
      setSpaceMessage(error);
      setSpaceMessageType("error");
      return;
    }

    setSharedSpaceName("");
    setSpaceMessage("Espacio compartido creado.");
    setSpaceMessageType("success");
  };

  const handleInvite = async () => {
    setSpaceMessage("");
    setSpaceMessageType(null);

    if (!inviteEmail.trim()) {
      setSpaceMessage("Introduce el email de la persona que quieres anadir.");
      setSpaceMessageType("error");
      return;
    }

    const error = await inviteMemberByEmail(inviteEmail);

    if (error) {
      setSpaceMessage(error);
      setSpaceMessageType("error");
      return;
    }

    setInviteEmail("");
    setSpaceMessage("Usuario anadido al espacio compartido.");
    setSpaceMessageType("success");
    await refreshSpaces();
  };

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();

    if (error) {
      Alert.alert("Error", error.message);
      return;
    }

    router.replace("/login");
  };

  const confirmThemeChange = (nextThemeId: typeof themeId) => {
    if (nextThemeId === themeId) return;

    const option = themeOptions.find((item) => item.id === nextThemeId);

    Alert.alert(
      "Cambiar tema",
      `¿Quieres aplicar el tema ${option?.name || "seleccionado"}?`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Cambiar",
          onPress: () => setThemeId(nextThemeId),
        },
      ],
    );
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
              Desde aqui puedes revisar tu cuenta y acceder a opciones basicas
              de la aplicacion.
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
                <Text style={styles.optionTitle}>Sesion protegida</Text>

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
                  Elige entre 2 temas claros y 2 oscuros.
                </Text>
              </View>
            </View>

            <View style={styles.themeGrid}>
              {themeOptions.map((option) => {
                const palette = themePalettes[option.id];
                const active = option.id === themeId;

                return (
                  <Pressable
                    key={option.id}
                    style={[
                      styles.themeOption,
                      active && styles.themeOptionActive,
                    ]}
                    onPress={() => confirmThemeChange(option.id)}
                  >
                    <View style={styles.themeSwatches}>
                      <View
                        style={[
                          styles.themeSwatch,
                          { backgroundColor: palette.background },
                        ]}
                      />
                      <View
                        style={[
                          styles.themeSwatch,
                          { backgroundColor: palette.primaryDark },
                        ]}
                      />
                      <View
                        style={[
                          styles.themeSwatch,
                          { backgroundColor: palette.surface },
                        ]}
                      />
                    </View>

                    <View style={styles.themeTextBlock}>
                      <Text style={styles.themeName}>{option.name}</Text>
                      <Text style={styles.themeDescription}>
                        {option.description}
                      </Text>
                    </View>

                    {active && (
                      <Ionicons
                        name="checkmark-circle"
                        size={20}
                        color={colors.primaryDark}
                      />
                    )}
                  </Pressable>
                );
              })}
            </View>
          </View>

          <View style={commonStyles.card}>
            <Text style={commonStyles.cardTitle}>Espacios</Text>

            <Text style={[commonStyles.subtitle, styles.description]}>
              Usa Personal para tus datos privados y crea un espacio compartido
              para una cuenta comun.
            </Text>

            <SpaceSwitcher />

            <AppTextInput
              label="Nuevo espacio compartido"
              value={sharedSpaceName}
              onChange={setSharedSpaceName}
              keyboardType="default"
              commonStyles={commonStyles}
            />

            <Pressable
              style={[commonStyles.primaryButton, styles.spaceActionButton]}
              onPress={handleCreateSharedSpace}
            >
              <Ionicons name="people-outline" size={18} color={colors.white} />
              <Text style={commonStyles.primaryButtonText}>Crear espacio</Text>
            </Pressable>

            {activeSpace.type === "shared" && (
              <>
                <AppTextInput
                  label="Invitar por email"
                  value={inviteEmail}
                  onChange={setInviteEmail}
                  keyboardType="default"
                  commonStyles={commonStyles}
                />

                <Pressable
                  style={[
                    commonStyles.secondaryButton,
                    styles.spaceActionButton,
                  ]}
                  onPress={handleInvite}
                >
                  <Ionicons
                    name="person-add-outline"
                    size={18}
                    color={colors.primaryDark}
                  />
                  <Text style={commonStyles.secondaryButtonText}>
                    Anadir al espacio activo
                  </Text>
                </Pressable>
              </>
            )}

            {spaceMessage ? (
              <View
                style={[
                  styles.spaceMessageBox,
                  spaceMessageType === "error" && styles.spaceMessageBoxError,
                ]}
              >
                <Ionicons
                  name={
                    spaceMessageType === "error"
                      ? "alert-circle-outline"
                      : "checkmark-circle-outline"
                  }
                  size={18}
                  color={
                    spaceMessageType === "error"
                      ? colors.danger
                      : colors.primaryDark
                  }
                />
                <Text
                  style={[
                    styles.spaceMessage,
                    spaceMessageType === "error" && styles.spaceMessageError,
                  ]}
                >
                  {spaceMessage}
                </Text>
              </View>
            ) : null}
          </View>

          <View style={commonStyles.card}>
            <Text style={commonStyles.cardTitle}>Acciones</Text>

            <Text style={[commonStyles.subtitle, styles.description]}>
              Cierra la sesion cuando termines de usar la aplicacion.
            </Text>

            <Pressable
              style={[commonStyles.dangerButton, styles.logoutButton]}
              onPress={handleLogout}
            >
              <Ionicons name="log-out-outline" size={18} color="#B91C1C" />

              <Text style={commonStyles.dangerButtonText}>Cerrar sesion</Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>

      <AppBottomMenu active="settings" />
    </View>
  );
}

const createStyles = (isDesktop: boolean, isTablet: boolean) =>
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

    themeGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: isTablet ? 8 : 7,
      marginTop: 4,
    },

    themeOption: {
      flexGrow: 1,
      flexBasis: isDesktop ? "23%" : "47%",
      minHeight: isDesktop ? 64 : 56,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 12,
      backgroundColor: colors.background,
      paddingVertical: isDesktop ? 10 : 8,
      paddingHorizontal: isDesktop ? 10 : 8,
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },

    themeOptionActive: {
      borderColor: colors.primaryDark,
      backgroundColor: colors.primarySoft,
    },

    themeSwatches: {
      flexDirection: "row",
      width: isDesktop ? 42 : 34,
      height: isDesktop ? 26 : 22,
      borderRadius: 8,
      overflow: "hidden",
      borderWidth: 1,
      borderColor: colors.border,
    },

    themeSwatch: {
      flex: 1,
    },

    themeTextBlock: {
      flex: 1,
      minWidth: 0,
    },

    themeName: {
      fontSize: isDesktop ? 12 : 11,
      fontWeight: "900",
      color: colors.text,
    },

    themeDescription: {
      marginTop: 1,
      fontSize: isDesktop ? 10 : 9,
      fontWeight: "700",
      color: colors.mutedText,
    },

    spaceActionButton: {
      width: "100%",
      marginBottom: 12,
    },

    spaceMessageBox: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: 8,
      backgroundColor: colors.primarySoft,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 12,
      padding: 10,
      marginTop: 2,
    },

    spaceMessageBoxError: {
      backgroundColor: "#FEF2F2",
      borderColor: "#FECACA",
    },

    spaceMessage: {
      flex: 1,
      fontSize: isDesktop ? 13 : 11,
      color: colors.primaryDark,
      fontWeight: "800",
      lineHeight: isDesktop ? 18 : 16,
    },

    spaceMessageError: {
      color: colors.danger,
    },

    logoutButton: {
      marginTop: 8,
      width: "100%",
    },
  });
