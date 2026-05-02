import { supabase } from "@/src/lib/supabase";
import { useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";

export default function LoginScreen() {
  const [mode, setMode] = useState<"login" | "signup" | null>(null);

  // Login fields
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // Signup fields
  const [name, setName] = useState("");
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");

  const [error, setError] = useState("");

  // -----------------------------
  // LOGIN
  // -----------------------------
  const handleLogin = async () => {
    setError("");

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError("Email o contraseña incorrectos");
    }
  };

  // -----------------------------
  // SIGNUP
  // -----------------------------
  const handleSignup = async () => {
    setError("");

    const { data, error: signupError } = await supabase.auth.signUp({
      email: signupEmail,
      password: signupPassword,
    });

    if (signupError) {
      if (signupError.message.includes("already registered")) {
        setError("Este email ya está registrado");
      } else {
        setError("Error al crear la cuenta");
      }
      return;
    }

    if (data.user) {
      await supabase.from("profiles").insert({
        id: data.user.id,
        full_name: name,
      });
    }
  };
  // -----------------------------
  // RESET PASSWORD
  // -----------------------------
  const handleResetPassword = async () => {
    setError("");

    if (!email) {
      setError("Introduce tu email para recuperar la contraseña");
      return;
    }

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: "https://frontend-accountwise.vercel.app/reset-password",
    });

    if (error) {
      setError("No se pudo enviar el email de recuperación");
    } else {
      setError("Te hemos enviado un email para restablecer tu contraseña");
    }
  };

  return (
    <View style={styles.container}>
      {/* TITULO */}
      <Text style={styles.title}>Bienvenido</Text>

      {/* SUBTITULO */}
      <Text style={styles.subtitle}>Gestiona tus finanzas fácilmente</Text>

      {/* BOTONES SUPERIORES */}
      <View style={styles.switchRow}>
        <Pressable
          style={[styles.switchButton, mode === "login" && styles.activeButton]}
          onPress={() => setMode("login")}
        >
          <Text style={styles.switchText}>Iniciar sesión</Text>
        </Pressable>

        <Pressable
          style={[
            styles.switchButton,
            mode === "signup" && styles.activeButton,
          ]}
          onPress={() => setMode("signup")}
        >
          <Text style={styles.switchText}>Crear cuenta</Text>
        </Pressable>
      </View>

      {/* ERROR */}
      {error !== "" && <Text style={styles.error}>{error}</Text>}

      {/* FORMULARIO LOGIN */}
      {mode === "login" && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Iniciar sesión</Text>

          <Input
            label="Email"
            value={email}
            onChange={setEmail}
            secure={false}
          />
          <Input
            label="Contraseña"
            value={password}
            onChange={setPassword}
            secure
          />

          <Pressable style={styles.button} onPress={handleLogin}>
            <Text style={styles.buttonText}>Entrar</Text>
          </Pressable>
          <Pressable onPress={handleResetPassword} style={{ marginTop: 10 }}>
            <Text style={{ color: "#085175", fontSize: 12 }}>
              ¿Olvidaste tu contraseña?
            </Text>
          </Pressable>
        </View>
      )}

      {/* FORMULARIO SIGNUP */}
      {mode === "signup" && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Crear cuenta</Text>

          <Input
            label="Email"
            value={signupEmail}
            onChange={setSignupEmail}
            secure={false}
          />
          <Input
            label="Contraseña"
            value={signupPassword}
            onChange={setSignupPassword}
            secure
          />

          <Pressable style={styles.button} onPress={handleSignup}>
            <Text style={styles.buttonText}>Crear cuenta</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

// -----------------------------
// INPUT COMPONENT
// -----------------------------
interface InputProps {
  label: string;
  value: string;
  onChange: (text: string) => void;
  secure?: boolean;
}

function Input({ label, value, onChange, secure }: InputProps) {
  return (
    <View style={{ marginBottom: 10 }}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChange}
        secureTextEntry={secure}
      />
    </View>
  );
}

// -----------------------------
// STYLES
// -----------------------------
const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    justifyContent: "flex-start",
    backgroundColor: "#F4F7FA",
  },

  title: {
    fontSize: 28,
    fontWeight: "800",
    textAlign: "center",
    marginTop: 40,
  },

  subtitle: {
    fontSize: 16,
    textAlign: "center",
    color: "#6B7280",
    marginBottom: 30,
  },

  switchRow: {
    flexDirection: "row",
    justifyContent: "center",
    marginBottom: 20,
    gap: 10,
  },

  switchButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    backgroundColor: "#E5E7EB",
    borderRadius: 8,
  },

  activeButton: {
    backgroundColor: "#2563EB",
  },

  switchText: {
    color: "#111",
    fontWeight: "600",
  },

  card: {
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 12,
  },

  cardTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 12,
  },

  label: {
    fontSize: 14,
    marginBottom: 4,
  },

  input: {
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 8,
    padding: 10,
  },

  button: {
    backgroundColor: "#16A34A",
    padding: 12,
    borderRadius: 8,
    marginTop: 10,
  },

  buttonText: {
    color: "#fff",
    textAlign: "center",
    fontWeight: "700",
  },

  error: {
    color: "#DC2626",
    textAlign: "center",
    marginBottom: 10,
    fontWeight: "600",
  },
});
