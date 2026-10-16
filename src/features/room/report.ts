import type { TFunction } from 'i18next';
import * as Linking from 'expo-linking';
import { Alert } from 'react-native';

import { CONTACT_EMAIL } from '@/legal';

/**
 * Opens a pre-filled email to report a challenge or a player (App Store guideline 1.2). Ids go in the
 * body so the report can be traced in Firestore; nothing is sent without the user pressing send.
 */
export async function reportByEmail(t: TFunction, target: { roomId: string; roomName: string; player?: { uid: string; nickname: string } }) {
  const details = [
    `Challenge: ${target.roomName} (${target.roomId})`,
    target.player ? `Player: ${target.player.nickname} (${target.player.uid})` : null,
  ].filter(Boolean);
  const body = `${t('report.body')}\n\n\n---\n${details.join('\n')}`;
  const url = `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(t('report.subject'))}&body=${encodeURIComponent(body)}`;
  try {
    await Linking.openURL(url);
  } catch {
    Alert.alert(t('report.noMailApp', { email: CONTACT_EMAIL }));
  }
}
