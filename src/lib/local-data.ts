import AsyncStorage from '@react-native-async-storage/async-storage';

/** Removes everything Timegami keeps on the device (preferences, celebrated badges…). */
export async function clearLocalAppData(): Promise<void> {
  const keys = (await AsyncStorage.getAllKeys()).filter((k) => k.startsWith('timegami.'));
  if (keys.length > 0) await AsyncStorage.multiRemove(keys);
}
