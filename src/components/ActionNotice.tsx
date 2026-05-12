import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, Text, View } from "react-native";

import { colors } from "@/src/theme/colors";

export function ActionNotice({ message }: { message: string }) {
  if (!message) return null;

  return (
    <View style={styles.box}>
      <Ionicons name="checkmark-circle-outline" size={17} color={colors.success} />
      <Text style={styles.text}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#ECFDF5",
    borderColor: "#BBF7D0",
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 9,
    paddingHorizontal: 11,
    marginBottom: 12,
  },

  text: {
    flex: 1,
    color: "#166534",
    fontSize: 12,
    fontWeight: "900",
  },
});
