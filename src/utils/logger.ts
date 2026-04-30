/**
 * Logger with prefix-based filtering.
 *
 * In dev builds, all logger.error/warn calls always print.
 * logger.log/info/debug calls are checked against QUIET_PREFIXES --
 * if the first argument starts with any quiet prefix, the call is dropped.
 *
 * To temporarily see everything, set VERBOSE = true below.
 * To permanently silence a chatty module, add its prefix to QUIET_PREFIXES.
 */

/** Set to true to disable prefix filtering and see everything. */
const VERBOSE = false;

/**
 * Prefixes to suppress in logger.log/info/debug.
 * Only checked in dev builds. Errors and warnings always print.
 * Add or remove prefixes here to tune console noise.
 */
const QUIET_PREFIXES: string[] = [
  // Catalog & metadata
  '🔍 [getCatalog',
  '🔍 [CatalogService',
  '🔍 [useMetadata',
  '🔍 [MetadataScreen',
  '🔍 [processStremioSource',
  '[TMDB Cache]',
  '[TMDB Cache',
  '[TMDB API',
  '[useMetadata',
  "'[useMetadata",
  "'🔍 [useMetadata",
  "'🔍 [MetadataScreen",
  '[MetadataScreen',
  "'🔍 [CatalogService",
  '[CatalogService',
  "'[CatalogService",
  '[loadMetadata',
  "'[loadMetadata",
  '[loadCast',
  "'[loadCast",
  // Home / UI
  '[FeaturedContent',
  "'[FeaturedContent",
  '[SeriesContent',
  "'[SeriesContent",
  '[TabView',
  '[HomeScreen',
  'MetadataScreen:',
  "'MetadataScreen:",
  '[HeroSection',
  "'HeroSection",
  'HeroSection',
  "'HeroSection'",
  '[useMDBListRatings',
  'TrailersSection',
  "'TrailersSection",
  // Services
  '[SupabaseSyncService',
  "'[SupabaseSyncService",
  '[CalendarData',
  '[Cache',
  '[ConfigService',
  "'[ConfigService",
  '[useTraktIntegration',
  '[MemoryManager',
  '[MemoryMonitor',
  '[CampaignManager',
  "'[CampaignManager",
  '[CampaignService',
  "'[CampaignService",
  '[CampaignService',
  "'[CampaignService",
  '[Telemetry',
  "'[TelemetryService",
  '[SimklService',
  "'[SimklService",
  '[TraktService',
  "'[TraktService",
  '[NotificationService',
  "'[NotificationService",
  '[LocalScraperService',
  "'[LocalScraperService",
  // Player
  '[KSPlayerCore:Desktop]',
  '[KSPlayerCore',
  "'[KSPlayerCore",
  'KSPlayerView:',
  '[KSPlayerSurface',
  "'[KSPlayerSurface",
  '[DesktopPlayerOverlay',
  '[ParentalGuideOverlay',
  "'[ParentalGuideOverlay",
  'warning KSPlayer:',
  // Misc
  'Lottie animation',
  'Loading custom catalog',
  'Section 0:',
  'Memory monitoring',
  'AI service initialized',
  'Successfully fetched and combined genres',
];

/**
 * Native/framework warning patterns to suppress in dev.
 * These are from UIKit, gesture-handler, and RN internals --
 * noise that can't be fixed in our code.
 */
