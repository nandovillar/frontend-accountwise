import { StyleSheet } from "react-native";
import { colors } from "./colors";
import { spacing } from "./spacing";
import { createTypography } from "./typography";

export const createCommonStyles = (isDesktop: boolean) => {
  const typography = createTypography(isDesktop);

  return StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: colors.background,
    },

    container: {
      flexGrow: 1,
      paddingHorizontal: isDesktop ? spacing.xxl : spacing.lg,
      paddingTop: isDesktop ? spacing.xxl : spacing.lg,
      paddingBottom: isDesktop ? 96 : 88,
      alignItems: "center",
    },

    content: {
      width: "100%",
      maxWidth: 980,
    },

    card: {
      backgroundColor: colors.surface,
      borderRadius: isDesktop ? 18 : 16,
      borderWidth: 1,
      borderColor: colors.border,
      padding: isDesktop ? spacing.xl : spacing.lg,
      marginBottom: spacing.lg,
    },

    compactCard: {
      backgroundColor: colors.surface,
      borderRadius: isDesktop ? 16 : 14,
      borderWidth: 1,
      borderColor: colors.border,
      padding: isDesktop ? spacing.lg : spacing.md,
      marginBottom: spacing.md,
    },

    row: {
      flexDirection: "row",
      alignItems: "center",
    },

    rowBetween: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },

    title: {
      ...typography.screenTitle,
      color: colors.text,
    },

    cardTitle: {
      ...typography.cardTitle,
      color: colors.text,
    },

    sectionTitle: {
      ...typography.sectionTitle,
      color: colors.text,
    },

    subtitle: {
      ...typography.body,
      color: colors.mutedText,
    },

    smallText: {
      ...typography.small,
      color: colors.mutedText,
    },

    amountLarge: {
      ...typography.amountLarge,
      color: colors.text,
    },

    amountMedium: {
      ...typography.amountMedium,
      color: colors.text,
    },

    amountSmall: {
      ...typography.amountSmall,
      color: colors.text,
    },

    primaryButton: {
      backgroundColor: colors.primaryDark,
      borderRadius: 12,
      paddingVertical: isDesktop ? 12 : 10,
      paddingHorizontal: spacing.md,
      alignItems: "center",
      justifyContent: "center",
      flexDirection: "row",
      gap: spacing.sm,
    },

    primaryButtonText: {
      ...typography.button,
      color: colors.white,
    },

    secondaryButton: {
      backgroundColor: colors.primarySoft,
      borderRadius: 12,
      paddingVertical: isDesktop ? 12 : 10,
      paddingHorizontal: spacing.md,
      alignItems: "center",
      justifyContent: "center",
      flexDirection: "row",
      gap: spacing.sm,
    },

    secondaryButtonText: {
      ...typography.button,
      color: colors.primaryDark,
    },

    dangerButton: {
      backgroundColor: "#FEF2F2",
      borderRadius: 12,
      paddingVertical: isDesktop ? 12 : 10,
      paddingHorizontal: spacing.md,
      alignItems: "center",
      justifyContent: "center",
      flexDirection: "row",
      gap: spacing.sm,
    },

    dangerButtonText: {
      ...typography.button,
      color: "#B91C1C",
    },

    inputGroup: {
      marginBottom: spacing.md,
    },

    inputLabel: {
      ...typography.small,
      color: colors.mutedText,
      marginBottom: spacing.xs,
    },

    input: {
      backgroundColor: colors.white,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 11,
      paddingVertical: isDesktop ? 11 : 9,
      paddingHorizontal: spacing.md,
      fontSize: isDesktop ? 14 : 12,
      color: colors.text,
    },

    divider: {
      height: 1,
      backgroundColor: colors.borderSoft,
    },

    settingsButton: {
      position: "absolute",
      top: isDesktop ? 24 : 20,
      right: isDesktop ? 24 : 18,
      width: isDesktop ? 42 : 38,
      height: isDesktop ? 42 : 38,
      borderRadius: 999,
      backgroundColor: colors.white,
      alignItems: "center",
      justifyContent: "center",
      shadowColor: "#000",
      shadowOpacity: 0.06,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 3 },
      elevation: 2,
      zIndex: 20,
    },

    settingsButtonText: {
      fontSize: isDesktop ? 22 : 20,
      lineHeight: 24,
      color: colors.text,
      fontWeight: "900",
    },

    modalOverlay: {
      flex: 1,
      backgroundColor: "rgba(15, 23, 42, 0.55)",
      justifyContent: "center",
      alignItems: "center",
      padding: isDesktop ? spacing.xl : spacing.lg,
    },

    modalCard: {
      width: "100%",
      maxWidth: 520,
      maxHeight: "86%",
      backgroundColor: colors.surface,
      borderRadius: 20,
      padding: isDesktop ? spacing.xl : spacing.lg,
      borderWidth: 1,
      borderColor: colors.border,
    },

    modalCardSmall: {
      width: "100%",
      maxWidth: 420,
      backgroundColor: colors.surface,
      borderRadius: 20,
      padding: isDesktop ? spacing.xl : spacing.lg,
      borderWidth: 1,
      borderColor: colors.border,
    },

    modalHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "flex-start",
      gap: spacing.md,
      marginBottom: spacing.lg,
    },

    modalTitleBlock: {
      flex: 1,
      minWidth: 0,
    },

    modalTitle: {
      fontSize: isDesktop ? 20 : 17,
      fontWeight: "900",
      color: colors.text,
    },

    modalSubtitle: {
      fontSize: isDesktop ? 13 : 11,
      color: colors.mutedText,
      marginTop: spacing.xs,
    },

    closeButton: {
      width: 30,
      height: 30,
      borderRadius: 999,
      backgroundColor: colors.primarySoft,
      alignItems: "center",
      justifyContent: "center",
    },

    modalScroll: {
      maxHeight: isDesktop ? 430 : 390,
    },

    modalActions: {
      flexDirection: "row",
      gap: spacing.md,
      marginTop: spacing.lg,
    },

    modalCancelButton: {
      flex: 1,
      backgroundColor: colors.primarySoft,
      padding: isDesktop ? 12 : 10,
      borderRadius: 11,
      alignItems: "center",
    },

    modalCancelText: {
      ...typography.button,
      color: colors.primaryDark,
    },

    modalSaveButton: {
      flex: 1,
      backgroundColor: colors.primaryDark,
      padding: isDesktop ? 12 : 10,
      borderRadius: 11,
      alignItems: "center",
    },

    modalSaveText: {
      ...typography.button,
      color: colors.white,
    },
  });
};
