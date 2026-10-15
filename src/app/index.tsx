import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { Icon } from '@/components/icon';
import { Wordmark } from '@/components/logo';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import type { Room } from '@/features/rooms/api';
import { useMyRooms, useUid } from '@/features/rooms/hooks';
import { useAppTheme } from '@/theme/theme-provider';

export default function HomeScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const uid = useUid();
  const rooms = useMyRooms(uid);

  return (
    <ThemedView style={styles.container}>
      <FlatList
        data={rooms ?? []}
        keyExtractor={(r) => r.id}
        contentContainerStyle={[styles.list, { paddingTop: insets.top + Spacing.four }]}
        ListHeaderComponent={<Header showSection={!!rooms?.length} />}
        ListEmptyComponent={rooms === null ? <ActivityIndicator /> : <EmptyState />}
        renderItem={({ item }) => <RoomCard room={item} />}
      />
      <View style={[styles.actions, { paddingBottom: insets.bottom + Spacing.three }]}>
        <Button title={t('home.newChallenge')} icon="plus" onPress={() => router.push('/create')} />
        <Button title={t('home.join')} variant="secondary" onPress={() => router.push('/join')} />
      </View>
    </ThemedView>
  );
}

function Header({ showSection }: { showSection: boolean }) {
  const { t } = useTranslation();
  const { colors } = useAppTheme();
  return (
    <View style={styles.header}>
      <View style={styles.titleRow}>
        <View style={styles.titleText}>
          <Wordmark size={32} />
          <ThemedText type="smallBold" themeColor="textSecondary" style={styles.tagline}>
            {t('home.tagline')}
          </ThemedText>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('settings.title')}
          onPress={() => router.push('/settings')}
          style={[styles.iconButton, { backgroundColor: colors.backgroundElement, borderColor: colors.border }]}>
          <Icon name="settings" color={colors.accent} />
        </Pressable>
      </View>
      {showSection && <ThemedText type="heading">{t('home.myRooms')}</ThemedText>}
    </View>
  );
}

/** Stable pick from the theme's tints, so a room keeps its colour across launches. */
function tintFor(roomId: string, tints: readonly string[]): string {
  let hash = 0;
  for (let i = 0; i < roomId.length; i++) hash = (hash * 31 + roomId.charCodeAt(i)) | 0;
  return tints[Math.abs(hash) % tints.length];
}

function RoomCard({ room }: { room: Room }) {
  const { t } = useTranslation();
  const { palette, definition } = useAppTheme();
  const players = Object.keys(room.memberColors).length;
  return (
    <Pressable accessibilityRole="button" onPress={() => router.push({ pathname: '/room/[id]', params: { id: room.id } })}>
      {({ pressed }) => (
        <Card style={[styles.room, pressed && styles.pressed]}>
          <View style={[styles.emojiTile, { backgroundColor: tintFor(room.id, palette.roomTints), borderRadius: definition.radius.md }]}>
            <ThemedText style={styles.emoji}>{room.emoji}</ThemedText>
          </View>
          <View style={styles.roomText}>
            <ThemedText type="smallBold" style={styles.roomName} numberOfLines={1}>
              {room.name}
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
              {t(room.config.kind === 'streak' ? 'create.kindStreak' : 'create.kindCollection')} ·{' '}
              {t('create.summary', { count: room.config.cellCount })} · {t('home.members', { count: players })}
            </ThemedText>
          </View>
        </Card>
      )}
    </Pressable>
  );
}

function EmptyState() {
  const { t } = useTranslation();
  return (
    <Card style={styles.empty}>
      <ThemedText style={styles.emptyEmoji}>🚽 ⚽ 🏃</ThemedText>
      <ThemedText type="heading" style={styles.centerText}>
        {t('home.emptyTitle')}
      </ThemedText>
      <ThemedText themeColor="textSecondary" style={styles.centerText}>
        {t('home.empty')}
      </ThemedText>
    </Card>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  list: {
    paddingHorizontal: Spacing.four,
    paddingBottom: Spacing.four,
    gap: Spacing.three,
    maxWidth: MaxContentWidth,
    width: '100%',
    alignSelf: 'center',
  },
  header: {
    gap: Spacing.four,
    marginBottom: Spacing.one,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  titleText: {
    flex: 1,
  },
  tagline: {
    marginTop: 6,
  },
  iconButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  room: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  pressed: {
    opacity: 0.8,
  },
  emojiTile: {
    width: 56,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emoji: {
    fontSize: 30,
    lineHeight: 38,
  },
  roomText: {
    flex: 1,
    gap: 2,
  },
  roomName: {
    fontSize: 17,
    lineHeight: 22,
  },
  empty: {
    alignItems: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.five,
  },
  emptyEmoji: {
    fontSize: 36,
    lineHeight: 46,
    marginBottom: Spacing.two,
  },
  centerText: {
    textAlign: 'center',
  },
  actions: {
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.three,
    gap: Spacing.three,
    maxWidth: MaxContentWidth,
    width: '100%',
    alignSelf: 'center',
  },
});
