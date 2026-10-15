import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { Icon } from '@/components/icon';
import { Burst, Pulse } from '@/components/motion';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useAppTheme } from '@/theme/theme-provider';

interface NowCardProps {
  /** Label of the cell "now" falls into, or null when the clock is outside the grid. */
  label: string | null;
  /** How often I already marked that cell. */
  myCount: number;
  /** "Next empty: 14:52 · in 15 min", or null. */
  next: string | null;
  loading: boolean;
  toast: string | null;
  /** Bumped on every newly captured cell to fire the confetti. */
  celebrate: number;
  onPress: () => void;
}

/** The heart of the app: the current cell and the big "It happened now!" button. */
export function NowCard({ label, myCount, next, loading, toast, celebrate, onPress }: NowCardProps) {
  const { t } = useTranslation();
  const { colors, palette, definition } = useAppTheme();
  const isNew = myCount === 0;

  return (
    <Card style={styles.card}>
      {label === null ? (
        <ThemedText themeColor="textSecondary" style={styles.center}>
          {t('room.nowUnavailable')}
        </ThemedText>
      ) : (
        <View style={styles.clockRow}>
          <ThemedText type="title" style={styles.clock} numberOfLines={1} adjustsFontSizeToFit>
            {label}
          </ThemedText>
          <View
            style={[
              styles.badge,
              { borderRadius: definition.radius.sm, backgroundColor: isNew ? colors.successSoft : colors.accent },
            ]}>
            {!isNew && <Icon name="check" size={14} strokeWidth={3} color={colors.onAccent} />}
            <ThemedText type="caption" style={{ color: isNew ? colors.success : colors.onAccent }}>
              {isNew ? t('room.nowEmpty') : t('room.nowMine', { count: myCount })}
            </ThemedText>
          </View>
        </View>
      )}

      {next && (
        <ThemedText type="small" themeColor="textSecondary" style={styles.center}>
          {next}
        </ThemedText>
      )}

      <View style={styles.buttonWrap}>
        <Pulse active={label !== null && isNew && !loading}>
          <Button title={t('room.now')} icon="bolt" variant="action" size="large" onPress={onPress} loading={loading} disabled={label === null} />
        </Pulse>
        <Burst trigger={celebrate} colors={palette.confetti} />
      </View>

      <ThemedText type="smallBold" themeColor="accent" style={styles.toast} accessibilityLiveRegion="polite">
        {toast ?? ' '}
      </ThemedText>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: Spacing.three,
    paddingTop: Spacing.four,
    paddingBottom: Spacing.two,
  },
  clockRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.three,
  },
  clock: {
    fontSize: 56,
    lineHeight: 62,
    flexShrink: 1,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  buttonWrap: {
    justifyContent: 'center',
  },
  center: {
    textAlign: 'center',
  },
  toast: {
    textAlign: 'center',
  },
});
