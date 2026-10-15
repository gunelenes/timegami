import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { tapFeedback } from '@/lib/haptics';
import { useAppTheme } from '@/theme/theme-provider';

export function Chip({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  const { colors } = useAppTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={() => {
        tapFeedback();
        onPress();
      }}
      style={[
        styles.chip,
        selected
          ? { backgroundColor: colors.accent, borderColor: colors.accentShadow }
          : { backgroundColor: colors.backgroundElement, borderColor: colors.border },
      ]}>
      <ThemedText type="smallBold" style={{ color: selected ? colors.onAccent : colors.text }}>
        {label}
      </ThemedText>
    </Pressable>
  );
}

/** Single-choice row of chips. */
export function ChipGroup<T extends string | number>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <View style={styles.group}>
      {options.map((o) => (
        <Chip key={String(o.value)} label={o.label} selected={o.value === value} onPress={() => onChange(o.value)} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: Spacing.three,
    borderRadius: 999,
    borderWidth: 2,
    borderBottomWidth: 4,
  },
  group: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
});
