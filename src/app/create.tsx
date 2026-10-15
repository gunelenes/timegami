import { router } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { ChipGroup } from '@/components/chip';
import { TextField } from '@/components/text-field';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import {
  CellUnit,
  GRID_TEMPLATES,
  GridConfig,
  localDateString,
  toLocalParts,
  validateGridConfig,
  wallCellCount,
} from '@/domain';
import { createRoom } from '@/features/rooms/api';
import { errorMessage } from '@/features/rooms/hooks';
import { deviceTimeZone } from '@/lib/locale';

type TemplateKey = keyof typeof GRID_TEMPLATES | 'custom';
type CustomClock = 'wall_day' | 'wall_week' | 'wall_year' | 'free';

const EMOJIS = ['🚽', '💋', '⚽', '🏃', '💪', '📚', '☕', '🎯'];
const UNITS_FOR_CLOCK: Record<CustomClock, CellUnit[]> = {
  wall_day: ['minute', 'hour'],
  wall_week: ['minute', 'hour', 'day'],
  wall_year: ['day'],
  free: ['minute', 'hour', 'day'],
};

const toInt = (s: string) => (/^\d+$/.test(s) ? Number(s) : 0);

export default function CreateScreen() {
  const { t } = useTranslation();
  const [name, setName] = useState('');
  const [emoji, setEmoji] = useState(EMOJIS[0]);
  const [nickname, setNickname] = useState('');
  const [template, setTemplate] = useState<TemplateKey>('everyMinuteOfDay');
  const [kind, setKind] = useState<GridConfig['kind']>('collection');
  const [clock, setClock] = useState<CustomClock>('wall_day');
  const [unit, setUnit] = useState<CellUnit>('minute');
  const [step, setStep] = useState('1');
  const [cellCount, setCellCount] = useState('90');
  const [days, setDays] = useState('365');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const today = localDateString(toLocalParts(Date.now(), deviceTimeZone()));
  const config = buildConfig();
  let valid = true;
  try {
    validateGridConfig(config);
  } catch {
    valid = false;
  }

  function buildConfig(): GridConfig {
    if (template !== 'custom') {
      const base = GRID_TEMPLATES[template];
      return base.clock === 'calendar' ? { ...base, startDate: today } : base;
    }
    if (kind === 'streak') {
      return { kind, clock: 'calendar', unit: 'day', step: 1, cellCount: toInt(days), startDate: today };
    }
    const s = toInt(step);
    const count = clock === 'free' ? toInt(cellCount) : (wallCellCount(clock, unit, s) ?? 0);
    return { kind, clock, unit, step: s, cellCount: count };
  }

  const selectClock = (c: CustomClock) => {
    setClock(c);
    if (!UNITS_FOR_CLOCK[c].includes(unit)) setUnit(UNITS_FOR_CLOCK[c][0]);
  };

  const submit = async () => {
    if (!name.trim()) return setError(t('errors.name_required'));
    setError(null);
    setSaving(true);
    try {
      const id = await createRoom({ name, emoji, config, nickname });
      router.replace({ pathname: '/room/[id]', params: { id } });
    } catch (e) {
      setError(errorMessage(t, e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <ThemedView style={styles.container}>
      <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <TextField label={t('create.name')} value={name} onChangeText={setName} placeholder={t('create.namePlaceholder')} maxLength={60} />

          <Section title={t('create.emoji')}>
            <ChipGroup options={EMOJIS.map((e) => ({ value: e, label: e }))} value={emoji} onChange={setEmoji} />
          </Section>

          <Section title={t('create.template')}>
            <ChipGroup
              options={[...Object.keys(GRID_TEMPLATES), 'custom'].map((k) => ({ value: k as TemplateKey, label: t(`templates.${k}`) }))}
              value={template}
              onChange={setTemplate}
            />
          </Section>

          {template === 'custom' && (
            <Card style={styles.custom}>
              <Section title={t('create.kind')}>
                <ChipGroup
                  options={[
                    { value: 'collection' as const, label: t('create.kindCollection') },
                    { value: 'streak' as const, label: t('create.kindStreak') },
                  ]}
                  value={kind}
                  onChange={setKind}
                />
                <ThemedText type="small" themeColor="textSecondary">
                  {t(kind === 'streak' ? 'create.kindStreakHint' : 'create.kindCollectionHint')}
                </ThemedText>
              </Section>

              {kind === 'streak' ? (
                <>
                  <TextField label={t('create.days')} value={days} onChangeText={setDays} keyboardType="number-pad" maxLength={4} />
                  <ThemedText type="small" themeColor="textSecondary">
                    {t('create.startsToday', { date: today })}
                  </ThemedText>
                </>
              ) : (
                <>
                  <Section title={t('create.cycle')}>
                    <ChipGroup
                      options={[
                        { value: 'wall_day' as const, label: t('create.cycleDay') },
                        { value: 'wall_week' as const, label: t('create.cycleWeek') },
                        { value: 'wall_year' as const, label: t('create.cycleYear') },
                        { value: 'free' as const, label: t('create.cycleFree') },
                      ]}
                      value={clock}
                      onChange={selectClock}
                    />
                    {clock === 'free' && (
                      <ThemedText type="small" themeColor="textSecondary">
                        {t('create.cycleFreeHint')}
                      </ThemedText>
                    )}
                  </Section>
                  <Section title={t('create.unit')}>
                    <ChipGroup
                      options={UNITS_FOR_CLOCK[clock].map((u) => ({ value: u, label: t(`create.unit${u[0].toUpperCase()}${u.slice(1)}`) }))}
                      value={unit}
                      onChange={setUnit}
                    />
                  </Section>
                  <TextField label={t('create.step')} value={step} onChangeText={setStep} keyboardType="number-pad" maxLength={4} />
                  {clock === 'free' && (
                    <TextField label={t('create.cellCount')} value={cellCount} onChangeText={setCellCount} keyboardType="number-pad" maxLength={4} />
                  )}
                </>
              )}
            </Card>
          )}

          <ThemedText type="smallBold" themeColor={valid ? 'text' : 'danger'}>
            {valid ? t('create.summary', { count: config.cellCount }) : t('create.invalid')}
          </ThemedText>

          <TextField
            label={t('common.nickname')}
            value={nickname}
            onChangeText={setNickname}
            placeholder={t('common.nicknamePlaceholder')}
            maxLength={20}
          />

          {error && <ThemedText themeColor="danger">{error}</ThemedText>}
          <Button title={t('create.submit')} icon="star" onPress={submit} loading={saving} disabled={!valid} />
        </ScrollView>
      </KeyboardAvoidingView>
    </ThemedView>
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
  custom: {
    gap: Spacing.three,
  },
});
