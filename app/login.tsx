import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useMemo, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";

import { AppTextInput } from "@/src/components/AppTextInput";
import { useAuth } from "@/src/context/AuthContext";
import { useAppTheme } from "@/src/context/ThemeContext";
import { supabase } from "@/src/lib/supabase";
import { colors } from "@/src/theme/colors";
import { createCommonStyles } from "@/src/theme/commonStyles";

type AuthMode = "login" | "signup";

type AuthErrorLike = {
  code?: string;
  message?: string;
  status?: number;
};

const isValidEmail = (value: string) => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
};

const getSignupErrorMessage = (error: AuthErrorLike) => {
  const message = error.message || "Error al crear la cuenta.";
  const normalized = message.toLowerCase();

  if (normalized.includes("already") || normalized.includes("registered")) {
    return "Este email ya está registrado. Prueba a iniciar sesión.";
  }

  if (normalized.includes("invalid email")) {
    return "El email no parece válido.";
  }

  if (normalized.includes("password")) {
    return "La contraseña no cumple los requisitos de Supabase.";
  }

  if (normalized.includes("signup") && normalized.includes("disabled")) {
    return "El registro está desactivado en Supabase Auth.";
  }

  if (normalized.includes("database")) {
    return "Supabase no pudo crear el usuario por un error de base de datos. Revisa triggers o policies de profiles.";
  }

  return `No se pudo crear la cuenta: ${message}`;
};

