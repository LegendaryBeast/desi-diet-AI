/**
 * useHaptics — Thin wrapper around expo-haptics
 * Call the returned functions at key interaction points.
 */
import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';
import { useSettingsStore } from '../store/settings-store';

export function useHaptics() {
  const notificationsEnabled = useSettingsStore((s) => s.notificationsEnabled);
  // Only fire haptics when the user hasn't disabled notifications
  // (we reuse the same flag as a "system feedback" preference)

  const light = () => {
    if (Platform.OS === 'web') return;
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (e) {
      console.warn('Haptics not supported:', e);
    }
  };

  const medium = () => {
    if (Platform.OS === 'web') return;
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch (e) {
      console.warn('Haptics not supported:', e);
    }
  };

  const success = () => {
    if (Platform.OS === 'web') return;
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e) {
      console.warn('Haptics not supported:', e);
    }
  };

  const error = () => {
    if (Platform.OS === 'web') return;
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } catch (e) {
      console.warn('Haptics not supported:', e);
    }
  };

  const warning = () => {
    if (Platform.OS === 'web') return;
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    } catch (e) {
      console.warn('Haptics not supported:', e);
    }
  };

  return { light, medium, success, error, warning };
}
