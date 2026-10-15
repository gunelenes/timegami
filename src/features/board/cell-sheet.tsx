import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { TextField } from '@/components/text-field';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import type { MarkDoc, Member } from '@/features/rooms/api';
import { useAppTheme } from '@/theme/theme-provider';

interface CellSheetProps {
  label: string | null;
  marks: MarkDoc[];
  members: Map<string, Member>;
  myUid: string;
  /** Locale for dates, following the app language. */
  locale: string;
  canAdd: boolean;
  onAdd: (note: string) => Promise<void>;
  onDelete: (markId: string) => void;
  onClose: () => void;
}

/** When and by whom a cell was filled, shown in the zone it was recorded in. */
function formatMarkTime(mark: MarkDoc, locale: string): string {
  return new Intl.DateTimeFormat(locale, {
    timeZone: mark.timeZone,
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(mark.occurredAt));
}

export function CellSheet({ label, marks, members, myUid, locale, canAdd, onAdd, onDelete, onClose }: CellSheetProps) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { colors, definition } = useAppTheme();
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  const add = async () => {
    setSaving(true);
    try {
      await onAdd(note);
      setNote('');
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = (markId: string) =>
    Alert.alert(t('cell.deleteConfirm'), undefined, [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('common.delete'), style: 'destructive', onPress: () => onDelete(markId) },
    ]);

  return (
    <Modal visible={label !== null} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <ThemedView
        style={[
          styles.sheet,
          { paddingBottom: insets.bottom + Spacing.three, borderTopLeftRadius: definition.radius.lg, borderTopRightRadius: definition.radius.lg },
        ]}>
        <View style={[styles.handle, { backgroundColor: colors.border }]} />
        <ThemedText type="subtitle">{label}</ThemedText>
        <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
          {marks.length === 0 && <ThemedText themeColor="textSecondary">{t('cell.empty')}</ThemedText>}
          {marks.map((mark) => {
            const member = members.get(mark.uid);
            return (
              <ThemedView key={mark.id} type="backgroundElement" style={[styles.entry, { borderColor: colors.border, borderRadius: definition.radius.md }]}>
                <View style={[styles.dot, { backgroundColor: member?.color ?? '#888' }]} />
                <View style={styles.entryText}>
                  <ThemedText type="smallBold">{member?.nickname ?? '?'}</ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">
                    {formatMarkTime(mark, locale)} · {mark.timeZone} · {t(`cell.${mark.source}`)}
                  </ThemedText>
                  {mark.note ? <ThemedText type="small">{mark.note}</ThemedText> : null}
                </View>
                {mark.uid === myUid && (
                  <Pressable accessibilityRole="button" onPress={() => confirmDelete(mark.id)} hitSlop={12}>
                    <ThemedText type="caption" themeColor="danger">
                      {t('common.delete')}
                    </ThemedText>
                  </Pressable>
                )}
              </ThemedView>
            );
          })}
        </ScrollView>
        {canAdd && (
          <View style={styles.add}>
            <TextField value={note} onChangeText={setNote} placeholder={t('cell.notePlaceholder')} maxLength={280} />
            <Button title={t('cell.add')} icon="plus" onPress={add} loading={saving} />
          </View>
        )}
        <Button title={t('common.close')} variant="secondary" onPress={onClose} />
      </ThemedView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(20,10,40,0.45)',
  },
  sheet: {
    maxHeight: '75%',
    padding: Spacing.four,
    paddingTop: Spacing.two,
    gap: Spacing.three,
  },
  handle: {
    alignSelf: 'center',
    width: 44,
    height: 5,
    borderRadius: 3,
  },
  list: {
    flexGrow: 0,
  },
  listContent: {
    gap: Spacing.two,
  },
  entry: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    padding: Spacing.three,
    borderWidth: 2,
  },
  dot: {
    width: 14,
    height: 14,
    borderRadius: 7,
  },
  entryText: {
    flex: 1,
  },
  add: {
    gap: Spacing.two,
  },
});
