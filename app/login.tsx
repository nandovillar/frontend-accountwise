import { supabase } from "@/src/lib/supabase";
import { router } from "expo-router";
import { useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";

export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  return (
    <View style={styles.container}>
      <Text style={styles.title}>AccountWise</Text>
      <Text style={styles.title}>Controla tus gastos y ahorros</Text>

      <Text style={styles.subtitle}>
        Organiza tus objetivos, registra tus gastos y revisa tu dinero mensual
        desde una app sencilla.
      </Text>
      <TextInput
        style={styles.input}
        placeholder="Email"
        keyboardType="email-address"
        autoCapitalize="none"
        value={email}
        onChangeText={setEmail}
      />
      <TextInput
        style={styles.input}
        placeholder="Contraseña"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />
      <Pressable
        style={styles.primaryButton}
        onPress={async () => {
          const { error } = await supabase.auth.signInWithPassword({
            email,
            password,
          });

          if (error) {
            alert(error.message);
            return;
          }

          router.replace("/");
        }}
      >
        <Text style={styles.primaryButtonText}>Iniciar sesión</Text>
      </Pressable>
      <Pressable
        style={styles.secondaryButton}
        onPress={async () => {
          const { error } = await supabase.auth.signUp({
            email,
            password,
          });

          if (error) {
            alert(error.message);
            return;
          }

          alert("Cuenta creada. Ya puedes iniciar sesión.");
        }}
      >
        <Text style={styles.secondaryButtonText}>Crear cuenta</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F4F7FA",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  title: {
    fontSize: 34,
    fontWeight: "800",
    color: "#111827",
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    color: "#6B7280",
  },
  input: {
    width: "100%",
    maxWidth: 420,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 14,
    padding: 14,
    fontSize: 16,
    marginTop: 16,
  },
  primaryButton: {
    width: "100%",
    maxWidth: 420,
    backgroundColor: "#16A34A",
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: "center",
    marginTop: 16,
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
  secondaryButton: {
    width: "100%",
    maxWidth: 420,
    backgroundColor: "#E5E7EB",
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: "center",
    marginTop: 12,
  },
  secondaryButtonText: {
    color: "#111827",
    fontSize: 16,
    fontWeight: "700",
  },
});
