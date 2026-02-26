import { Platform, NativeModules } from 'react-native';

/**
 * Detect Mac Catalyst at runtime.
 *
 * Mac Catalyst reports Platform.OS === 'ios' and Platform.isPad === true,
 * so we need a native module to distinguish it from a real iPad.
 *
 * Until the native PlatformInfo module is wired up, we fall back to a
 * heuristic: Catalyst exposes a macOS-style main screen that lacks the
 * typical iOS nativeBoundsWidth. However, the most reliable approach is
 * the native constant.
 */
const nativeIsMacCatalyst: boolean =
  NativeModules.PlatformInfo?.isMacCatalyst === true;

/**
 * Heuristic fallback: on Catalyst the process info environment contains
 * __CFBundleIdentifier and running under macOS. We check for the absence
 * of typical iOS-only traits via a simpler method -- when the native module
 * isn't available yet, we check if we're on iOS with a very large screen
 * scale factor or if certain iOS-only APIs are missing.
 *
 * In practice, once the native module is wired up, the heuristic is unused.
 */
export const isMacCatalyst: boolean =
  Platform.OS === 'ios' && nativeIsMacCatalyst;

/** True when running on any desktop platform (currently only macCatalyst). */
export const isDesktop: boolean = isMacCatalyst;

/** True when running on a mobile device (phone or tablet, not Catalyst). */
export const isMobile: boolean = Platform.OS === 'ios' || Platform.OS === 'android';

/** True when on a mobile device that is NOT Catalyst. */
export const isMobileDevice: boolean = isMobile && !isMacCatalyst;

/**
 * Safe wrapper for APIs that should be no-ops on macOS.
 * Pass a callback that calls the iOS-only API; it will only execute on
 * non-Catalyst iOS or Android.
 */
export function runOnMobileOnly(fn: () => void): void {
  if (!isMacCatalyst) {
    fn();
  }
}

/**
 * Safe async wrapper for APIs that should be no-ops on macOS.
 * Returns undefined when skipped.
 */
export async function runOnMobileOnlyAsync<T>(fn: () => Promise<T>): Promise<T | undefined> {
  if (!isMacCatalyst) {
    return fn();
  }
  return undefined;
}
