/**
 * Desktop interaction utilities for Mac Catalyst.
 *
 * Hover detection uses React Native's Pressable component which has
 * built-in onHoverIn/onHoverOut support on Catalyst (since RN 0.73).
 *
 * For components that can't use Pressable directly, we provide a
 * HoverableView wrapper component.
 */
import React, { useState, useCallback } from 'react';
import { Pressable, ViewStyle, StyleProp, PressableProps, Animated } from 'react-native';
import { isMacCatalyst } from '../utils/platform';

/**
 * Hook that returns hover state and Pressable-compatible hover props.
 *
 * Usage with Pressable:
 * ```
 * const { isHovered, hoverProps } = usePressableHover();
 * return (
 *   <Pressable {...hoverProps} onPress={...}>
 *     <View style={[styles.card, isHovered && styles.cardHovered]}>
 *       ...
 *     </View>
 *   </Pressable>
 * );
 * ```
 */
export function usePressableHover() {
  const [isHovered, setIsHovered] = useState(false);

  const hoverProps = isMacCatalyst
    ? {
        onHoverIn: () => setIsHovered(true),
        onHoverOut: () => setIsHovered(false),
      }
    : {};

  return { isHovered, hoverProps };
}

/**
 * A wrapper that adds hover effects to any children.
 * Uses Pressable under the hood for native hover support.
 *
 * On mobile, renders as a plain Pressable with no hover behaviour.
 */
interface HoverableViewProps extends Omit<PressableProps, 'style'> {
  style?: StyleProp<ViewStyle>;
  hoverStyle?: StyleProp<ViewStyle>;
  hoverScale?: number;
  children: React.ReactNode;
}

export const HoverableView: React.FC<HoverableViewProps> = ({
  style,
  hoverStyle,
  hoverScale,
  children,
  ...pressableProps
}) => {
  const [isHovered, setIsHovered] = useState(false);

  const catalystHoverProps = isMacCatalyst
    ? {
        onHoverIn: () => setIsHovered(true),
        onHoverOut: () => setIsHovered(false),
      }
    : {};

  const scaleTransform =
    isMacCatalyst && hoverScale && isHovered
      ? { transform: [{ scale: hoverScale }] }
      : {};

  return (
    <Pressable
      style={[
        style as ViewStyle,
        isHovered ? (hoverStyle as ViewStyle) : undefined,
        scaleTransform,
      ]}
      {...catalystHoverProps}
      {...pressableProps}
    >
      {children}
    </Pressable>
  );
};
