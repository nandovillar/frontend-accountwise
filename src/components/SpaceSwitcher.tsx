import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { useSpaces } from "@/src/context/SpaceContext";
import { colors } from "@/src/theme/colors";

export function SpaceSwitcher() {
  const {
    activeSpaceId,
    markActiveSpaceSeen,
    selectSpace,
    spaces,
    unreadCount,
  } = useSpaces();

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <View style={styles.headerLeft}>
          <Ionicons name="people-outline" size={17} color={colors.primaryDark} />
          <Text style={styles.title}>Espacio</Text>
        </View>

        {unreadCount > 0 && (
          <Pressable style={styles.badge} onPress={markActiveSpaceSeen}>
            <Text style={styles.badgeText}>{unreadCount} cambios nuevos</Text>
          </Pressable>
        )}
      </View>

      <View style={styles.chipRow}>
        {spaces.map((space) => {
          const active = activeSpaceId === space.id;

          return (
            <Pressable
              key={space.id || "personal"}
              style={[styles.chip, active && styles.chipActive]}
              onPress={() => selectSpace(space.id)}
            >
              <Ionicons
                name={space.type === "shared" ? "people" : "person"}
                size={14}
                color={active ? colors.white : colors.primaryDark}
              />

              <Text style={[styles.chipText, active && styles.chipTextActive]}>
                {space.name}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    padding: 10,
    marginBottom: 12,
  },

  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    marginBottom: 8,
  },

  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },

  title: {
    fontSize: 12,
    color: colors.mutedText,
    fontWeight: "900",
  },

  badge: {
    backgroundColor: "#FEF3C7",
    borderRadius: 999,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },

  badgeText: {
    color: "#92400E",
    fontSize: 10,
    fontWeight: "900",
  },

  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 7,
  },

  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.primarySoft,
    borderRadius: 999,
    paddingVertical: 7,
    paddingHorizontal: 10,
  },

  chipActive: {
    backgroundColor: colors.primaryDark,
    borderColor: colors.primaryDark,
  },

  chipText: {
    color: colors.primaryDark,
    fontSize: 11,
    fontWeight: "900",
  },

  chipTextActive: {
    color: colors.white,
  },
});
