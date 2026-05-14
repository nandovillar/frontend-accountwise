import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { useAppTheme } from "@/src/context/ThemeContext";
import { colors } from "@/src/theme/colors";

type ActiveTab = "home" | "expenses" | "savings" | "settings";

export function AppBottomMenu({ active }: { active?: ActiveTab }) {
  const { themeId } = useAppTheme();
  const styles = useMemo(() => {
    void themeId;
    return createStyles();
  }, [themeId]);

  return (
    <View style={styles.bottomBar}>
      <MenuItem
        label="Resumen"
        icon="home-outline"
        active={active === "home"}
        styles={styles}
        onPress={() => router.replace("/")}
      />

      <MenuItem
        label="Gastos"
        icon="card-outline"
        active={active === "expenses"}
        styles={styles}
        onPress={() => router.replace("/expenses")}
      />

      <MenuItem
        label="Ahorros"
        icon="wallet-outline"
        active={active === "savings"}
        styles={styles}
        onPress={() => router.replace("/savings")}
      />
    </View>
  );
}

function MenuItem({
  label,
  icon,
  active,
  styles,
  onPress,
}: {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  active?: boolean;
  styles: ReturnType<typeof createStyles>;
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

const createStyles = () =>
  StyleSheet.create({
  bottomBar: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: 68,
    paddingTop: 6,
    paddingBottom: 8,
    backgroundColor: colors.surface,
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
