import * as Linking from 'expo-linking';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Alert, Platform, Pressable, ScrollView, Share, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { Icon } from '@/components/icon';
import { ProgressRing } from '@/components/progress-ring';
import { SegmentedControl } from '@/components/segmented-control';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import {
  applicableBadges,
  buildBoard,
  buildGridLayout,
  buildSections,
  calendarPosition,
  cellLabel,
  collectionProgress,
  completedHour,
  earnedBadges,
  filledCells,
  nextEmptyCell,
  streakProgress,
  streakReminderTimes,
  timestampToCell,
  type CollectionProgress,
  type StreakProgress,
} from '@/domain';
import { BoardGrid, CellStatus } from '@/features/board/board-grid';
import { BoardSections } from '@/features/board/board-sections';
import { CellSheet } from '@/features/board/cell-sheet';
import { NowCard } from '@/features/board/now-card';
import { ActivityFeed } from '@/features/room/activity-feed';
import { BadgeCelebration, BadgesCard } from '@/features/room/badges';
import { MissingList } from '@/features/room/missing-list';
import { ReminderCard } from '@/features/room/reminder-card';
import { RenameSheet } from '@/features/room/rename-sheet';
import { reportByEmail } from '@/features/room/report';
import { ShareImage, canShareImage, type ShareImageData } from '@/features/room/share-image';
import { useBadgeCelebrations } from '@/features/room/use-badge-celebrations';
import {
  MarkDoc,
  Member,
  Room,
  deleteMark,
  deleteRoom,
  leaveRoom,
  markCell,
  markNow,
  regenerateInviteCode,
  removeMember,
} from '@/features/rooms/api';
import { errorMessage, useNow, useRoomData, useUid } from '@/features/rooms/hooks';
import { mixColor } from '@/lib/color';
import { formatIn } from '@/lib/format';
import { successFeedback } from '@/lib/haptics';
import { appLocale, deviceTimeZone } from '@/lib/locale';
import { cancelStreakReminders, scheduleStreakReminders } from '@/lib/notifications';
import { usePreferences } from '@/lib/preferences';
import { useAppTheme } from '@/theme/theme-provider';

type BoardView = 'mine' | 'shared' | 'heat';

const REMINDER_HOUR = 20;
const REMINDER_DAYS = 7;

export default function RoomScreen() {
  const { t } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const uid = useUid();
  const state = useRoomData(id, uid);

  if (state.status === 'ready' && uid) {
    return <RoomBoard uid={uid} room={state.room} members={state.members} marks={state.marks} />;
  }
  return (
    <ThemedView style={styles.center}>
      {state.status === 'loading' ? (
        <ActivityIndicator />
      ) : (
        <>
          <ThemedText themeColor="textSecondary" style={styles.centerText}>
            {t('room.notFound')}
          </ThemedText>
          <Button title={t('common.close')} variant="secondary" size="small" onPress={() => router.dismissTo('/')} style={styles.actions} />
        </>
      )}
    </ThemedView>
  );
}

