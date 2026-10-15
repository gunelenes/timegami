import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { Icon, type IconName } from '@/components/icon';
import { Wordmark } from '@/components/logo';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { LegalDocumentView } from '@/features/legal/legal-document';
import { LEGAL_VERSION, legalDocument, type LegalKind } from '@/legal';
import { usePreferences } from '@/lib/preferences';
import { useAppTheme } from '@/theme/theme-provider';

/**
 * First-launch privacy notice (KVKK aydınlatma). It informs; it does not ask for consent, since the
 * data is processed to provide the service. Shown before anything signs in or reaches the server.
 */
export function WelcomeGate() {
  const { t, i18n } = useTranslation();
  const insets = useSafeAreaInsets();
  const { update } = usePreferences();
  const [reading, setReading] = useState<LegalKind | null>(null);

  if (reading) {
    return (
      <ThemedView style={styles.container}>
        <ScrollView contentContainerStyle={[styles.content, { paddingTop: insets.top + Spacing.four, paddingBottom: insets.bottom + Spacing.four }]}>
          <LegalDocumentView document={legalDocument(reading, i18n.language)} />
          <Button title={t('welcome.back')} variant="secondary" onPress={() => setReading(null)} style={styles.back} />
        </ScrollView>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <ScrollView contentContainerStyle={[styles.content, { paddingTop: insets.top + Spacing.five, paddingBottom: insets.bottom + Spacing.four }]}>
        <Wordmark size={34} />
        <ThemedText type="subtitle" style={styles.title}>
          {t('welcome.title')}
        </ThemedText>

        <Card style={styles.points}>
          <Point icon="userPlus" text={t('welcome.pointAnonymous')} />
          <Point icon="share" text={t('welcome.pointShared')} />
          <Point icon="check" text={t('welcome.pointDelete')} />
        </Card>

        <View style={styles.links}>
          <LinkRow label={t('welcome.privacy')} onPress={() => setReading('privacy')} />
          <LinkRow label={t('welcome.terms')} onPress={() => setReading('terms')} />
        </View>

        <View style={styles.footer}>
          <ThemedText type="small" themeColor="textSecondary" style={styles.center}>
            {t('welcome.termsNote')}
          </ThemedText>
          <Button title={t('welcome.continue')} onPress={() => update({ legalNoticeSeen: LEGAL_VERSION })} />
        </View>
      </ScrollView>
    </ThemedView>
  );
}

function Point({ icon, text }: { icon: IconName; text: string }) {
  const { colors } = useAppTheme();
  return (
    <View style={styles.point}>
      <View style={[styles.pointIcon, { backgroundColor: colors.backgroundSelected }]}>
        <Icon name={icon} size={18} color={colors.accent} />
      </View>
      <ThemedText type="small" style={styles.pointText}>
        {text}
      </ThemedText>
    </View>
  );
}

function LinkRow({ label, onPress }: { label: string; onPress: () => void }) {
  const { colors } = useAppTheme();
  return (
    <Pressable accessibilityRole="link" onPress={onPress} style={styles.linkRow}>
      <ThemedText type="link" style={styles.pointText}>
        {label}
      </ThemedText>
      <Icon name="chevronRight" size={18} color={colors.accent} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: Spacing.four,
    gap: Spacing.four,
    maxWidth: MaxContentWidth,
    width: '100%',
    alignSelf: 'center',
  },
  title: {
    marginTop: Spacing.two,
  },
  points: {
    gap: Spacing.three,
  },
  point: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  pointIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pointText: {
    flex: 1,
  },
  links: {
    gap: Spacing.one,
  },
  linkRow: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
  },
  footer: {
    marginTop: 'auto',
    gap: Spacing.three,
  },
  center: {
    textAlign: 'center',
  },
  back: {
    marginTop: Spacing.three,
  },
});
