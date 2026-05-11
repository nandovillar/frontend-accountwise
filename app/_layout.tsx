import { AuthProvider } from "@/src/context/AuthContext";
import { Stack } from "expo-router";

export default function RootLayout() {
  return (
    <AuthProvider>
      <Stack>
        <Stack.Screen
          name="login"
          options={{
            headerShown: false,
          }}
        />

        <Stack.Screen
          name="reset-password"
          options={{
            headerShown: false,
          }}
        />

        <Stack.Screen
          name="(tabs)"
          options={{
            headerShown: false,
          }}
        />

        <Stack.Screen
          name="HomePurchase"
          options={{
            headerShown: false,
          }}
        />

        <Stack.Screen
          name="settings"
          options={{
            headerShown: false,
          }}
        />

        <Stack.Screen
          name="modal"
          options={{
            presentation: "modal",
            title: "Modal",
          }}
        />
      </Stack>
    </AuthProvider>
  );
}
