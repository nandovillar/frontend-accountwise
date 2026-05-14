import { Ionicons } from "@expo/vector-icons";
import { useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { useAppTheme } from "@/src/context/ThemeContext";
import { colors } from "@/src/theme/colors";

type EmptyStateProps = {
  title: string;
  text: string;
  actionLabel?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  onAction?: () => void;
};

export function EmptyState({
  title,
  text,
  actionLabel,
  icon = "add-circle-outline",
  onAction,
}: EmptyStateProps) {
  const { themeId } = useAppTheme();
  const styles = useMemo(() => {
    void themeId;
    return createStyles();
  }, [themeId]);

  return (
    <View style={styles.box}>
      <View style={styles.iconWrap}>
        <Ionicons name={icon} size={20} color={colors.primaryDark} />
      </View>

      <Text style={styles.title}>{title}</Text>
      <Text style={styles.text}>{text}</Text>

      {actionLabel && onAction && (
        <Pressable style={styles.action} onPress={onAction}>
          <Text style={styles.actionText}>{actionLabel}</Text>
        </Pressable>
      )}
    </View>
  );
}

const createStyles = () =>
  StyleSheet.create({
  box: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    padding: 16,
    alignItems: "center",
    marginTop: 8,
  },

  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 999,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 9,
  },

  title: {
    color: colors.text,
    fontSize: 15,
    fontWeight: "900",
    textAlign: "center",
  },

  text: {
    color: colors.mutedText,
    fontSize: 12,
    fontWeight: "700",
    textAlign: "center",
    marginTop: 5,
  },

  action: {
    marginTop: 12,
    backgroundColor: colors.primaryDark,
    borderRadius: 999,
    paddingVertical: 8,
    paddingHorizontal: 13,
  },

  actionText: {
    color: colors.white,
    fontSize: 12,
    fontWeight: "900",
  },
  });
