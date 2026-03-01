/**
 * Global keyboard shortcuts for NuvioMac.
 *
 * Uses the PlatformInfo native module to receive keyboard shortcut
 * events from the Mac menu bar. Only active on Mac Catalyst.
 */
import React, { useCallback } from 'react';
import { useNavigation, NavigationProp } from '@react-navigation/native';
import { useKeyCommands } from '../hooks/useKeyboardShortcuts';
import { isMacCatalyst } from '../utils/platform';

export const GlobalKeyboardShortcuts: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  if (!isMacCatalyst) return <>{children}</>;
  return <ShortcutHandler>{children}</ShortcutHandler>;
};

const ShortcutHandler: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const navigation = useNavigation<NavigationProp<any>>();

  const handlers = useCallback(() => ({
    search: () => { try { navigation.navigate('Search'); } catch {} },
    settings: () => { try { navigation.navigate('Settings'); } catch {} },
    back: () => { try { navigation.goBack(); } catch {} },
    tab1: () => { try { navigation.navigate('MainTabs', { screen: 'Home' }); } catch {} },
    tab2: () => { try { navigation.navigate('MainTabs', { screen: 'Search' }); } catch {} },
    tab3: () => { try { navigation.navigate('MainTabs', { screen: 'Library' }); } catch {} },
    tab4: () => { try { navigation.navigate('MainTabs', { screen: 'Downloads' }); } catch {} },
  }), [navigation]);

  useKeyCommands(handlers());

  return <>{children}</>;
};

export default GlobalKeyboardShortcuts;
