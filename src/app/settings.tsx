import * as Linking from 'expo-linking';
import { router } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Platform, Pressable, ScrollView, StyleSheet, Switch, View } from 'react-native';

import { Button } from '@/components/button';

import { Card } from '@/components/card';
import { Icon } from '@/components/icon';
import { SegmentedControl } from '@/components/segmented-control';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { deleteAccount } from '@/features/rooms/api';
import { CONTACT_EMAIL } from '@/legal';
import { LANGUAGE_NAMES, SUPPORTED_LANGUAGES, systemLanguage } from '@/lib/i18n';
import { tapFeedback } from '@/lib/haptics';
import { clearLocalAppData } from '@/lib/local-data';
import { cancelStreakReminders, ensureNotificationPermission } from '@/lib/notifications';
import { usePreferences, type Appearance, type LanguagePreference } from '@/lib/preferences';
import { useAppTheme } from '@/theme/theme-provider';
import { THEME_IDS, type ThemeId } from '@/theme/themes';

export default function SettingsScreen() {
  const { t } = useTranslation();
  const prefs = usePreferences();
  const { colors } = useAppTheme();
  const [deleting, setDeleting] = useState(false);

  const runDelete = async () => {
    setDeleting(true);
    try {
      await deleteAccount();
      await cancelStreakReminders().catch(() => {});
      await clearLocalAppData();
      await prefs.reset(); // back to the first-launch notice, like a fresh install
      Alert.alert(t('settings.deleted'));
    } catch (e) {
      console.error(e);
      Alert.alert(t('settings.deleteFailed'));
    } finally {
      setDeleting(false);
    }
  };

  const confirmDelete = () =>
    Alert.alert(t('settings.deleteConfirmTitle'), t('settings.deleteConfirmBody'), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('settings.deleteConfirmButton'), style: 'destructive', onPress: runDelete },
    ]);

  const toggleReminders = async (on: boolean) => {
    if (!on) {
      prefs.update({ streakReminders: false });
      cancelStreakReminders().catch(console.error);
    } else if (await ensureNotificationPermission(t('settings.streakReminders'))) {
      prefs.update({ streakReminders: true });
    } else {
      Alert.alert(t('settings.permissionDenied'));
    }
  };

  const languages: { value: LanguagePreference; label: string; hint?: string }[] = [
    { value: 'system', label: t('settings.systemLanguage'), hint: LANGUAGE_NAMES[systemLanguage()] },
    ...SUPPORTED_LANGUAGES.map((l) => ({ value: l, label: LANGUAGE_NAMES[l] })),
  ];

  return (
    <ThemedView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Section title={t('settings.language')}>
          <Card style={styles.list}>
            {languages.map((l, i) => (
              <OptionRow
                key={l.value}
                label={l.label}
                hint={l.hint}
                selected={prefs.language === l.value}
                divider={i > 0}
                onPress={() => prefs.update({ language: l.value })}
              />
            ))}
          </Card>
        </Section>

        <Section title={t('settings.appearance')}>
          <SegmentedControl<Appearance>
            options={[
              { value: 'system', label: t('settings.appearanceSystem') },
              { value: 'light', label: t('settings.appearanceLight') },
              { value: 'dark', label: t('settings.appearanceDark') },
            ]}
            value={prefs.appearance}
            onChange={(appearance) => prefs.update({ appearance })}
          />
        </Section>

        {Platform.OS !== 'web' && (
          <Section title={t('settings.notifications')}>
            <Card style={styles.switchRow}>
              <View style={styles.rowText}>
                <ThemedText type="smallBold" style={styles.rowLabel}>
                  {t('settings.streakReminders')}
                </ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  {t('settings.streakRemindersHint')}
                </ThemedText>
              </View>
              <Switch
                accessibilityLabel={t('settings.streakReminders')}
                value={prefs.streakReminders}
                onValueChange={toggleReminders}
                trackColor={{ true: colors.accent, false: colors.backgroundSelected }}
                thumbColor="#FFFFFF"
              />
            </Card>
          </Section>
        )}

        {/* The picker appears once there is more than one look to choose from. */}
        {THEME_IDS.length > 1 && (
          <Section title={t('settings.theme')}>
            <Card style={styles.list}>
              {THEME_IDS.map((id: ThemeId, i) => (
                <OptionRow
                  key={id}
                  label={t(`themes.${id}`)}
                  selected={prefs.themeId === id}
                  divider={i > 0}
                  onPress={() => prefs.update({ themeId: id })}
                />
              ))}
            </Card>
          </Section>
        )}

        <Section title={t('settings.privacySection')}>
          <Card style={styles.list}>
            <LinkRow
              label={t('settings.privacy')}
              onPress={() => router.push({ pathname: '/legal/[kind]', params: { kind: 'privacy' } })}
            />
            <LinkRow
              label={t('settings.terms')}
              divider
              onPress={() => router.push({ pathname: '/legal/[kind]', params: { kind: 'terms' } })}
            />
            <LinkRow label={t('settings.contact')} hint={CONTACT_EMAIL} divider onPress={() => Linking.openURL(`mailto:${CONTACT_EMAIL}`)} />
          </Card>
          <Button
            title={t('settings.deleteAccount')}
            variant="danger"
            loading={deleting}
            onPress={confirmDelete}
            style={styles.deleteButton}
          />
          <ThemedText type="small" themeColor="textSecondary">
            {t('settings.deleteAccountHint')}
          </ThemedText>
        </Section>
      </ScrollView>
    </ThemedView>
  );
}

function LinkRow({ label, hint, divider, onPress }: { label: string; hint?: string; divider?: boolean; onPress: () => void }) {
  const { colors } = useAppTheme();
  return (
    <Pressable
      accessibilityRole="link"
      onPress={onPress}
      style={[styles.row, divider && { borderTopWidth: 1, borderTopColor: colors.border }]}>
      <View style={styles.rowText}>
        <ThemedText type="smallBold" style={styles.rowLabel}>
          {label}
        </ThemedText>
        {hint && (
          <ThemedText type="small" themeColor="textSecondary">
            {hint}
          </ThemedText>
        )}
      </View>
      <Icon name="chevronRight" color={colors.textSecondary} />
    </Pressable>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <ThemedText type="smallBold" themeColor="textSecondary">
        {title}
      </ThemedText>
      {children}
    </View>
  );
}

function OptionRow({
  label,
  hint,
  selected,
  divider,
  onPress,
}: {
  label: string;
  hint?: string;
  selected: boolean;
  divider: boolean;
  onPress: () => void;
}) {
  const { colors } = useAppTheme();
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
      onPress={() => {
        tapFeedback();
        onPress();
      }}
      style={[styles.row, divider && { borderTopWidth: 1, borderTopColor: colors.border }]}>
      <View style={styles.rowText}>
        <ThemedText type="smallBold" style={styles.rowLabel}>
          {label}
        </ThemedText>
        {hint && (
          <ThemedText type="small" themeColor="textSecondary">
            {hint}
          </ThemedText>
        )}
      </View>
      {selected && <Icon name="check" color={colors.accent} />}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: Spacing.four,
    gap: Spacing.four,
    maxWidth: MaxContentWidth,
    width: '100%',
    alignSelf: 'center',
  },
  section: {
    gap: Spacing.two,
  },
  list: {
    paddingVertical: 0,
  },
  deleteButton: {
    marginTop: Spacing.two,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  row: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingVertical: Spacing.two,
  },
  rowText: {
    flex: 1,
  },
  rowLabel: {
    fontSize: 16,
    lineHeight: 22,
  },
});
