import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { tapFeedback } from '@/lib/haptics';
import { useAppTheme } from '@/theme/theme-provider';

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
}) {
  const { colors, definition } = useAppTheme();
  return (
    <View accessibilityRole="tablist" style={[styles.track, { backgroundColor: colors.backgroundSelected, borderRadius: definition.radius.md }]}>
      {options.map((o) => {
        const selected = o.value === value;
        return (
          <Pressable
            key={o.value}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            onPress={() => {
              if (!selected) tapFeedback();
              onChange(o.value);
            }}
            style={[
              styles.segment,
              { borderRadius: definition.radius.sm },
              selected && { backgroundColor: colors.backgroundElement },
            ]}>
            <ThemedText type="smallBold" style={{ color: selected ? colors.accent : colors.textSecondary }} numberOfLines={1}>
              {o.label}
            </ThemedText>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    flexDirection: 'row',
    padding: Spacing.one,
    gap: Spacing.one,
  },
  segment: {
    flex: 1,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.two,
  },
});
