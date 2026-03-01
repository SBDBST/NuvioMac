/**
 * Safe haptics wrapper.
 *
 * On Mac Catalyst, haptics hardware doesn't exist and the expo-haptics
 * native module may not be available. All calls here are no-ops on Catalyst.
 *
 * This module re-exports the same API surface as expo-haptics so existing
 * call sites can switch imports with minimal changes.
 */
import { isMacCatalyst } from './platform';

// Re-export the enums so call sites don't need to change their references.
export enum ImpactFeedbackStyle {
  Light = 'light',
  Medium = 'medium',
  Heavy = 'heavy',
}

export enum NotificationFeedbackType {
  Success = 'success',
  Warning = 'warning',
  Error = 'error',
}

export async function impactAsync(_style?: ImpactFeedbackStyle): Promise<void> {
  if (isMacCatalyst) return;
  try {
    const Haptics = require('expo-haptics');
    await Haptics.impactAsync(_style);
  } catch {
    // Module unavailable -- silently ignore.
  }
}

export async function notificationAsync(_type?: NotificationFeedbackType): Promise<void> {
  if (isMacCatalyst) return;
  try {
    const Haptics = require('expo-haptics');
    await Haptics.notificationAsync(_type);
  } catch {
    // Module unavailable -- silently ignore.
  }
}

export async function selectionAsync(): Promise<void> {
  if (isMacCatalyst) return;
  try {
    const Haptics = require('expo-haptics');
    await Haptics.selectionAsync();
  } catch {
    // Module unavailable -- silently ignore.
  }
}
