import { Ionicons } from "@expo/vector-icons";
import { useEffect, useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { useAppTheme } from "@/src/context/ThemeContext";
import { colors } from "@/src/theme/colors";

type DataStateProps = {
  loading?: boolean;
  error?: string;
  autoRetryMs?: number;
  onRetry?: () => void;
};

export function DataState({
  loading,
  error,
  autoRetryMs,
  onRetry,
}: DataStateProps) {
  const { themeId } = useAppTheme();
  const styles = useMemo(() => {
    void themeId;
    return createStyles();
  }, [themeId]);

  useEffect(() => {
    if (!loading || error || !autoRetryMs || !onRetry) return;

    const timeout = setTimeout(onRetry, autoRetryMs);

    return () => clearTimeout(timeout);
  }, [autoRetryMs, error, loading, onRetry]);

  if (!loading && !error) return null;

  return (
    <View style={[styles.box, error && styles.errorBox]}>
      <View style={styles.icon}>
        <Ionicons
          name={error ? "alert-circle-outline" : "sync-outline"}
          size={16}
          color={error ? colors.danger : colors.primaryDark}
        />
      </View>

      <Text style={[styles.text, error && styles.errorText]}>
        {error || "Cargando tus datos..."}
      </Text>

      {Boolean(error) && onRetry && (
        <Pressable style={styles.retryButton} onPress={onRetry}>
          <Text style={styles.retryText}>Reintentar</Text>
        </Pressable>
      )}
    </View>
  );
}

const createStyles = () =>
  StyleSheet.create({
  box: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: colors.primarySoft,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 9,
    paddingHorizontal: 11,
    marginBottom: 12,
  },

  errorBox: {
    backgroundColor: "#FEF2F2",
    borderColor: "#FECACA",
  },

  icon: {
    width: 24,
    height: 24,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.white,
  },

  text: {
    flex: 1,
    color: colors.primaryDark,
    fontSize: 12,
    fontWeight: "800",
  },

  errorText: {
    color: colors.danger,
  },

  retryButton: {
    backgroundColor: colors.white,
    borderRadius: 999,
    paddingVertical: 5,
    paddingHorizontal: 9,
  },

  retryText: {
    color: colors.primaryDark,
    fontSize: 11,
    fontWeight: "900",
  },
  });
