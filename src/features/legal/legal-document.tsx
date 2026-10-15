import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import type { LegalDocument } from '@/legal';

/** Plain, readable rendering of a privacy notice or terms document. */
export function LegalDocumentView({ document }: { document: LegalDocument }) {
  return (
    <View style={styles.doc}>
      <ThemedText type="subtitle" accessibilityRole="header">
        {document.title}
      </ThemedText>
      <ThemedText type="caption" themeColor="textSecondary">
        {document.updated}
      </ThemedText>
      <ThemedText style={styles.paragraph}>{document.intro}</ThemedText>
      {document.sections.map((section) => (
        <View key={section.heading} style={styles.section}>
          <ThemedText type="heading" accessibilityRole="header">
            {section.heading}
          </ThemedText>
          {section.paragraphs.map((p) => (
            <ThemedText key={p} style={styles.paragraph}>
              {p}
            </ThemedText>
          ))}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  doc: {
    gap: Spacing.three,
  },
  section: {
    gap: Spacing.two,
  },
  paragraph: {
    lineHeight: 24,
  },
});
