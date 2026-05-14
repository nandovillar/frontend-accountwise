import { Ionicons } from "@expo/vector-icons";
import {
  Pressable,
  Text,
  TextInput,
  View,
  type KeyboardTypeOptions,
} from "react-native";

import { colors } from "@/src/theme/colors";
import { createCommonStyles } from "@/src/theme/commonStyles";

type AppTextInputProps = {
  label: string;
  value: string;
  onChange: (text: string) => void;
  keyboardType?: KeyboardTypeOptions;
  secureTextEntry?: boolean;
  rightIcon?: keyof typeof Ionicons.glyphMap;
  onRightIconPress?: () => void;
  suffix?: string;
  commonStyles: ReturnType<typeof createCommonStyles>;
};

export function AppTextInput({
  label,
  value,
  onChange,
  keyboardType = "decimal-pad",
  secureTextEntry,
  rightIcon,
  onRightIconPress,
  suffix,
  commonStyles,
}: AppTextInputProps) {
  const normalizedLabel = label.toLowerCase();
  const labelLooksLikeMoney =
    /(importe|cantidad|sueldo|ingreso|gasto|precio|entrada|ahorro|objetivo|actual|pendiente|recogido|comisión|comision|notaría|notaria)/i.test(
      normalizedLabel,
    );
  const labelLooksLikeRate =
    normalizedLabel.includes("%") ||
    /(año|años|tin|bonificación|bonificacion|meses)/i.test(normalizedLabel);
  const isMoneyInput =
    !suffix &&
    !labelLooksLikeRate &&
    labelLooksLikeMoney &&
    (keyboardType === "decimal-pad" || keyboardType === "numeric");
  const inputSuffix = suffix || (isMoneyInput ? "€" : "");
  const hasAdornment = Boolean(rightIcon || inputSuffix);

  return (
    <View style={commonStyles.inputGroup}>
      <Text style={commonStyles.inputLabel}>{label}</Text>

      <View style={commonStyles.inputShell}>
        <TextInput
          style={[
            commonStyles.input,
            hasAdornment && commonStyles.inputWithIcon,
          ]}
          value={value}
          onChangeText={onChange}
          keyboardType={keyboardType}
          inputMode={
            keyboardType === "decimal-pad" || keyboardType === "numeric"
              ? "decimal"
              : undefined
          }
          secureTextEntry={secureTextEntry}
          placeholderTextColor={colors.mutedText}
        />

        {inputSuffix && (
          <View style={commonStyles.inputSuffix}>
            <Text style={commonStyles.inputSuffixText}>{inputSuffix}</Text>
          </View>
        )}

        {rightIcon && onRightIconPress && (
          <Pressable
            style={commonStyles.inputIconButton}
            onPress={onRightIconPress}
          >
            <Ionicons name={rightIcon} size={20} color={colors.primaryDark} />
          </Pressable>
        )}
      </View>
    </View>
  );
}
