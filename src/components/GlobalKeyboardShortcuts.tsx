/**
 * Global keyboard shortcuts for NuvioMac.
 *
 * Uses PlatformInfo native module for key command events from Mac menu bar.
 * Tab switching uses TabActions.jumpTo dispatched through the navigation tree,
 * which properly updates the native UITabBarController's selected index.
 */
import React, { useCallback } from 'react';
import { useNavigation, NavigationProp, TabActions } from '@react-navigation/native';
import { useKeyCommands } from '../hooks/useKeyboardShortcuts';
import { isMacCatalyst } from '../utils/platform';

export const GlobalKeyboardShortcuts: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  if (!isMacCatalyst) return <>{children}</>;
  return <ShortcutHandler>{children}</ShortcutHandler>;
};

const ShortcutHandler: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const navigation = useNavigation<NavigationProp<any>>();

  const jumpToTab = useCallback((tabName: string) => {
    try {
      // First navigate to MainTabs to ensure we're in the tab navigator,
      // then dispatch jumpTo which properly syncs the native tab bar.
      navigation.navigate('MainTabs' as any);
      // Small delay to ensure MainTabs is focused before dispatching jumpTo
      setTimeout(() => {
        try {
          navigation.dispatch(TabActions.jumpTo(tabName));
        } catch {}
      }, 50);
    } catch {}
  }, [navigation]);

  // Tab order: Home, Library, Search, Downloads, Settings
  const handlers = useCallback(() => ({
    search: () => jumpToTab('Search'),
    settings: () => jumpToTab('Settings'),
    back: () => { try { navigation.goBack(); } catch {} },
    tab1: () => jumpToTab('Home'),
    tab2: () => jumpToTab('Library'),
    tab3: () => jumpToTab('Search'),
    tab4: () => jumpToTab('Downloads'),
    tab5: () => jumpToTab('Settings'),
  }), [navigation, jumpToTab]);

  useKeyCommands(handlers());

  return <>{children}</>;
};

export default GlobalKeyboardShortcuts;
