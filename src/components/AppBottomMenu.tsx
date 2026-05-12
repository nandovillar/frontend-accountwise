import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { colors } from "@/src/theme/colors";

type ActiveTab = "home" | "expenses" | "savings" | "settings";

export function AppBottomMenu({ active }: { active?: ActiveTab }) {
  return (
    <View style={styles.bottomBar}>
      <MenuItem
        label="Inicio"
        icon="home-outline"
        active={active === "home"}
        onPress={() => router.push("/")}
      />

      <MenuItem
        label="Gastos"
        icon="card-outline"
        active={active === "expenses"}
        onPress={() => router.push("/expenses")}
      />

      <MenuItem
        label="Ahorros"
        icon="wallet-outline"
        active={active === "savings"}
        onPress={() => router.push("/savings")}
      />
    </View>
  );
}

function MenuItem({
  label,
  icon,
  active,
  onPress,
}: {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  active?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable style={styles.item} onPress={onPress}>
      <Ionicons
        name={icon}
        size={23}
        color={active ? colors.primaryDark : colors.mutedText}
      />

      <Text style={[styles.label, active && styles.labelActive]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  bottomBar: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: 68,
    paddingTop: 6,
    paddingBottom: 8,
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    zIndex: 20,
    elevation: 8,
  },

  item: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  label: {
    fontSize: 11,
    color: colors.mutedText,
    fontWeight: "800",
    marginTop: 2,
  },

  labelActive: {
    color: colors.primaryDark,
  },
});
