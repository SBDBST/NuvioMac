/**
 * Desktop interaction utilities for Mac Catalyst.
 *
 * Provides hover effects, cursor changes, and right-click handling
 * that are no-ops on mobile devices.
 */
import { useState, useCallback, useRef, useEffect } from 'react';
import { GestureResponderEvent, Platform } from 'react-native';
import { isMacCatalyst } from '../utils/platform';

// ─── Hover ───────────────────────────────────────────────────────────

export interface HoverHandlers {
  onMouseEnter: () => void;
  onMouseLeave: () => void;
}

/**
 * Track hover state for a component.
 *
 * On Catalyst, React Native views receive onMouseEnter / onMouseLeave
 * props (forwarded from UIKit hover events).
 *
 * Returns [isHovered, hoverHandlers] -- spread hoverHandlers onto the
 * View / TouchableOpacity.
 */
export function useHover(): [boolean, HoverHandlers] {
  const [hovered, setHovered] = useState(false);

  const handlers: HoverHandlers = {
    onMouseEnter: useCallback(() => {
      if (isMacCatalyst) setHovered(true);
    }, []),
    onMouseLeave: useCallback(() => {
      if (isMacCatalyst) setHovered(false);
    }, []),
  };

  return [hovered, handlers];
}

/**
 * Returns animated transform style for a hover scale effect.
 * Only applies on Catalyst; returns empty style on mobile.
 */
export function useHoverScale(
  isHovered: boolean,
  scale: number = 1.05
): { transform: { scale: number }[] } | {} {
  if (!isMacCatalyst) return {};
  return {
    transform: [{ scale: isHovered ? scale : 1 }],
  };
}

// ─── Right-click (context menu) ──────────────────────────────────────

type ContextMenuHandler = (x: number, y: number) => void;

/**
 * Detect right-click on Catalyst.
 *
 * On Catalyst, a two-finger tap or Ctrl+Click / right-click triggers
 * a long press on TouchableOpacity. For more precise control, we
 * check the nativeEvent.button === 2 on the responder events.
 *
 * Returns an onPress handler that distinguishes left from right click.
 */
export function useContextMenu(onContextMenu: ContextMenuHandler) {
  const handler = useCallback(
    (event: GestureResponderEvent) => {
      if (!isMacCatalyst) return;
      const ne = event.nativeEvent as any;
      // button === 2 is right-click in DOM events forwarded by Catalyst
      if (ne.button === 2) {
        onContextMenu(ne.pageX ?? ne.locationX, ne.pageY ?? ne.locationY);
      }
    },
    [onContextMenu]
  );

  return handler;
}

// ─── Cursor ──────────────────────────────────────────────────────────

/**
 * On Catalyst, set the cursor to 'pointer' when hovering an element.
 * This uses the web-compatible style that React Native on Catalyst
 * supports via the cursor style prop (RN 0.74+).
 */
export function useCursorStyle(
  isHovered: boolean
): { cursor: string } | {} {
  if (!isMacCatalyst) return {};
  return { cursor: isHovered ? 'pointer' : 'default' };
}

/**
 * Combined hook: hover + scale + cursor in one call.
 * Returns [isHovered, combinedStyle, hoverHandlers].
 */
export function useDesktopHover(scale: number = 1.04): [
  boolean,
  Record<string, any>,
  HoverHandlers
] {
  const [isHovered, handlers] = useHover();
  const scaleStyle = useHoverScale(isHovered, scale);
  const cursorStyle = useCursorStyle(isHovered);

  const combinedStyle = { ...scaleStyle, ...cursorStyle };
  return [isHovered, combinedStyle, handlers];
}
