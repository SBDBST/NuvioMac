/**
 * Global keyboard shortcuts for NuvioMac.
 *
 * Wraps the app to provide desktop-standard keyboard shortcuts.
 * Only active on Mac Catalyst; transparent pass-through on mobile.
 */
import React from 'react';
import { useNavigation, NavigationProp } from '@react-navigation/native';
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts';
import { isMacCatalyst } from '../utils/platform';

/**
 * Must be rendered inside a NavigationContainer.
 * Provides global shortcuts that work regardless of which screen is active.
 */
export const GlobalKeyboardShortcuts: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  if (!isMacCatalyst) return <>{children}</>;
  return <ShortcutHandler>{children}</ShortcutHandler>;
};

const ShortcutHandler: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const navigation = useNavigation<NavigationProp<any>>();

  useKeyboardShortcuts({
    'Cmd+K: Search': {
      test: (e) => e.metaKey && e.key === 'k',
      handler: () => {
        try { navigation.navigate('Search'); } catch {}
      },
    },
    'Cmd+,: Settings': {
      test: (e) => e.metaKey && e.key === ',',
      handler: () => {
        try { navigation.navigate('Settings'); } catch {}
      },
    },
    'Cmd+[: Back': {
      test: (e) => e.metaKey && e.key === '[',
      handler: () => {
        try { navigation.goBack(); } catch {}
      },
    },
    'Cmd+]: Forward': {
      test: (e) => e.metaKey && e.key === ']',
      handler: () => {
        // No built-in forward in React Navigation, but this reserves the shortcut
      },
    },
    'Cmd+1: Home tab': {
      test: (e) => e.metaKey && e.key === '1',
      handler: () => {
        try { navigation.navigate('MainTabs', { screen: 'Home' }); } catch {}
      },
    },
    'Cmd+2: Search tab': {
      test: (e) => e.metaKey && e.key === '2',
      handler: () => {
        try { navigation.navigate('MainTabs', { screen: 'Search' }); } catch {}
      },
    },
    'Cmd+3: Library tab': {
      test: (e) => e.metaKey && e.key === '3',
      handler: () => {
        try { navigation.navigate('MainTabs', { screen: 'Library' }); } catch {}
      },
    },
    'Cmd+4: Downloads tab': {
      test: (e) => e.metaKey && e.key === '4',
      handler: () => {
        try { navigation.navigate('MainTabs', { screen: 'Downloads' }); } catch {}
      },
    },
  });

  return <>{children}</>;
};

export default GlobalKeyboardShortcuts;
