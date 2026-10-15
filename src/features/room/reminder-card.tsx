import { useTranslation } from 'react-i18next';
import { Alert, StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { Icon } from '@/components/icon';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { ensureNotificationPermission } from '@/lib/notifications';
import { usePreferences } from '@/lib/preferences';
import { useAppTheme } from '@/theme/theme-provider';

/** Turns on streak reminders with the permission prompt, then becomes a quiet status line. */
export function ReminderCard() {
  const { t } = useTranslation();
  const { colors } = useAppTheme();
  const prefs = usePreferences();

  const enable = async () => {
    if (await ensureNotificationPermission(t('settings.streakReminders'))) {
      prefs.update({ streakReminders: true });
    } else {
      Alert.alert(t('settings.permissionDenied'));
    }
  };

  if (prefs.streakReminders) {
    return (
      <View style={styles.status}>
        <Icon name="bell" size={16} color={colors.textSecondary} />
        <ThemedText type="caption" themeColor="textSecondary">
          {t('room.reminderOn')}
        </ThemedText>
      </View>
    );
  }

  return (
    <Card style={styles.card}>
      <View style={styles.row}>
        <Icon name="bell" color={colors.accent} />
        <ThemedText type="heading" style={styles.flex}>
          {t('room.reminderTitle')}
        </ThemedText>
      </View>
      <ThemedText type="small" themeColor="textSecondary">
        {t('room.reminderBody')}
      </ThemedText>
      <Button title={t('room.reminderEnable')} size="small" onPress={enable} />
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: Spacing.two,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  flex: {
    flex: 1,
  },
  status: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.one,
  },
});
