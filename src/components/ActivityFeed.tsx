import { Ionicons } from "@expo/vector-icons";
import { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";

import { SpaceActivity } from "@/src/context/SpaceContext";
import { useAppTheme } from "@/src/context/ThemeContext";
import { colors } from "@/src/theme/colors";

const formatTime = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  return date.toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "short",
  });
};

export function ActivityFeed({ items }: { items: SpaceActivity[] }) {
  const { themeId } = useAppTheme();
  const styles = useMemo(() => {
    void themeId;
    return createStyles();
  }, [themeId]);

  if (!items.length) return null;

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Ionicons name="notifications-outline" size={16} color={colors.primaryDark} />
        <Text style={styles.title}>Ultimos cambios</Text>
      </View>

      {items.map((item) => (
        <View key={item.id} style={styles.row}>
          <View style={styles.dot} />
          <View style={styles.messageBlock}>
            <Text style={styles.message} numberOfLines={2}>
              {item.message}
            </Text>
            <Text style={styles.time}>{formatTime(item.created_at)}</Text>
          </View>
        </View>
      ))}
    </View>
  );
}

const createStyles = () =>
  StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    padding: 11,
    marginBottom: 12,
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    marginBottom: 8,
  },

  title: {
    color: colors.text,
    fontSize: 13,
    fontWeight: "900",
  },

  row: {
    flexDirection: "row",
    gap: 8,
    alignItems: "flex-start",
    paddingVertical: 5,
  },

  dot: {
    width: 7,
    height: 7,
    borderRadius: 999,
    backgroundColor: colors.primary,
    marginTop: 5,
  },

  message: {
    color: colors.mutedText,
    fontSize: 12,
    fontWeight: "700",
  },

  messageBlock: {
    flex: 1,
    minWidth: 0,
  },

  time: {
    color: "#94A3B8",
    fontSize: 10,
    fontWeight: "800",
    marginTop: 2,
  },
  });
