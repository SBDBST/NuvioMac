/**
 * DesktopPlayerOverlay -- Catalyst player lifecycle + mouse hover.
 *
 * This native view does three things:
 * 1. Sets PlatformInfo.isPlayerActive when mounted/unmounted, which
 *    triggers UIMenuSystem rebuild (add/remove player keyboard shortcuts)
 *    and activates the keyCommands swizzle (suppress KSPlayer's keys).
 * 2. Detects mouse hover via UIHoverGestureRecognizer, emitting
 *    playerMouseMove/Idle/Leave events to JS for controls show/hide.
 * 3. hitTest returns self for .hover events but nil for touches,
 *    so hover works but clicks pass through to the JS click-to-play layer.
 *
 * It does NOT handle keyboard input (menu system + swizzle does that).
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
