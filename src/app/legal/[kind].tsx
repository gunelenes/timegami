import { Stack, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { LegalDocumentView } from '@/features/legal/legal-document';
import { legalDocument, type LegalKind } from '@/legal';

/** /legal/privacy and /legal/terms, in the app language. */
export default function LegalScreen() {
  const { i18n } = useTranslation();
  const insets = useSafeAreaInsets();
  const { kind } = useLocalSearchParams<{ kind: string }>();
  const document = legalDocument((kind === 'terms' ? 'terms' : 'privacy') as LegalKind, i18n.language);

  return (
    <ThemedView style={styles.container}>
      <Stack.Screen options={{ title: document.title }} />
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + Spacing.five }]}>
        <LegalDocumentView document={document} />
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: Spacing.four,
    maxWidth: MaxContentWidth,
    width: '100%',
    alignSelf: 'center',
  },
});
