import { Ionicons } from "@expo/vector-icons";
import { useMemo, useState } from "react";
import {
  Alert,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { ActivityFeed } from "@/src/components/ActivityFeed";
import { useSpaces } from "@/src/context/SpaceContext";
import { useAppTheme } from "@/src/context/ThemeContext";
import { colors } from "@/src/theme/colors";
import { createCommonStyles } from "@/src/theme/commonStyles";

export function SpaceMenuButton({ isDesktop }: { isDesktop: boolean }) {
  const { activeSpace } = useSpaces();
  const { themeId } = useAppTheme();
  const [visible, setVisible] = useState(false);
  const commonStyles = useMemo(() => {
    void themeId;
    return createCommonStyles(isDesktop);
  }, [isDesktop, themeId]);

  return (
    <>
      <Pressable
        style={commonStyles.topSpaceBadge}
        onPress={() => setVisible(true)}
      >
        <Text style={commonStyles.topSpaceBadgeText} numberOfLines={1}>
          {activeSpace.name}
        </Text>
      </Pressable>

      <Modal
        visible={visible}
        transparent
        animationType="fade"
        onRequestClose={() => setVisible(false)}
      >
        <View style={commonStyles.modalOverlay}>
          <View style={commonStyles.modalCardSmall}>
            <View style={commonStyles.modalHeader}>
              <View style={commonStyles.modalTitleBlock}>
                <Text style={commonStyles.modalTitle}>Cambiar espacio</Text>
                <Text style={commonStyles.modalSubtitle}>
                  Elige el espacio de trabajo activo.
                </Text>
              </View>
              <Pressable
                style={commonStyles.closeButton}
                onPress={() => setVisible(false)}
              >
                <Ionicons name="close" size={22} color={colors.primaryDark} />
              </Pressable>
            </View>

            <SpaceSwitcher onChanged={() => setVisible(false)} />
          </View>
        </View>
      </Modal>
    </>
  );
}

export function SpaceSwitcher({ onChanged }: { onChanged?: () => void }) {
  const { themeId } = useAppTheme();
  const {
    activeSpaceId,
    markActiveSpaceSeen,
    recentActivity,
    selectSpace,
    spaces,
    unreadCount,
  } = useSpaces();
  const styles = useMemo(() => {
    void themeId;
    return createStyles();
  }, [themeId]);

  const confirmSpaceChange = (spaceId: string | null, spaceName: string) => {
    if (activeSpaceId === spaceId) return;

    const message = `¿Quieres cambiar al espacio "${spaceName}"?`;

    if (Platform.OS === "web") {
      if (window.confirm(message)) {
        selectSpace(spaceId);
        onChanged?.();
      }
      return;
    }

    Alert.alert("Cambiar espacio", message, [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Cambiar",
        onPress: () => {
          selectSpace(spaceId);
          onChanged?.();
        },
      },
    ]);
  };

  return (
    <>
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
            const shared = space.type === "shared";

            return (
              <Pressable
                key={space.id || "personal"}
                style={[styles.chip, active && styles.chipActive]}
                onPress={() => confirmSpaceChange(space.id, space.name)}
              >
                <Ionicons
                  name={shared ? "people" : "person"}
                  size={14}
                  color={active ? colors.white : colors.primaryDark}
                />

                <View style={styles.chipTextBlock}>
                  <Text
                    style={[styles.chipText, active && styles.chipTextActive]}
                    numberOfLines={1}
                  >
                    {space.name}
                  </Text>
                  {shared && (
                    <Text
                      style={[
                        styles.chipMeta,
                        active && styles.chipMetaActive,
                      ]}
                    >
                      Compartido
                    </Text>
                  )}
                </View>
              </Pressable>
            );
          })}
        </View>
      </View>

      {Boolean(activeSpaceId) && <ActivityFeed items={recentActivity} />}
    </>
  );
}

const createStyles = () =>
  StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    padding: 12,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.04,
    shadowRadius: 7,
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
    maxWidth: "100%",
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

  chipTextBlock: {
    minWidth: 0,
  },

  chipMeta: {
    color: colors.mutedText,
    fontSize: 9,
    fontWeight: "800",
    marginTop: 1,
  },

  chipMetaActive: {
    color: colors.primarySoft,
  },

  chipTextActive: {
    color: colors.white,
  },
  });