function RoomBoard({ uid, room, members, marks }: { uid: string; room: Room; members: Member[]; marks: MarkDoc[] }) {
  const { t, i18n } = useTranslation();
  const insets = useSafeAreaInsets();
  const now = useNow();
  const { colors } = useAppTheme();
  const { streakReminders } = usePreferences();
  const [view, setView] = useState<BoardView>('mine');
  const [openCell, setOpenCell] = useState<number | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [celebrate, setCelebrate] = useState(0);
  const [marking, setMarking] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [shareRequest, setShareRequest] = useState(0);

  const { config } = room;
  const locale = appLocale(i18n.language);
  const timeZone = deviceTimeZone();
  const isStreak = config.kind === 'streak';

  // Large boards (e.g. every minute of the week) are shown as sections instead of one giant grid.
  const sections = useMemo(() => buildSections(config, locale), [config, locale]);
  const layout = useMemo(() => (sections ? null : buildGridLayout(config, locale)), [sections, config, locale]);
  const memberMap = useMemo(() => new Map(members.map((m) => [m.uid, m])), [members]);
  const onlyMine = view === 'mine' ? uid : undefined;
  const board = useMemo(() => buildBoard(marks, onlyMine), [marks, onlyMine]);
  const filled = useMemo(() => filledCells(marks, onlyMine), [marks, onlyMine]);
  const myFilled = useMemo(() => filledCells(marks, uid), [marks, uid]);

  const nowCell = config.clock === 'free' ? null : timestampToCell(now, config, timeZone);
  const today = isStreak ? calendarPosition(now, config, timeZone) : null;
  const streak = today !== null ? streakProgress(filled, config.cellCount, today) : null;
  const collection = streak ? null : collectionProgress(filled, config.cellCount);
  const missed = useMemo(() => new Set(streak?.missed ?? []), [streak?.missed]);

  /** Heat map: one tone per cell, darker the more players filled it. */
  const heatColor = (players: number) => mixColor(colors.cellEmpty, colors.accent, 0.3 + 0.7 * (players / Math.max(1, members.length)));
  const statusOf = (cell: number): CellStatus => {
    const players = [...(board.get(cell)?.keys() ?? [])];
    return {
      colors:
        view === 'heat'
          ? players.length > 0
            ? [heatColor(players.length)]
            : []
          : players.map((u) => room.memberColors[u] ?? colors.textSecondary),
      isNow: cell === nowCell,
      missed: missed.has(cell),
      future: today !== null && cell > today,
    };
  };
  const labelOf = (cell: number) => cellLabel(config, cell, locale);

  // Badges are derived from my cells; each one is celebrated once, then never again.
  const availableBadges = useMemo(() => applicableBadges(config), [config]);
  const earned = useMemo(() => earnedBadges(config, myFilled), [config, myFilled]);
  const badgeCelebration = useBadgeCelebrations(room.id, uid, earned);

  // Local 20:00 reminders for streak days I have not marked, refreshed whenever my marks change.
  useEffect(() => {
    if (!isStreak) return;
    if (!streakReminders) {
      cancelStreakReminders(room.id).catch(console.error);
      return;
    }
    const times = streakReminderTimes(config, myFilled, Date.now(), timeZone, REMINDER_HOUR, REMINDER_DAYS);
    scheduleStreakReminders(room.id, `${room.emoji} ${room.name}`, t('notifications.streakBody'), times).catch(console.error);
  }, [isStreak, streakReminders, config, myFilled, timeZone, room.id, room.emoji, room.name, t]);

  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(null), 2500);
    return () => clearTimeout(id);
  }, [toast]);

  const myCountIn = (cell: number) => marks.filter((m) => m.uid === uid && m.cellIndex === cell).length;
  const announce = (cell: number, before: number) => {
    if (before === 0) {
      successFeedback();
      setCelebrate((n) => n + 1);
      const hour = completedHour(config, new Set(myFilled).add(cell), cell);
      setToast(
        hour !== null
          ? t('room.hourComplete', { hour: `${String(hour).padStart(2, '0')}:00` })
          : t('room.newCell', { cell: labelOf(cell) }),
      );
    } else {
      setToast(t('room.repeatCell', { cell: labelOf(cell), count: before + 1 }));
    }
  };

  const onNow = async () => {
    if (nowCell === null) return;
    const before = myCountIn(nowCell);
    setMarking(true);
    try {
      announce(await markNow(room), before);
    } catch (e) {
      Alert.alert(errorMessage(t, e));
    } finally {
      setMarking(false);
    }
  };

  const onAdd = async (note: string) => {
    if (openCell === null) return;
    const before = myCountIn(openCell);
    try {
      await markCell(room, openCell, note.trim() || undefined);
      announce(openCell, before);
      setOpenCell(null);
    } catch (e) {
      Alert.alert(errorMessage(t, e));
    }
  };

  const next = config.clock === 'calendar' ? null : nextEmptyCell(config, myFilled, nowCell, now, timeZone);
  const nextText = next
    ? t('room.nextEmpty', {
        cell: labelOf(next.cell),
        when: next.minutesUntil !== null ? formatIn(t, next.minutesUntil) : t('time.inDays', { count: next.steps * config.step }),
      })
    : null;

  const percent = new Intl.NumberFormat(locale, { style: 'percent', maximumFractionDigits: 1 });
  const number = new Intl.NumberFormat(locale);
  const shareData: ShareImageData = {
    emoji: room.emoji,
    name: room.name,
    percent: percent.format(Math.floor((filled.size / config.cellCount) * 1000) / 1000),
    detail: `${number.format(filled.size)} / ${number.format(config.cellCount)}`,
    layout,
    sections: sections
      ? sections.map((s) => {
          let count = 0;
          for (let c = s.first; c < s.first + s.count; c++) if (filled.has(c)) count++;
          return { label: s.label, ratio: count / s.count };
        })
      : null,
    colorsOf: (cell) => statusOf(cell).colors,
  };

  const cellMarks = openCell === null ? [] : marks.filter((m) => m.cellIndex === openCell).reverse();
  const canAddToOpenCell = openCell !== null && (today === null || openCell <= today);
  const ranked = rankPlayers(members, marks);
  const me = memberMap.get(uid);

  return (
    <ThemedView style={styles.container}>
      <Stack.Screen
        options={{
          title: `${room.emoji} ${room.name}`,
          headerRight: canShareImage
            ? () => (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={t('room.shareImage')}
                  hitSlop={12}
                  onPress={() => setShareRequest((n) => n + 1)}>
                  <Icon name="share" color={colors.accent} />
                </Pressable>
              )
            : undefined,
        }}
      />
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + Spacing.five }]}>
        <SegmentedControl<BoardView>
          options={[
            { value: 'mine', label: t('room.myBoard') },
            { value: 'shared', label: t('room.sharedBoard') },
            { value: 'heat', label: t('room.heatBoard') },
          ]}
          value={view}
          onChange={setView}
        />

        {config.clock !== 'free' ? (
          <NowCard
            label={nowCell === null ? null : labelOf(nowCell)}
            myCount={nowCell === null ? 0 : myCountIn(nowCell)}
            next={nextText}
            loading={marking}
            toast={toast}
            celebrate={celebrate}
            onPress={onNow}
          />
        ) : (
          <Card>
            <ThemedText type="smallBold" themeColor={toast ? 'accent' : 'textSecondary'} style={styles.centerText}>
              {toast ?? t('room.tapCell')}
            </ThemedText>
          </Card>
        )}

        {streak ? (
          <StreakStats streak={streak} total={config.cellCount} />
        ) : (
          <CollectionStats
            progress={collection!}
            locale={locale}
            rank={members.length > 1 ? ranked.findIndex((m) => m.uid === uid) + 1 : null}
          />
        )}

        {isStreak && Platform.OS !== 'web' && <ReminderCard />}

        <Card style={styles.gridCard}>
          <ThemedText type="smallBold" themeColor="textSecondary">
            {t('create.summary', { count: config.cellCount })}
          </ThemedText>
          {sections ? (
            <BoardSections
              sections={sections}
              filled={filled}
              nowCell={nowCell}
              locale={locale}
              statusOf={statusOf}
              labelOf={labelOf}
              onCellPress={setOpenCell}
              zoomHint={t('room.tapRow')}
            />
          ) : (
            <BoardGrid layout={layout!} statusOf={statusOf} labelOf={labelOf} onCellPress={setOpenCell} zoomHint={t('room.tapRow')} />
          )}
          {view === 'heat' && (
            <View style={styles.legend}>
              {[1, 2, 3, 4, 5].map((step) => (
                <View
                  key={step}
                  style={[styles.legendSwatch, { backgroundColor: mixColor(colors.cellEmpty, colors.accent, 0.3 + 0.7 * (step / 5)) }]}
                />
              ))}
              <ThemedText type="caption" themeColor="textSecondary" style={styles.legendText}>
                {t('room.heatLegend', { count: members.length })}
              </ThemedText>
            </View>
          )}
        </Card>

        {!isStreak && <MissingList filled={filled} cellCount={config.cellCount} labelOf={labelOf} onCellPress={setOpenCell} />}

        <ActivityFeed marks={marks} members={memberMap} now={now} labelOf={labelOf} onCellPress={setOpenCell} />
        <BadgesCard available={availableBadges} earned={earned} />
        <Players room={room} ranked={ranked} myUid={uid} onRename={() => setRenaming(true)} />
        <InviteCard room={room} isOwner={room.ownerId === uid} />
        <RoomActions room={room} uid={uid} />
      </ScrollView>

      <CellSheet
        label={openCell === null ? null : labelOf(openCell)}
        marks={cellMarks}
        members={memberMap}
        myUid={uid}
        locale={locale}
        canAdd={canAddToOpenCell}
        onAdd={onAdd}
        onDelete={(markId) => deleteMark(room.id, markId).catch((e) => Alert.alert(errorMessage(t, e)))}
        onClose={() => setOpenCell(null)}
      />
      <RenameSheet roomId={room.id} current={me?.nickname ?? ''} visible={renaming} onClose={() => setRenaming(false)} />
      <BadgeCelebration badge={badgeCelebration.current} onClose={badgeCelebration.dismiss} />
      <ShareImage request={shareRequest} data={shareData} />
    </ThemedView>
  );
}

