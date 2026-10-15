import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { TextField } from '@/components/text-field';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { joinRoom } from '@/features/rooms/api';
import { errorMessage } from '@/features/rooms/hooks';

/** Also opened from invite links: timegami://join?code=ABC123 */
export default function JoinScreen() {
  const { t } = useTranslation();
  const params = useLocalSearchParams<{ code?: string }>();
  const [code, setCode] = useState(params.code ?? '');
  const [nickname, setNickname] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    setError(null);
    setSaving(true);
    try {
      const id = await joinRoom(code, nickname);
      router.replace({ pathname: '/room/[id]', params: { id } });
    } catch (e) {
      setError(errorMessage(t, e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <ThemedView style={styles.container}>
      <View style={styles.content}>
        <TextField
          label={t('join.code')}
          value={code}
          onChangeText={setCode}
          autoCapitalize="characters"
          autoCorrect={false}
          placeholder="ABC123"
          maxLength={12}
          style={styles.code}
        />
        <TextField
          label={t('common.nickname')}
          value={nickname}
          onChangeText={setNickname}
          placeholder={t('common.nicknamePlaceholder')}
          maxLength={20}
        />
        {error && <ThemedText themeColor="danger">{error}</ThemedText>}
        <Button title={t('join.submit')} onPress={submit} loading={saving} disabled={!code.trim()} />
      </View>
    </ThemedView>
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
  code: {
    fontSize: 26,
    letterSpacing: 4,
    textAlign: 'center',
  },
});
