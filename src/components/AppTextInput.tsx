import { Text, TextInput, View, type KeyboardTypeOptions } from "react-native";

import { colors } from "@/src/theme/colors";
import { createCommonStyles } from "@/src/theme/commonStyles";

type AppTextInputProps = {
  label: string;
  value: string;
  onChange: (text: string) => void;
  keyboardType?: KeyboardTypeOptions;
  secureTextEntry?: boolean;
  commonStyles: ReturnType<typeof createCommonStyles>;
};

export function AppTextInput({
  label,
  value,
  onChange,
  keyboardType = "decimal-pad",
  secureTextEntry,
  commonStyles,
}: AppTextInputProps) {
  return (
    <View style={commonStyles.inputGroup}>
      <Text style={commonStyles.inputLabel}>{label}</Text>

      <TextInput
        style={commonStyles.input}
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
    </View>
  );
}
