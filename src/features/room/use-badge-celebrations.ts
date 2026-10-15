import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';

import type { BadgeId } from '@/domain';

const storageKey = (roomId: string, uid: string) => `timegami.celebratedBadges.v1.${roomId}.${uid}`;

/**
 * Queue of badges to celebrate: each badge once per room on this device, never again on later visits.
 * The first time a room is opened with this feature, badges already earned are recorded silently.
 */
export function useBadgeCelebrations(roomId: string, uid: string, earned: Set<BadgeId>) {
  const [celebrated, setCelebrated] = useState<Set<BadgeId> | null>(null);
  const [queue, setQueue] = useState<BadgeId[]>([]);

  useEffect(() => {
    let active = true;
    setCelebrated(null);
    AsyncStorage.getItem(storageKey(roomId, uid))
      .then((json) => (json ? new Set<BadgeId>(JSON.parse(json)) : null))
      .catch(() => null)
      .then((stored) => {
        if (!active) return;
        if (stored) {
          setCelebrated(stored);
        } else {
          // No record yet: what is already earned is history, not news.
          setCelebrated(new Set(earned));
          AsyncStorage.setItem(storageKey(roomId, uid), JSON.stringify([...earned])).catch(() => {});
        }
      });
    return () => {
      active = false;
    };
    // `earned` is read only for the first-time seed; later changes are handled below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId, uid]);

  useEffect(() => {
    if (!celebrated) return;
    const fresh = [...earned].filter((id) => !celebrated.has(id));
    if (fresh.length === 0) return;
    const next = new Set([...celebrated, ...fresh]);
    setCelebrated(next);
    setQueue((q) => [...q, ...fresh]);
    AsyncStorage.setItem(storageKey(roomId, uid), JSON.stringify([...next])).catch(() => {});
  }, [earned, celebrated, roomId, uid]);

  return { current: queue[0] ?? null, dismiss: () => setQueue((q) => q.slice(1)) };
}