export default function LoginScreen() {
  const { refreshSession } = useAuth();
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

  const [mode, setMode] = useState<AuthMode>("login");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [name, setName] = useState("");
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [signupPasswordRepeat, setSignupPasswordRepeat] = useState("");
  const [showSignupPassword, setShowSignupPassword] = useState(false);
  const [showSignupPasswordRepeat, setShowSignupPasswordRepeat] =
    useState(false);

  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);

  const showMessage = (text: string, error = true) => {
    setMessage(text);
    setIsError(error);
  };

  const clearMessage = () => {
    setMessage("");
    setIsError(false);
  };

  const handleLogin = async () => {
    clearMessage();

    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (error) {
      showMessage("Email o contraseña incorrectos");
      return;
    }

    await refreshSession();
    router.replace("/(tabs)");
  };

  const handleSignup = async () => {
    clearMessage();

    const cleanName = name.trim();
    const cleanEmail = signupEmail.trim();

    if (!cleanName || !cleanEmail || !signupPassword || !signupPasswordRepeat) {
      showMessage("Completa nombre, email y contraseña.");
      return;
    }

    if (signupPassword.length < 6) {
      showMessage("La contraseña debe tener al menos 6 caracteres.");
      return;
    }

    if (signupPassword !== signupPasswordRepeat) {
      showMessage("Las contraseñas no coinciden.");
      return;
    }

    const { data, error: signupError } = await supabase.auth.signUp({
      email: cleanEmail,
      password: signupPassword,
      options: {
        data: {
          full_name: cleanName,
        },
      },
    });

    if (signupError) {
      showMessage(getSignupErrorMessage(signupError));
      return;
    }

    if (data.user?.identities && data.user.identities.length === 0) {
      showMessage("Este email ya está registrado. Prueba a iniciar sesión.");
      return;
    }

    if (data.user) {
      const { error: profileError } = await supabase.from("profiles").upsert({
        id: data.user.id,
        full_name: cleanName,
        email: cleanEmail,
        salary: 0,
      });

      if (profileError) {
        showMessage(
          `Cuenta creada, pero no se pudo preparar el perfil: ${profileError.message}`,
        );
        return;
      }
    }

    if (data.session) {
      await refreshSession();
      router.replace("/(tabs)");
      return;
    }

    showMessage(
      "Cuenta creada. Revisa tu email para confirmar el acceso.",
      false,
    );
  };

  const handleResetPassword = async () => {
    clearMessage();

    const cleanEmail = email.trim();

    if (!cleanEmail) {
      showMessage("Introduce tu email para recuperar la contraseña");
      return;
    }

    if (!isValidEmail(cleanEmail)) {
      showMessage("Ese email no parece correcto. Revisa que tenga formato nombre@dominio.com.");
      return;
    }

    const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
      redirectTo: "https://frontend-accountwise.vercel.app/reset-password",
    });

    showMessage(
      error
        ? "No se pudo enviar el email de recuperación"
        : "Te hemos enviado un email para restablecer tu contraseña",
      !!error,
    );
  };

  return (
    <View style={commonStyles.screen}>
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.content}>
          <View style={styles.heroCard}>
            <View style={styles.heroTextBlock}>
              <Text style={styles.heroLabel}>AccountWise</Text>
              <Text style={styles.heroTitle}>Bienvenido</Text>
              <Text style={styles.heroSubtitle}>
                Gestiona tus finanzas con el mismo panel desde cualquier lugar.
              </Text>
            </View>

            <View style={styles.heroIcon}>
              <Ionicons name="wallet-outline" size={28} color={colors.white} />
            </View>
          </View>

          <View style={commonStyles.card}>
            <View style={styles.modeSwitch}>
              <AuthModeButton
                label="Iniciar sesión"
                active={mode === "login"}
                onPress={() => {
                  setMode("login");
                  clearMessage();
                }}
                styles={styles}
              />

              <AuthModeButton
                label="Crear cuenta"
                active={mode === "signup"}
                onPress={() => {
                  setMode("signup");
                  clearMessage();
                }}
                styles={styles}
              />
            </View>

            {message !== "" && (
              <View
                style={[
                  styles.messageBox,
                  isError ? styles.errorBox : styles.successBox,
                ]}
              >
                <Text
                  style={[
                    styles.messageText,
                    isError ? styles.errorText : styles.successText,
                  ]}
                >
                  {message}
                </Text>
              </View>
            )}

            {mode === "login" ? (
              <View>
                <Text style={commonStyles.cardTitle}>Acceso</Text>
                <Text style={[commonStyles.subtitle, styles.cardSubtitle]}>
                  Entra con tu cuenta para sincronizar tus gastos y objetivos.
                </Text>

                <AppTextInput
                  label="Email"
                  value={email}
                  onChange={setEmail}
                  keyboardType="default"
                  commonStyles={commonStyles}
                />

                <AppTextInput
                  label="Contraseña"
                  value={password}
                  onChange={setPassword}
                  keyboardType="default"
                  secureTextEntry={!showPassword}
                  rightIcon={showPassword ? "eye-off-outline" : "eye-outline"}
                  onRightIconPress={() => setShowPassword(!showPassword)}
                  commonStyles={commonStyles}
                />

                <Pressable
                  style={[commonStyles.primaryButton, styles.fullButton]}
                  onPress={handleLogin}
                >
                  <Ionicons
                    name="log-in-outline"
                    size={18}
                    color={colors.white}
                  />
                  <Text style={commonStyles.primaryButtonText}>Entrar</Text>
                </Pressable>

                <Pressable
                  style={styles.forgotButton}
                  onPress={handleResetPassword}
                >
                  <Text style={styles.forgotText}>
                    ¿Olvidaste tu contraseña?
                  </Text>
                </Pressable>
              </View>
            ) : (
              <View>
                <Text style={commonStyles.cardTitle}>Crear cuenta</Text>
                <Text style={[commonStyles.subtitle, styles.cardSubtitle]}>
                  Crea tu perfil para guardar tus preferencias y datos.
                </Text>

                <AppTextInput
                  label="Nombre"
                  value={name}
                  onChange={setName}
                  keyboardType="default"
                  commonStyles={commonStyles}
                />

                <AppTextInput
                  label="Email"
                  value={signupEmail}
                  onChange={setSignupEmail}
                  keyboardType="default"
                  commonStyles={commonStyles}
                />

                <AppTextInput
                  label="Contraseña"
                  value={signupPassword}
                  onChange={setSignupPassword}
                  keyboardType="default"
                  secureTextEntry={!showSignupPassword}
                  rightIcon={
                    showSignupPassword ? "eye-off-outline" : "eye-outline"
                  }
                  onRightIconPress={() =>
                    setShowSignupPassword(!showSignupPassword)
                  }
                  commonStyles={commonStyles}
                />

                <AppTextInput
                  label="Repetir contraseña"
                  value={signupPasswordRepeat}
                  onChange={setSignupPasswordRepeat}
                  keyboardType="default"
                  secureTextEntry={!showSignupPasswordRepeat}
                  rightIcon={
                    showSignupPasswordRepeat
                      ? "eye-off-outline"
                      : "eye-outline"
                  }
                  onRightIconPress={() =>
                    setShowSignupPasswordRepeat(!showSignupPasswordRepeat)
                  }
                  commonStyles={commonStyles}
                />

                <Pressable
                  style={[commonStyles.primaryButton, styles.fullButton]}
                  onPress={handleSignup}
                >
                  <Ionicons
                    name="person-add-outline"
                    size={18}
                    color={colors.white}
                  />
                  <Text style={commonStyles.primaryButtonText}>
                    Crear cuenta
                  </Text>
                </Pressable>
              </View>
            )}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

