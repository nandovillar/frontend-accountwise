import { StyleProp, Text, TextStyle, View, ViewStyle } from "react-native";

type KpiCardProps = {
  label: string;
  value: string;
  styles: {
    kpiCard: StyleProp<ViewStyle>;
    kpiLabel: StyleProp<TextStyle>;
    kpiValue: StyleProp<TextStyle>;
  };
  minimumFontScale?: number;
};

export function KpiCard({
  label,
  value,
  styles,
  minimumFontScale = 0.65,
}: KpiCardProps) {
  return (
    <View style={styles.kpiCard}>
      <Text style={styles.kpiLabel}>{label}</Text>

      <Text
        style={styles.kpiValue}
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={minimumFontScale}
      >
        {value}
      </Text>
    </View>
  );
}