function rankPlayers(members: Member[], marks: MarkDoc[]) {
  return members.map((m) => ({ ...m, filled: filledCells(marks, m.uid).size })).sort((a, b) => b.filled - a.filled);
}

function StatTile({ value, caption, color, children }: { value?: string; caption: string; color?: string; children?: React.ReactNode }) {
  return (
    <Card style={styles.tile}>
      {children}
      {value !== undefined && (
        <ThemedText type="subtitle" style={color ? { color } : undefined} numberOfLines={1} adjustsFontSizeToFit>
          {value}
        </ThemedText>
      )}
      <ThemedText type="caption" themeColor="textSecondary" style={styles.centerText} numberOfLines={2}>
        {caption}
      </ThemedText>
    </Card>
  );
}

function CollectionStats({ progress, locale, rank }: { progress: CollectionProgress; locale: string; rank: number | null }) {
  const { t } = useTranslation();
  const { colors } = useAppTheme();
  const percent = new Intl.NumberFormat(locale, { style: 'percent', maximumFractionDigits: progress.ratio < 0.1 ? 1 : 0 });
  const number = new Intl.NumberFormat(locale);
  return (
    <View style={styles.stats}>
      <StatTile caption={`${number.format(progress.filled)} / ${number.format(progress.total)}`}>
        <ProgressRing progress={progress.ratio} color={colors.accent} track={colors.cellEmpty}>
          <ThemedText type="caption">{percent.format(Math.floor(progress.ratio * 1000) / 1000)}</ThemedText>
        </ProgressRing>
      </StatTile>
      <StatTile value={number.format(progress.total - progress.filled)} caption={t('room.missing')} color={colors.action} />
      {rank !== null && <StatTile value={`#${rank}`} caption={t('room.rank')} color={colors.success} />}
    </View>
  );
}

