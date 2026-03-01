/**
 * Keyboard shortcuts for Mac Catalyst.
 *
 * Uses the native KeyCommandBridge module which registers shortcuts
 * via the Mac menu bar (buildMenu). Shortcuts appear in the menu bar
 * AND respond to keyboard input.
 *
 * No-ops on mobile.
 */
import { useEffect } from 'react';
import { NativeModules, NativeEventEmitter } from 'react-native';
import { isMacCatalyst } from '../utils/platform';

const KeyCommandBridge = NativeModules.KeyCommandBridge;
let emitter: NativeEventEmitter | null = null;

function getEmitter(): NativeEventEmitter | null {
  if (!isMacCatalyst || !KeyCommandBridge) return null;
  if (!emitter) {
    emitter = new NativeEventEmitter(KeyCommandBridge);
  }
  return emitter;
}

type CommandId =
  | 'search' | 'settings' | 'back' | 'fullscreen'
  | 'tab1' | 'tab2' | 'tab3' | 'tab4'
  | 'playPause' | 'escape'
  | 'arrowLeft' | 'arrowRight' | 'arrowUp' | 'arrowDown'
  | 'enter';

/**
 * Listen for a specific keyboard shortcut by command ID.
 *
 * Command IDs correspond to the keys registered in AppDelegate's buildMenu:
 *   search, settings, back, fullscreen, tab1-4
 */
export function useKeyCommand(commandId: CommandId, handler: () => void): void {
  useEffect(() => {
    const em = getEmitter();
    if (!em) return;

    const sub = em.addListener('onKeyCommand', (event: { id: string }) => {
      if (event.id === commandId) {
        handler();
      }
    });

    return () => sub.remove();
  }, [commandId, handler]);
}

/**
 * Listen for multiple keyboard shortcuts at once.
 */
export function useKeyCommands(handlers: Partial<Record<CommandId, () => void>>): void {
  useEffect(() => {
    const em = getEmitter();
    if (!em) return;

    const sub = em.addListener('onKeyCommand', (event: { id: string }) => {
      const handler = handlers[event.id as CommandId];
      if (handler) handler();
    });

    return () => sub.remove();
  }, [handlers]);
}

/**
 * Convenience hook for arrow key navigation.
 */
export function useArrowKeys(callbacks: {
  onLeft?: () => void;
  onRight?: () => void;
  onUp?: () => void;
  onDown?: () => void;
  onEnter?: () => void;
  onEscape?: () => void;
}): void {
  useEffect(() => {
    const em = getEmitter();
    if (!em) return;

    const sub = em.addListener('onKeyCommand', (event: { id: string }) => {
      switch (event.id) {
        case 'arrowLeft': callbacks.onLeft?.(); break;
        case 'arrowRight': callbacks.onRight?.(); break;
        case 'arrowUp': callbacks.onUp?.(); break;
        case 'arrowDown': callbacks.onDown?.(); break;
        case 'enter': callbacks.onEnter?.(); break;
        case 'escape': callbacks.onEscape?.(); break;
      }
    });

    return () => sub.remove();
  }, [callbacks]);
}