function AuthModeButton({
  label,
  active,
  onPress,
  styles,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
  styles: ReturnType<typeof createStyles>;
}) {
  return (
    <Pressable
      style={[styles.modeButton, active && styles.modeButtonActive]}
      onPress={onPress}
    >
      <Text
        style={[styles.modeButtonText, active && styles.modeButtonTextActive]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const createStyles = (isDesktop: boolean) =>
  StyleSheet.create({
    container: {
      flexGrow: 1,
      paddingHorizontal: isDesktop ? 24 : 16,
      paddingVertical: isDesktop ? 36 : 20,
      alignItems: "center",
      justifyContent: "center",
    },

    content: {
      width: "100%",
      maxWidth: 520,
    },

    heroCard: {
      backgroundColor: colors.primaryDark,
      borderRadius: isDesktop ? 20 : 18,
      padding: isDesktop ? 22 : 16,
      marginBottom: isDesktop ? 14 : 12,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 14,
      minHeight: isDesktop ? 128 : 112,
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

    heroTitle: {
      fontSize: isDesktop ? 28 : 23,
      color: colors.white,
      fontWeight: "900",
      marginBottom: 4,
    },

    heroSubtitle: {
      fontSize: isDesktop ? 13 : 11,
      color: colors.white,
      opacity: 0.85,
      fontWeight: "600",
    },

    heroIcon: {
      width: isDesktop ? 58 : 48,
      height: isDesktop ? 58 : 48,
      borderRadius: 999,
      backgroundColor: "rgba(255,255,255,0.16)",
      alignItems: "center",
      justifyContent: "center",
    },

    modeSwitch: {
      flexDirection: "row",
      backgroundColor: colors.primarySoft,
      borderRadius: 13,
      padding: 4,
      marginBottom: 16,
      gap: 4,
    },

    modeButton: {
      flex: 1,
      borderRadius: 10,
      paddingVertical: isDesktop ? 10 : 9,
      alignItems: "center",
      justifyContent: "center",
    },

    modeButtonActive: {
      backgroundColor: colors.primaryDark,
    },

    modeButtonText: {
      color: colors.primaryDark,
      fontSize: isDesktop ? 13 : 11,
      fontWeight: "900",
    },

    modeButtonTextActive: {
      color: colors.white,
    },

    cardSubtitle: {
      marginTop: 4,
      marginBottom: 16,
    },

    messageBox: {
      borderRadius: 12,
      paddingVertical: 10,
      paddingHorizontal: 12,
      marginBottom: 16,
      borderWidth: 1,
    },

    errorBox: {
      backgroundColor: "#FEF2F2",
      borderColor: "#FECACA",
    },

    successBox: {
      backgroundColor: "#F0FDF4",
      borderColor: "#BBF7D0",
    },

    messageText: {
      fontSize: isDesktop ? 13 : 11,
      fontWeight: "800",
      textAlign: "center",
    },

    errorText: {
      color: colors.danger,
    },

    successText: {
      color: colors.success,
    },

    fullButton: {
      width: "100%",
      marginTop: 4,
    },

    forgotButton: {
      alignItems: "center",
      paddingVertical: 12,
    },

    forgotText: {
      color: colors.primaryDark,
      fontSize: isDesktop ? 13 : 11,
      fontWeight: "900",
    },
  });
