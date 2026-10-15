import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { TextField } from '@/components/text-field';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { renameInRoom } from '@/features/rooms/api';
import { errorMessage } from '@/features/rooms/hooks';
import { useAppTheme } from '@/theme/theme-provider';

/** Changes the player's nickname in one room. */
export function RenameSheet({ roomId, current, visible, onClose }: { roomId: string; current: string; visible: boolean; onClose: () => void }) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { definition } = useAppTheme();
  const [name, setName] = useState(current);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (visible) {
      setName(current);
      setError(null);
    }
  }, [visible, current]);

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      await renameInRoom(roomId, name);
      onClose();
    } catch (e) {
      setError(errorMessage(t, e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel={t('common.close')} />
        <ThemedView
          style={[
            styles.sheet,
            { paddingBottom: insets.bottom + Spacing.three, borderTopLeftRadius: definition.radius.lg, borderTopRightRadius: definition.radius.lg },
          ]}>
          <ThemedText type="heading">{t('room.rename')}</ThemedText>
          <TextField
            label={t('common.nickname')}
            value={name}
            onChangeText={setName}
            placeholder={t('common.nicknamePlaceholder')}
            maxLength={20}
            autoFocus
            returnKeyType="done"
            onSubmitEditing={save}
          />
          {error && <ThemedText themeColor="danger">{error}</ThemedText>}
          <View style={styles.actions}>
            <Button title={t('common.cancel')} variant="secondary" onPress={onClose} style={styles.flex} />
            <Button title={t('room.renameSave')} onPress={save} loading={saving} disabled={!name.trim()} style={styles.flex} />
          </View>
        </ThemedView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(20,10,40,0.45)',
  },
  sheet: {
    padding: Spacing.four,
    gap: Spacing.three,
  },
  actions: {
    flexDirection: 'row',
    gap: Spacing.three,
  },
});
