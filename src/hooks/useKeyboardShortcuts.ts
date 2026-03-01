/**
 * Global keyboard shortcuts for Mac Catalyst.
 *
 * Provides desktop-standard shortcuts: Cmd+F (fullscreen), Cmd+K (search),
 * Cmd+[ (back), Space (play/pause), Escape (close modal / go back), and
 * arrow keys for carousel/onboarding navigation.
 *
 * No-ops on mobile (iOS/Android) to avoid interfering with system keyboards.
 */
import { useEffect, useCallback } from 'react';
import { Platform } from 'react-native';
import { isMacCatalyst } from '../utils/platform';

export interface KeyboardShortcutEvent {
  key: string;
  code: string;
  metaKey: boolean;   // Cmd on Mac
  ctrlKey: boolean;
  shiftKey: boolean;
  altKey: boolean;
  preventDefault: () => void;
}

type ShortcutHandler = (event: KeyboardShortcutEvent) => void;

interface ShortcutMap {
  [description: string]: {
    test: (e: KeyboardShortcutEvent) => boolean;
    handler: ShortcutHandler;
  };
}

/**
 * Register global keyboard shortcuts. Only active on Mac Catalyst.
 *
 * Usage:
 * ```
 * useKeyboardShortcuts({
 *   'Cmd+K: Search': {
 *     test: (e) => e.metaKey && e.key === 'k',
 *     handler: () => navigation.navigate('Search'),
 *   },
 * });
 * ```
 */
export function useKeyboardShortcuts(shortcuts: ShortcutMap): void {
  useEffect(() => {
    if (!isMacCatalyst) return;

    const handleKeyDown = (e: Event) => {
      const ke = e as unknown as KeyboardShortcutEvent;
      for (const entry of Object.values(shortcuts)) {
        if (entry.test(ke)) {
          ke.preventDefault();
          entry.handler(ke);
          return;
        }
      }
    };

    // React Native on Catalyst forwards DOM key events to the
    // underlying UIKit responder chain. We listen at the document
    // level to catch them globally.
    if (typeof document !== 'undefined') {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [shortcuts]);
}

/**
 * Convenience hook for arrow key navigation (onboarding, carousels).
 */
export function useArrowKeys(callbacks: {
  onLeft?: () => void;
  onRight?: () => void;
  onUp?: () => void;
  onDown?: () => void;
  onEnter?: () => void;
  onEscape?: () => void;
}): void {
  const shortcuts: ShortcutMap = {};

  if (callbacks.onLeft) {
    shortcuts['ArrowLeft'] = {
      test: (e) => e.key === 'ArrowLeft' && !e.metaKey,
      handler: () => callbacks.onLeft!(),
    };
  }
  if (callbacks.onRight) {
    shortcuts['ArrowRight'] = {
      test: (e) => e.key === 'ArrowRight' && !e.metaKey,
      handler: () => callbacks.onRight!(),
    };
  }
  if (callbacks.onUp) {
    shortcuts['ArrowUp'] = {
      test: (e) => e.key === 'ArrowUp' && !e.metaKey,
      handler: () => callbacks.onUp!(),
    };
  }
  if (callbacks.onDown) {
    shortcuts['ArrowDown'] = {
      test: (e) => e.key === 'ArrowDown' && !e.metaKey,
      handler: () => callbacks.onDown!(),
    };
  }
  if (callbacks.onEnter) {
    shortcuts['Enter'] = {
      test: (e) => e.key === 'Enter',
      handler: () => callbacks.onEnter!(),
    };
  }
  if (callbacks.onEscape) {
    shortcuts['Escape'] = {
      test: (e) => e.key === 'Escape',
      handler: () => callbacks.onEscape!(),
    };
  }

  useKeyboardShortcuts(shortcuts);
}
