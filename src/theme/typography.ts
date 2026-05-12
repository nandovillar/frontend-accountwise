export const createTypography = (isDesktop: boolean) => {
  return {
    screenTitle: {
      fontSize: isDesktop ? 24 : 20,
      fontWeight: "900" as const,
    },

    cardTitle: {
      fontSize: isDesktop ? 20 : 17,
      fontWeight: "900" as const,
    },

    sectionTitle: {
      fontSize: isDesktop ? 17 : 15,
      fontWeight: "900" as const,
    },

    body: {
      fontSize: isDesktop ? 14 : 12,
      fontWeight: "500" as const,
    },

    bodyStrong: {
      fontSize: isDesktop ? 14 : 12,
      fontWeight: "800" as const,
    },

    small: {
      fontSize: isDesktop ? 12 : 10,
      fontWeight: "700" as const,
    },

    button: {
      fontSize: isDesktop ? 13 : 11,
      fontWeight: "900" as const,
    },

    amountLarge: {
      fontSize: isDesktop ? 34 : 28,
      fontWeight: "900" as const,
    },

    amountMedium: {
      fontSize: isDesktop ? 22 : 18,
      fontWeight: "900" as const,
    },

    amountSmall: {
      fontSize: isDesktop ? 15 : 13,
      fontWeight: "900" as const,
    },
  };
};
