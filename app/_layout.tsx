import { AuthProvider } from "@/src/context/AuthContext";
import { SpaceProvider } from "@/src/context/SpaceContext";
import { ThemeProvider } from "@/src/context/ThemeContext";
import { Stack } from "expo-router";

export default function RootLayout() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <SpaceProvider>
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
        </SpaceProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