function StreakStats({ streak, total }: { streak: StreakProgress; total: number }) {
  const { t } = useTranslation();
  const { colors } = useAppTheme();
  return (
    <View style={styles.stats}>
      <StatTile value={String(streak.current)} caption={t('room.currentStreak', { count: streak.current })} color={colors.action}>
        <Icon name="flame" color={colors.action} size={26} />
      </StatTile>
      <StatTile value={String(streak.longest)} caption={t('room.longestStreak')} color={colors.accent} />
      <StatTile value={`${streak.filled}/${total}`} caption={t('room.daysFilled')} color={colors.success} />
    </View>
  );
}

function Players({ room, ranked, myUid, onRename }: { room: Room; ranked: ReturnType<typeof rankPlayers>; myUid: string; onRename: () => void }) {
  const { t } = useTranslation();
  const { colors } = useAppTheme();
  const isOwner = room.ownerId === myUid;

  const remove = (player: Member) =>
    Alert.alert(t('room.removeConfirmTitle', { name: player.nickname }), t('room.removeConfirmBody'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('room.removeButton'),
        style: 'destructive',
        onPress: () => removeMember(room.id, player.uid).catch((e) => Alert.alert(errorMessage(t, e))),
      },
    ]);

  // Report for everyone; the owner can also remove the player (moderation, App Store guideline 1.2).
  const openActions = (player: Member) =>
    Alert.alert(player.nickname, undefined, [
      { text: t('report.player'), onPress: () => reportByEmail(t, { roomId: room.id, roomName: room.name, player }) },
      ...(isOwner ? [{ text: t('room.removePlayer'), style: 'destructive' as const, onPress: () => remove(player) }] : []),
      { text: t('common.cancel'), style: 'cancel' },
    ]);

  return (
    <Card style={styles.players}>
      <ThemedText type="heading">{t('room.players')}</ThemedText>
      {ranked.map((m, i) => (
        <View key={m.uid} style={styles.player}>
          <View style={[styles.rankBadge, { backgroundColor: i === 0 && m.filled > 0 ? colors.highlight : colors.backgroundSelected }]}>
            <ThemedText type="caption" style={{ color: i === 0 && m.filled > 0 ? colors.onHighlight : colors.text }}>
              {i + 1}
            </ThemedText>
          </View>
          <View style={[styles.dot, { backgroundColor: m.color }]} />
          <ThemedText type="smallBold" style={styles.playerName} numberOfLines={1}>
            {m.nickname}
            {m.uid === myUid ? ` · ${t('room.you')}` : ''}
          </ThemedText>
          {m.uid === myUid ? (
            <Pressable accessibilityRole="button" accessibilityLabel={t('room.rename')} hitSlop={12} onPress={onRename}>
              <Icon name="pencil" size={18} color={colors.textSecondary} />
            </Pressable>
          ) : (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('room.playerActions', { name: m.nickname })}
              hitSlop={12}
              onPress={() => openActions(m)}>
              <Icon name="more" size={18} strokeWidth={3.6} color={colors.textSecondary} />
            </Pressable>
          )}
          <ThemedText type="heading">{m.filled}</ThemedText>
        </View>
      ))}
    </Card>
  );
}

