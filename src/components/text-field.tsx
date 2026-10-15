import { useState } from 'react';
import { StyleSheet, TextInput, View, type TextInputProps } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useAppTheme } from '@/theme/theme-provider';

export function TextField({ label, style, onFocus, onBlur, ...rest }: TextInputProps & { label?: string }) {
  const { colors, definition } = useAppTheme();
  const [focused, setFocused] = useState(false);
  return (
    <View style={styles.container}>
      {label && (
        <ThemedText type="smallBold" themeColor="textSecondary">
          {label}
        </ThemedText>
      )}
      <TextInput
        accessibilityLabel={label}
        placeholderTextColor={colors.textSecondary}
        onFocus={(e) => {
          setFocused(true);
          onFocus?.(e);
        }}
        onBlur={(e) => {
          setFocused(false);
          onBlur?.(e);
        }}
        style={[
          styles.input,
          {
            backgroundColor: colors.backgroundElement,
            borderColor: focused ? colors.accent : colors.border,
            borderRadius: definition.radius.md,
            color: colors.text,
            fontFamily: definition.fonts.bodyBold,
          },
          style,
        ]}
        {...rest}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.two,
  },
  input: {
    borderWidth: 2,
    paddingVertical: 14,
    paddingHorizontal: Spacing.three,
    fontSize: 16,
  },
});
