/**
 * HoverView - Native hover detection for Mac Catalyst.
 *
 * Wraps children in a transparent native view that uses UIHoverGestureRecognizer
 * to detect mouse hover. Calls onHoverIn/onHoverOut callbacks.
 *
 * On mobile, renders a plain View (no overhead).
 *
 * Usage:
 * ```
 * const [hovered, setHovered] = useState(false);
 * <HoverView onHoverIn={() => setHovered(true)} onHoverOut={() => setHovered(false)}>
 *   <Card style={hovered && styles.cardHovered} />
 * </HoverView>
 * ```
 */
import React from 'react';
import { View, requireNativeComponent, ViewProps, Platform } from 'react-native';
import { isMacCatalyst } from '../../utils/platform';

interface HoverViewProps extends ViewProps {
  onHoverIn?: () => void;
  onHoverOut?: () => void;
  children: React.ReactNode;
}

const NativeHoverView = isMacCatalyst
  ? requireNativeComponent<HoverViewProps>('HoverView')
  : null;

const HoverView: React.FC<HoverViewProps> = ({
  onHoverIn,
  onHoverOut,
  children,
  style,
  ...rest
}) => {
  if (!isMacCatalyst || !NativeHoverView) {
    return <View style={style} {...rest}>{children}</View>;
  }

  return (
    <NativeHoverView
      style={style}
      onHoverIn={onHoverIn}
      onHoverOut={onHoverOut}
      {...rest}
    >
      {children}
    </NativeHoverView>
  );
};

export default HoverView;
