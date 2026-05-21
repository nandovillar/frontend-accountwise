import {
  Pressable,
  StyleProp,
  Text,
  TextStyle,
  View,
  ViewStyle,
} from "react-native";

type ResultRowProps = {
  label: string;
  value: string;
  strong?: boolean;
  onPress?: () => void;
  styles: {
    resultRow: StyleProp<ViewStyle>;
    resultLabel: StyleProp<TextStyle>;
    resultValue: StyleProp<TextStyle>;
    resultValueStrong: StyleProp<TextStyle>;
  };
};

export function ResultRow({
  label,
  value,
  strong,
  onPress,
  styles,
}: ResultRowProps) {
  const content = (
    <View style={styles.resultRow}>
      <Text style={styles.resultLabel} numberOfLines={1}>
        {label}
      </Text>

      <Text
        style={[styles.resultValue, strong && styles.resultValueStrong]}
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.7}
      >
        {value}
      </Text>
    </View>
  );

  if (!onPress) return content;

  return <Pressable onPress={onPress}>{content}</Pressable>;
}
