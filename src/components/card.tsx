import { View, type ViewProps } from 'react-native';

import { Spacing } from '@/constants/theme';
import { useAppTheme } from '@/theme/theme-provider';

/** Raised surface with the theme's border and bottom ledge. */
export function Card({ style, ...rest }: ViewProps) {
  const { colors, definition } = useAppTheme();
  return (
    <View
      style={[
        {
          backgroundColor: colors.backgroundElement,
          borderColor: colors.border,
          borderWidth: 2,
          borderBottomWidth: 2 + Math.max(0, definition.depth - 2),
          borderRadius: definition.radius.lg,
          padding: Spacing.three,
        },
        style,
      ]}
      {...rest}
    />
  );
}
