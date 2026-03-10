/**
 * DesktopPlayerOverlay -- Catalyst player lifecycle + hover fallback.
 *
 * This native view does two things:
 * 1. Sets PlatformInfo.isPlayerActive when mounted/unmounted, which
 *    tells NuvioWindow whether to intercept keyboard events.
 * 2. Provides a native UIHoverGestureRecognizer as a fallback for
 *    mouse-move detection (primary path is JS onPointerMove).
 *
 * It does NOT handle keyboard input (NuvioWindow does that).
 * It does NOT fight for first responder.
 *
 * On mobile, renders children directly (zero overhead).
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
    <View style={[StyleSheet.absoluteFill, { zIndex: 2 }]} pointerEvents="box-none">
      {children}
      <NativeOverlay
        style={StyleSheet.absoluteFill}
        {...rest}
      />
    </View>
  );
};

export default DesktopPlayerOverlay;
