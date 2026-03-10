import Foundation
import UIKit
import React

// ═══════════════════════════════════════════════════════════════════════
// NuvioMac Player Input Architecture
//
// KEYBOARD:  NuvioWindow.sendEvent intercepts key presses BEFORE the
//            responder chain. When the player is active, player keys
//            (Space, F, ESC, arrows, M, J, L) are consumed here and
//            routed to JS via PlatformInfo. KSPlayer never sees them.
//            When the player is inactive, all keys pass through normally.
//
// MOUSE:     JS onPointerMove on the click-to-play surface (primary).
//            Native UIHoverGestureRecognizer on the overlay (fallback).
//
// CLICK:     JS onResponderRelease on the click-to-play surface.
//
// CONTROLS:  pointerEvents="box-none" on the controls container lets
//            clicks on empty space fall through to click-to-play.
//
// FULLSCREEN: Native toggleFullscreen via NSWindow, callable from JS.
// ═══════════════════════════════════════════════════════════════════════

// MARK: - Debug Logging

private let kNuvioVerboseLogging = false

private func nuvioLog(_ message: String) {
  #if DEBUG
  if kNuvioVerboseLogging {
    NSLog("%@", message)
  }
  #endif
}

// MARK: - NuvioWindow (keyboard interception at the window level)

#if targetEnvironment(macCatalyst)

/// Custom UIWindow that intercepts keyboard events before the responder
/// chain. This bypasses KSPlayer's first-responder keyboard handling
/// entirely -- no fighting for focus, no timers, no monitors.
///
/// When `PlatformInfo.isPlayerActive` is true, player keys are consumed
/// here and emitted to JS. When false, all events pass through normally
/// so standard text input, button activation, etc. work as expected.
class NuvioWindow: UIWindow {

  // Track which keys we've consumed on began so we also consume their
  // ended/cancelled phases. Prevents stale key-down state in UIKit.
  private var consumedKeyCodes = Set<Int>()

  // Debounce for keys that suffer from key-repeat (ESC, F, Space)
  private var lastKeyTimes: [Int: TimeInterval] = [:]
  private let debounceInterval: TimeInterval = 0.3

  override func sendEvent(_ event: UIEvent) {
    // Only intercept press events when the player is active
    guard PlatformInfo.isPlayerActive, event.type == .presses,
          let pressEvent = event as? UIPressesEvent else {
      super.sendEvent(event)
      return
    }

    for press in pressEvent.allPresses {
      guard let key = press.key else { continue }
      let code = Int(key.keyCode.rawValue)

      if press.phase == .began {
        if let commandId = playerCommandForKey(key) {
          // Debounce: skip if fired too recently
          let now = CACurrentMediaTime()
          if let last = lastKeyTimes[code], now - last < debounceInterval {
            return // consume silently
          }
          lastKeyTimes[code] = now

          // Emit to JS and consume the event
          handlePlayerCommand(commandId, key: key)
          consumedKeyCodes.insert(code)
          return
        }
      } else if press.phase == .ended || press.phase == .cancelled {
        if consumedKeyCodes.remove(code) != nil {
          return // consume the up phase too
        }
      }
    }

    // Not a player key or player not active -- pass through
    super.sendEvent(event)
  }

  /// Maps a UIKey to a player command ID, or nil if not a player key.
  private func playerCommandForKey(_ key: UIKey) -> String? {
    // Don't intercept if any modifier is held (Cmd+F, Cmd+Space, etc.
    // should not trigger player commands)
    if !key.modifierFlags.intersection([.command, .control, .alternate]).isEmpty {
      return nil
    }

    switch key.keyCode {
    case .keyboardSpacebar:     return "playerToggle"
    case .keyboardEscape:       return "playerEscape"  // special: fullscreen or close
    case .keyboardF:            return "playerFullscreen"
    case .keyboardLeftArrow:    return "playerSeekBack"
    case .keyboardRightArrow:   return "playerSeekForward"
    case .keyboardUpArrow:      return "playerVolumeUp"
    case .keyboardDownArrow:    return "playerVolumeDown"
    case .keyboardM:            return "playerMute"
    case .keyboardJ:            return "playerSeekBack"
    case .keyboardL:            return "playerSeekForward"
    default:                    return nil
    }
  }

