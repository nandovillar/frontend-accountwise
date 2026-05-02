import { supabase } from "@/src/lib/supabase";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
export default function ResetPasswordScreen() {
  const router = useRouter();

  const [newPassword, setNewPassword] = useState("");
  const [message, setMessage] = useState("");

  // Cuando Supabase redirige aquí, ya viene con el token en la URL
  // No necesitas leerlo manualmente: supabase.auth.updateUser() ya lo usa automáticamente

  const handleUpdatePassword = async () => {
    setMessage("");

    if (newPassword.length < 6) {
      setMessage("La contraseña debe tener al menos 6 caracteres");
      return;
    }

    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (error) {
      setMessage("No se pudo actualizar la contraseña");
      return;
    }

    setMessage(
      "Contraseña actualizada correctamente. Ya puedes iniciar sesión.",
    );

    setTimeout(() => {
      router.replace("/login");
    }, 1500);
  };

  return (
    <View
      style={{
        flex: 1,
        padding: 20,
        justifyContent: "center",
        backgroundColor: "white",
      }}
    >
      <Text style={{ fontSize: 24, fontWeight: "bold", marginBottom: 20 }}>
        Restablecer contraseña
      </Text>

      <Text style={{ marginBottom: 10 }}>Introduce tu nueva contraseña:</Text>

      <TextInput
        secureTextEntry
        value={newPassword}
        onChangeText={setNewPassword}
        style={{
          borderWidth: 1,
          borderColor: "#ccc",
          padding: 10,
          borderRadius: 8,
          marginBottom: 20,
        }}
      />

      <Pressable
        onPress={handleUpdatePassword}
        style={{
          backgroundColor: "#085175",
          padding: 12,
          borderRadius: 8,
        }}
      >
        <Text style={{ color: "white", textAlign: "center", fontSize: 16 }}>
          Guardar nueva contraseña
        </Text>
      </Pressable>

      {message !== "" && (
        <Text style={{ marginTop: 20, color: "#085175" }}>{message}</Text>
      )}
    </View>
  );
}
