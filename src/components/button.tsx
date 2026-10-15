import { ActivityIndicator, Pressable, StyleSheet, View, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';

import { Icon, type IconName } from '@/components/icon';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { tapFeedback } from '@/lib/haptics';
import { useAppTheme } from '@/theme/theme-provider';

type ButtonProps = Omit<PressableProps, 'children' | 'style'> & {
  title: string;
  variant?: 'primary' | 'secondary' | 'action' | 'danger';
  size?: 'small' | 'normal' | 'large';
  icon?: IconName;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
};

const HEIGHTS = { small: 44, normal: 56, large: 76 };

/** Raised button: the face sinks onto its solid ledge while pressed. */
export function Button({ title, variant = 'primary', size = 'normal', icon, loading, disabled, style, onPress, ...rest }: ButtonProps) {
  const { colors, definition } = useAppTheme();
  const inactive = disabled || loading;
  const depth = definition.depth;
  const radius = size === 'large' ? definition.radius.lg : definition.radius.md;

  const { face, ledge, label, border } = {
    primary: { face: colors.accent, ledge: colors.accentShadow, label: colors.onAccent, border: undefined },
    secondary: { face: colors.backgroundElement, ledge: colors.border, label: colors.accent, border: colors.border },
    action: { face: colors.action, ledge: colors.actionShadow, label: colors.onAction, border: undefined },
    danger: { face: colors.backgroundElement, ledge: colors.border, label: colors.danger, border: colors.border },
  }[variant];

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!inactive, busy: !!loading }}
      disabled={inactive}
      onPress={(e) => {
        tapFeedback();
        onPress?.(e);
      }}
      style={[{ paddingBottom: depth }, inactive && styles.dimmed, style]}
      {...rest}>
      {({ pressed }) => (
        <>
          <View style={[styles.ledge, { top: depth, borderRadius: radius, backgroundColor: ledge }]} />
          <View
            style={[
              styles.face,
              {
                height: HEIGHTS[size],
                borderRadius: radius,
                backgroundColor: face,
                transform: [{ translateY: pressed ? depth : 0 }],
              },
              border && { borderWidth: 2, borderColor: border },
            ]}>
            {loading ? (
              <ActivityIndicator color={label} />
            ) : (
              <>
                {icon && <Icon name={icon} size={size === 'large' ? 28 : 20} color={label} />}
                <ThemedText
                  type={size === 'large' ? 'subtitle' : 'heading'}
                  style={[{ color: label }, size === 'small' && styles.smallText, size === 'normal' && styles.normalText]}
                  numberOfLines={1}>
                  {title}
                </ThemedText>
              </>
            )}
          </View>
        </>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  ledge: {
    ...StyleSheet.absoluteFill,
  },
  face: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.four,
  },
  smallText: {
    fontSize: 16,
    lineHeight: 20,
  },
  normalText: {
    fontSize: 19,
    lineHeight: 24,
  },
  dimmed: {
    opacity: 0.5,
  },
});