function InviteCard({ room, isOwner }: { room: Room; isOwner: boolean }) {
  const { t } = useTranslation();
  const { colors } = useAppTheme();

  const share = () => {
    const link = Linking.createURL('/join', { queryParams: { code: room.inviteCode } });
    Share.share({ message: t('room.shareMessage', { name: room.name, emoji: room.emoji, code: room.inviteCode, link }) });
  };

  const regenerate = () =>
    Alert.alert(t('room.regenerateConfirm'), undefined, [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('room.regenerate'), onPress: () => regenerateInviteCode(room.id).catch((e) => Alert.alert(errorMessage(t, e))) },
    ]);

  return (
    <Card style={styles.invite}>
      <View style={styles.inviteText}>
        <ThemedText type="caption" themeColor="textSecondary">
          {t('room.invite')}
        </ThemedText>
        <ThemedText type="subtitle" selectable style={styles.code}>
          {room.inviteCode}
        </ThemedText>
        {isOwner && (
          <Pressable accessibilityRole="button" onPress={regenerate} hitSlop={12} style={styles.regenerate}>
            <Icon name="refresh" size={16} color={colors.textSecondary} />
            <ThemedText type="caption" themeColor="textSecondary">
              {t('room.regenerate')}
            </ThemedText>
          </Pressable>
        )}
      </View>
      <Button title={t('room.share')} icon="userPlus" size="small" onPress={share} />
    </Card>
  );
}