const NATIVE_NOISE_PATTERNS: string[] = [
  'cannot add handler to',                    // gesture-handler on Catalyst (200+/session)
  'Sending \'onAnimatedValueUpdate\' with no listeners',  // RN animated
  'Unbalanced calls start/end for tag',       // RN internal
  'Internal inconsistency in menus',          // Catalyst menu system
  '`setTranslucent` is only available on Android', // should be gone now but belt+braces
  '`setBackgroundColor` is only available on Android',
  'ViewBridge to RemoteViewService Terminated', // Catalyst ViewBridge
  'HALC_ShellObject',                         // CoreAudio noise
  'AX Safe category class',                   // Accessibility framework
  'void * _Nullable NSMapGet',                // UIKit internal
  'Each child in a list should have a unique "key" prop', // React key warning (fix upstream)
  'not in fullscreen state',                  // ESC handler when not fullscreen
  'Unable to simultaneously satisfy constraints', // KSPlayer AutoLayout noise
  'nw_endpoint_flow_failed',                  // network subsystem noise
  'nw_socket_handle_socket_event',            // network subsystem noise
  'warning KSPlayer: KSOptions.swift:387',    // videoClockSync spam (100+/session)
  'warning KSPlayer: KSOptions.swift:524',    // audio channel config
  'warning KSPlayer: KSOptions.swift:528',    // audio channel config
  'warning KSPlayer: KSOptions.swift:548',    // audio channel config
  'warning KSPlayer: AVFFmpegExtension',      // audio layout tag
  'warning KSPlayer: Resample.swift',         // audio format
  'warning KSPlayer: AudioEnginePlayer',      // audio engine prep
  'AQMEIO_HAL',                               // CoreAudio headset info spam
  'AudioConverter.cpp',                       // CoreAudio converter errors
  'HALC_ProxyIOContext',                      // CoreAudio IO overload
  'Failed to load item AXCodeItem',           // Accessibility framework loading
  'KSPlayerView: ESC pressed',               // KSPlayer's own ESC handler (ours debounces)
  'KSPlayerView: [SUBTITLE',                 // subtitle debug spam
  'KSPlayerView: [VIDEO GRAVITY',            // video gravity changes
  'KSPlayerView: [SET TEXT TRACK',            // text track config
  'KSPlayerView: [READY TO PLAY',            // ready state repeats
  'KSPlayerView: [DELEGATE CALLED',          // delegate callback noise
  'KSPlayerView: [PERF',                     // perf metrics
  'KSPlayerView: [PROP SETTER',              // prop setter debug
];

function isQuiet(args: any[]): boolean {
  if (VERBOSE || args.length === 0) return false;
  const first = args[0];
  if (typeof first !== 'string') return false;
  for (let i = 0; i < QUIET_PREFIXES.length; i++) {
    if (first.startsWith(QUIET_PREFIXES[i])) return true;
  }
  return false;
}

function isNativeNoise(args: any[]): boolean {
  if (VERBOSE || args.length === 0) return false;
  const first = args[0];
  if (typeof first !== 'string') return false;
  for (let i = 0; i < NATIVE_NOISE_PATTERNS.length; i++) {
    if (first.includes(NATIVE_NOISE_PATTERNS[i])) return true;
  }
  return false;
}

/**
 * Patch global console.warn/console.log to filter native noise in dev.
 * Call once at app startup (e.g. in index.ts or App.tsx).
 */
let _patched = false;
export function patchConsoleForDev(): void {
  if (_patched || !__DEV__) return;
  _patched = true;

  const origWarn = console.warn;
  const origLog = console.log;

  console.warn = (...args: any[]) => {
    if (isNativeNoise(args)) return;
    origWarn(...args);
  };

  console.log = (...args: any[]) => {
    if (isNativeNoise(args)) return;
    origLog(...args);
  };
}

class Logger {
  private isEnabled: boolean;

  constructor() {
    this.isEnabled = __DEV__;
  }

  log(...args: any[]) {
    if (this.isEnabled && !isQuiet(args)) {
      console.log(...args);
    }
  }

  error(...args: any[]) {
    if (this.isEnabled) {
      console.error(...args);
    }
  }

  warn(...args: any[]) {
    if (this.isEnabled) {
      console.warn(...args);
    }
  }

  info(...args: any[]) {
    if (this.isEnabled && !isQuiet(args)) {
      console.info(...args);
    }
  }

  debug(...args: any[]) {
    if (this.isEnabled && !isQuiet(args)) {
      console.debug(...args);
    }
  }
}

export const logger = new Logger(); 
