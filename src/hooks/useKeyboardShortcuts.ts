/**
 * Keyboard shortcuts for Mac Catalyst.
 *
 * Uses the PlatformInfo native module (RCTEventEmitter) which receives
 * key command events from AppDelegate's buildMenu keyboard shortcuts.
 * Shortcuts appear in the Mac menu bar and respond to keyboard input.
 *
 * No-ops on mobile.
 */
import { useEffect } from 'react';
import { NativeModules, NativeEventEmitter } from 'react-native';
import { isMacCatalyst } from '../utils/platform';

const PlatformInfoModule = NativeModules.PlatformInfo;
let emitter: NativeEventEmitter | null = null;

function getEmitter(): NativeEventEmitter | null {
  if (!isMacCatalyst || !PlatformInfoModule) return null;
  if (!emitter) {
    emitter = new NativeEventEmitter(PlatformInfoModule);
  }
  return emitter;
}

type CommandId =
  | 'search' | 'settings' | 'back'
  | 'tab1' | 'tab2' | 'tab3' | 'tab4' | 'tab5';

/**
 * Listen for a specific keyboard shortcut by command ID.
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