/** Leave (everyone) and delete-for-everyone (owner). A lone owner only gets "delete": leaving would delete anyway. */
function RoomActions({ room, uid }: { room: Room; uid: string }) {
  const { t } = useTranslation();
  const [busy, setBusy] = useState<'leave' | 'delete' | null>(null);
  const isOwner = room.ownerId === uid;
  const alone = Object.keys(room.memberColors).length === 1;

  const run = async (kind: 'leave' | 'delete') => {
    setBusy(kind);
    try {
      await (kind === 'leave' ? leaveRoom(room.id) : deleteRoom(room.id));
      cancelStreakReminders(room.id).catch(console.warn);
      router.dismissTo('/');
    } catch (e) {
      setBusy(null);
      Alert.alert(errorMessage(t, e));
    }
  };

  const confirm = (kind: 'leave' | 'delete') => {
    const title = kind === 'leave' ? t('room.leaveConfirmTitle') : alone ? t('room.deleteRoom') : t('room.deleteConfirmTitle');
    const body =
      kind === 'leave'
        ? isOwner
          ? t('room.leaveOwnerBody')
          : t('room.leaveConfirmBody')
        : alone
          ? t('room.deleteSoloBody')
          : t('room.deleteConfirmBody');
    Alert.alert(title, body, [
      { text: t('common.cancel'), style: 'cancel' },
      { text: kind === 'leave' ? t('room.leaveButton') : t('common.delete'), style: 'destructive', onPress: () => run(kind) },
    ]);
  };

  return (
    <View style={styles.actions}>
      {!(isOwner && alone) && (
        <Button
          title={t('room.leave')}
          variant="danger"
          size="small"
          loading={busy === 'leave'}
          disabled={busy !== null}
          onPress={() => confirm('leave')}
        />
      )}
      {isOwner && (
        <Button
          title={t('room.deleteRoom')}
          variant="danger"
          size="small"
          loading={busy === 'delete'}
          disabled={busy !== null}
          onPress={() => confirm('delete')}
        />
      )}
      {!isOwner && (
        <Button
          title={t('report.room')}
          variant="secondary"
          size="small"
          disabled={busy !== null}
          onPress={() => reportByEmail(t, { roomId: room.id, roomName: room.name })}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  actions: {
    gap: Spacing.two,
    marginTop: Spacing.two,
  },
  container: {
    flex: 1,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.four,
  },
  centerText: {
    textAlign: 'center',
  },
  content: {
    padding: Spacing.three,
    gap: Spacing.three,
    maxWidth: MaxContentWidth,
    width: '100%',
    alignSelf: 'center',
  },
  stats: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  tile: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.one,
    paddingHorizontal: Spacing.two,
  },
  legend: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: Spacing.one,
  },
  legendSwatch: {
    width: 14,
    height: 14,
    borderRadius: 3,
  },
  legendText: {
    flex: 1,
    marginLeft: Spacing.two,
  },
  gridCard: {
    gap: Spacing.two,
    paddingHorizontal: Spacing.two,
  },
  players: {
    gap: Spacing.three,
  },
  player: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  rankBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playerName: {
    flex: 1,
    fontSize: 16,
  },
  dot: {
    width: 16,
    height: 16,
    borderRadius: 8,
  },
  invite: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  inviteText: {
    flex: 1,
    gap: 2,
  },
  code: {
    letterSpacing: 4,
  },
  regenerate: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    alignSelf: 'flex-start',
    paddingVertical: Spacing.one,
  },
});