  /// Handles a player command, performing native actions where needed
  /// (fullscreen) or emitting to JS for everything else.
  private func handlePlayerCommand(_ commandId: String, key: UIKey) {
    switch commandId {
    case "playerEscape":
      if isMacFullscreen() {
        nuvioLog("[NuvioWindow] ESC -> exit fullscreen")
        toggleMacFullscreen()
      } else {
        nuvioLog("[NuvioWindow] ESC -> close player")
        PlatformInfo.shared?.emitKeyCommand("escape")
      }

    case "playerFullscreen":
      nuvioLog("[NuvioWindow] F -> toggle fullscreen")
      toggleMacFullscreen()

    default:
      nuvioLog("[NuvioWindow] \(commandId)")
      PlatformInfo.shared?.emitKeyCommand(commandId)
    }
  }
}

#endif

// MARK: - PlatformInfo Event Emitter

@objc(PlatformInfo)
class PlatformInfo: RCTEventEmitter {

  static var shared: PlatformInfo?
  private var hasListeners = false

  /// True when the player is on screen. Set by DesktopPlayerOverlayView.
  /// Read by NuvioWindow to decide whether to intercept keyboard events.
  static var isPlayerActive = false

  override init() {
    super.init()
    PlatformInfo.shared = self
  }

  @objc override static func requiresMainQueueSetup() -> Bool { false }

  @objc override func constantsToExport() -> [AnyHashable: Any]! {
    var isMacCatalyst = false
    #if targetEnvironment(macCatalyst)
    isMacCatalyst = true
    #endif
    return ["isMacCatalyst": isMacCatalyst]
  }

  override func supportedEvents() -> [String]! { ["onKeyCommand"] }
  override func startObserving() { hasListeners = true }
  override func stopObserving() { hasListeners = false }

  func emitKeyCommand(_ commandId: String) {
    guard hasListeners else { return }
    sendEvent(withName: "onKeyCommand", body: ["id": commandId])
  }

  /// Called from JS to toggle macOS native fullscreen
  @objc func toggleFullscreen() {
    #if targetEnvironment(macCatalyst)
    DispatchQueue.main.async { toggleMacFullscreen() }
    #endif
  }
}

// MARK: - HoverView (native hover detection for content cards)

class HoverableNativeView: UIView {
  @objc var onHoverIn: RCTDirectEventBlock?
  @objc var onHoverOut: RCTDirectEventBlock?

