/**
 * Global keyboard shortcuts for NuvioMac.
 *
 * Tab switching emits DeviceEventEmitter events which are handled inside
 * MainTabs where we have direct access to the native tab navigator's
 * navigation.jumpTo method.
 */
import React, { useCallback } from 'react';
import { DeviceEventEmitter } from 'react-native';
import { useNavigation, NavigationProp } from '@react-navigation/native';
import { useKeyCommands } from '../hooks/useKeyboardShortcuts';
import { isMacCatalyst } from '../utils/platform';

export const SWITCH_TAB_EVENT = 'CATALYST_SWITCH_TAB';

export const GlobalKeyboardShortcuts: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  if (!isMacCatalyst) return <>{children}</>;
  return <ShortcutHandler>{children}</ShortcutHandler>;
};

const ShortcutHandler: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const navigation = useNavigation<NavigationProp<any>>();

  const handlers = useCallback(() => ({
    search: () => DeviceEventEmitter.emit(SWITCH_TAB_EVENT, 'Search'),
    settings: () => DeviceEventEmitter.emit(SWITCH_TAB_EVENT, 'Settings'),
    back: () => { try { navigation.goBack(); } catch {} },
    tab1: () => DeviceEventEmitter.emit(SWITCH_TAB_EVENT, 'Home'),
    tab2: () => DeviceEventEmitter.emit(SWITCH_TAB_EVENT, 'Library'),
    tab3: () => DeviceEventEmitter.emit(SWITCH_TAB_EVENT, 'Search'),
    tab4: () => DeviceEventEmitter.emit(SWITCH_TAB_EVENT, 'Downloads'),
    tab5: () => DeviceEventEmitter.emit(SWITCH_TAB_EVENT, 'Settings'),
  }), [navigation]);

  useKeyCommands(handlers());

  return <>{children}</>;
};

export default GlobalKeyboardShortcuts;
