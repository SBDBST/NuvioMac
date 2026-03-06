/**
 * DesktopPlayerOverlay - Native keyboard handling for the player on Catalyst.
 *
 * This view sits behind the controls and captures keyboard events via
 * becomeFirstResponder. Mouse hover for show/hide controls is also handled
 * natively. Click-to-play and double-click-to-fullscreen are handled in JS
 * (no gesture recogniser delay).
 *
 * On mobile, renders nothing (zero overhead).
 */
import React from 'react';
import { View, requireNativeComponent, StyleSheet, ViewProps } from 'react-native';
import { isMacCatalyst } from '../../utils/platform';

interface DesktopPlayerOverlayProps extends ViewProps {
  children?: React.ReactNode;
}

const NativeOverlay = isMacCatalyst
  ? requireNativeComponent<DesktopPlayerOverlayProps>('DesktopPlayerOverlay')
  : null;

const DesktopPlayerOverlay: React.FC<DesktopPlayerOverlayProps> = ({
  children,
  style,
  ...rest
}) => {
  if (!isMacCatalyst || !NativeOverlay) {
    return <>{children}</>;
  }

  return (
    <View style={[StyleSheet.absoluteFill, { zIndex: 5 }]} pointerEvents="box-none">
      {children}
      <NativeOverlay
        style={StyleSheet.absoluteFill}
        {...rest}
      />
    </View>
  );
};

export default DesktopPlayerOverlay;