  override init(frame: CGRect) {
    super.init(frame: frame)
    backgroundColor = .clear
    #if targetEnvironment(macCatalyst)
    addGestureRecognizer(UIHoverGestureRecognizer(target: self, action: #selector(handleHover(_:))))
    #endif
  }

  required init?(coder: NSCoder) { fatalError() }

  #if targetEnvironment(macCatalyst)
  @objc private func handleHover(_ r: UIHoverGestureRecognizer) {
    switch r.state {
    case .began:          onHoverIn?([:])
    case .ended, .cancelled: onHoverOut?([:])
    default: break
    }
  }
  #endif
}

@objc(HoverViewManager)
class HoverViewManager: RCTViewManager {
  override static func requiresMainQueueSetup() -> Bool { false }
  override func view() -> UIView! { HoverableNativeView() }
}

// MARK: - Fullscreen helpers

#if targetEnvironment(macCatalyst)
func isMacFullscreen() -> Bool {
  guard let nsApp = NSClassFromString("NSApplication")?.value(forKeyPath: "sharedApplication") as? NSObject,
        let nsWindow = nsApp.value(forKey: "keyWindow") as? NSObject else { return false }
  let mask = (nsWindow.value(forKey: "styleMask") as? UInt) ?? 0
  return (mask & (1 << 14)) != 0
}

func toggleMacFullscreen() {
  if let nsApp = NSClassFromString("NSApplication")?.value(forKeyPath: "sharedApplication") as? NSObject,
     let nsWindow = nsApp.value(forKey: "keyWindow") as? NSObject {
    nsWindow.perform(NSSelectorFromString("toggleFullScreen:"), with: nil)
  }
}
#endif

// MARK: - DesktopPlayerOverlay (hover-only, sets isPlayerActive flag)
//
// This view has ONE job: track whether the player is on screen via the
// isPlayerActive flag. It also provides a native hover gesture recognizer
// as a fallback for mouse-move detection (primary path is JS onPointerMove).
//
// It does NOT handle keyboard input. That's done by NuvioWindow.
// It does NOT fight for first responder. That's no longer needed.

#if targetEnvironment(macCatalyst)
class DesktopPlayerOverlayView: UIView {
  @objc var onMouseMove: RCTDirectEventBlock?

  private var mouseIdleTimer: Timer?

  override init(frame: CGRect) {
    super.init(frame: frame)
    backgroundColor = .clear
    isUserInteractionEnabled = true
    addGestureRecognizer(UIHoverGestureRecognizer(target: self, action: #selector(handleMouseMove(_:))))
  }

  required init?(coder: NSCoder) { fatalError() }

  // Pass all touches through -- this view is invisible to taps.
  // The JS click-to-play layer at a higher zIndex handles clicks.
  override func hitTest(_ point: CGPoint, with event: UIEvent?) -> UIView? { nil }

  override func didMoveToWindow() {
    super.didMoveToWindow()
    let active = (window != nil)
    PlatformInfo.isPlayerActive = active
    NSLog("[DesktopPlayerOverlay] isPlayerActive = \(active)")
  }

  @objc private func handleMouseMove(_ r: UIHoverGestureRecognizer) {
    switch r.state {
    case .began, .changed:
      PlatformInfo.shared?.emitKeyCommand("playerMouseMove")
      resetMouseIdleTimer()
    case .ended, .cancelled:
      PlatformInfo.shared?.emitKeyCommand("playerMouseLeave")
    default: break
    }
  }

  private func resetMouseIdleTimer() {
    mouseIdleTimer?.invalidate()
    mouseIdleTimer = Timer.scheduledTimer(withTimeInterval: 3.0, repeats: false) { _ in
      PlatformInfo.shared?.emitKeyCommand("playerMouseIdle")
    }
  }

  deinit {
    mouseIdleTimer?.invalidate()
    PlatformInfo.isPlayerActive = false
    nuvioLog("[DesktopPlayerOverlay] Deinit")
  }
}

@objc(DesktopPlayerOverlayManager)
class DesktopPlayerOverlayManager: RCTViewManager {
  override static func requiresMainQueueSetup() -> Bool { false }
  override func view() -> UIView! { DesktopPlayerOverlayView() }
}

#else

// Non-Catalyst stub
@objc(DesktopPlayerOverlayManager)
class DesktopPlayerOverlayManager: RCTViewManager {
  override static func requiresMainQueueSetup() -> Bool { false }
  override func view() -> UIView! {
    let v = UIView(); v.backgroundColor = .clear; return v
  }
}

#endif

// MARK: - UIResponder extension (Cmd+key menu shortcuts only)
//
// These handle MENU keyboard shortcuts (Cmd+K, Cmd+[, Cmd+1-5).
// Player-specific keys (Space, F, ESC, arrows) are handled by
// NuvioWindow -- they do NOT go through the menu/responder system.

#if targetEnvironment(macCatalyst)
extension UIResponder {
  @objc func handleCmdK()     { PlatformInfo.shared?.emitKeyCommand("search") }
  @objc func handleCmdComma() { PlatformInfo.shared?.emitKeyCommand("settings") }
  @objc func handleCmdBack()  { PlatformInfo.shared?.emitKeyCommand("back") }
  @objc func handleEscape()   { PlatformInfo.shared?.emitKeyCommand("escape") }
  @objc func handleTab1()     { PlatformInfo.shared?.emitKeyCommand("tab1") }
  @objc func handleTab2()     { PlatformInfo.shared?.emitKeyCommand("tab2") }
  @objc func handleTab3()     { PlatformInfo.shared?.emitKeyCommand("tab3") }
  @objc func handleTab4()     { PlatformInfo.shared?.emitKeyCommand("tab4") }
  @objc func handleTab5()     { PlatformInfo.shared?.emitKeyCommand("tab5") }
}
#endif
