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
  commonStyles,
}: AppTextInputProps) {
  return (
    <View style={commonStyles.inputGroup}>
      <Text style={commonStyles.inputLabel}>{label}</Text>

      <View style={commonStyles.inputShell}>
        <TextInput
          style={[commonStyles.input, rightIcon && commonStyles.inputWithIcon]}
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
