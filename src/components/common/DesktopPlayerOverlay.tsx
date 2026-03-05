/**
 * DesktopPlayerOverlay - Native mouse + keyboard handling for the player on Catalyst.
 *
 * This view sits on top of the player video area and captures:
 * - Arrow keys (seek), Space (play/pause), Escape (close), F (fullscreen), M (mute)
 * - Mouse movement (show controls), mouse idle (hide controls)
 * - Single click (toggle play/pause), double click (fullscreen)
 *
 * On mobile, renders nothing (zero overhead).
 */
import React from 'react';
import { View, requireNativeComponent, StyleSheet, ViewProps } from 'react-native';
import { isMacCatalyst } from '../../utils/platform';

interface DesktopPlayerOverlayProps extends ViewProps {
  onMouseMove?: () => void;
  onMouseClick?: () => void;
  onMouseDoubleClick?: () => void;
  children?: React.ReactNode;
}

const NativeOverlay = isMacCatalyst
  ? requireNativeComponent<DesktopPlayerOverlayProps>('DesktopPlayerOverlay')
  : null;

const DesktopPlayerOverlay: React.FC<DesktopPlayerOverlayProps> = ({
  onMouseMove,
  onMouseClick,
  onMouseDoubleClick,
  children,
  style,
  ...rest
}) => {
  if (!isMacCatalyst || !NativeOverlay) {
    return <>{children}</>;
  }

  return (
    <View style={[StyleSheet.absoluteFill, { zIndex: 50 }]} pointerEvents="box-none">
      {children}
      <NativeOverlay
        style={StyleSheet.absoluteFill}
        onMouseMove={onMouseMove}
        onMouseClick={onMouseClick}
        onMouseDoubleClick={onMouseDoubleClick}
        {...rest}
      />
    </View>
  );
};

export default DesktopPlayerOverlay;
