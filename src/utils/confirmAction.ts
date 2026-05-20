import { Alert, Platform } from "react-native";

export const confirmAction = (
  message = "¿Quieres guardar los cambios?",
  title = "Confirmar acción",
) => {
  if (Platform.OS === "web") {
    return Promise.resolve(window.confirm(message));
  }

  return new Promise<boolean>((resolve) => {
    Alert.alert(title, message, [
      { text: "Cancelar", style: "cancel", onPress: () => resolve(false) },
      { text: "Confirmar", onPress: () => resolve(true) },
    ]);
  });
};
