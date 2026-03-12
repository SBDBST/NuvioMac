import Foundation
import UIKit
import ObjectiveC
import React

// ═══════════════════════════════════════════════════════════════════════
// NuvioMac Player Input Architecture v4 (Final)
//
// KEYBOARD:  Menu-based UIKeyCommand in AppDelegate.buildMenu, with
//            runtime swizzle of UIView.keyCommands to suppress KSPlayer's
//            own key handling during playback. This prevents dual-firing.
//
// MOUSE:     Native UIHoverGestureRecognizer on the overlay view.
//            hitTest returns self for .hover events, nil for touches.
//
// CLICK:     JS onResponderRelease on the click-to-play surface.
//
// FULLSCREEN: Native toggle via NSWindow, callable from JS or menu key.
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

// MARK: - KeyCommands Swizzle
//
// When the player is active, ALL UIView subclasses (including KSPlayer's
// views) return nil for keyCommands. This prevents KSPlayer from handling
// Space, F, ESC, arrows etc. Our menu-level UIKeyCommand items are the
// ONLY keyboard handlers during playback.
//
// When the player is inactive, original behaviour is restored.
// The swizzle is installed once and the behaviour is gated dynamically.

#if targetEnvironment(macCatalyst)

private var swizzleInstalled = false

private func installKeyCommandsSwizzle() {
  guard !swizzleInstalled else { return }
  swizzleInstalled = true

  let original = class_getInstanceMethod(UIView.self, #selector(getter: UIResponder.keyCommands))
  let replacement = class_getInstanceMethod(UIView.self, #selector(getter: UIView._nuvio_keyCommands))

  if let original = original, let replacement = replacement {
    method_exchangeImplementations(original, replacement)
    NSLog("[Nuvio] keyCommands swizzle installed")
  }
}

extension UIView {
  @objc dynamic var _nuvio_keyCommands: [UIKeyCommand]? {
    if PlatformInfo.isPlayerActive {
      return nil
    }
    // Calls the original (swizzled) implementation
    return self._nuvio_keyCommands
  }
}

#endif

// MARK: - PlatformInfo Event Emitter

@objc(PlatformInfo)
class PlatformInfo: RCTEventEmitter {

  static var shared: PlatformInfo?
  private var hasListeners = false

  /// True when the player is on screen. Toggled by DesktopPlayerOverlayView.
  /// Controls: (1) menu rebuild to add/remove player shortcuts,
  ///           (2) keyCommands swizzle to suppress KSPlayer's key handling.
  static var isPlayerActive = false {
    didSet {
      #if targetEnvironment(macCatalyst)
      if oldValue != isPlayerActive {
        DispatchQueue.main.async {
          UIMenuSystem.main.setNeedsRebuild()
        }
        NSLog("[Nuvio] isPlayerActive = \(isPlayerActive)")
      }
      #endif
    }
  }

  override init() {
    super.init()
    PlatformInfo.shared = self
    #if targetEnvironment(macCatalyst)
    installKeyCommandsSwizzle()
    #endif
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

  @objc func toggleFullscreen() {
    #if targetEnvironment(macCatalyst)
    DispatchQueue.main.async { toggleMacFullscreen() }
    #endif
  }
}

// MARK: - HoverView (content cards)

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
    case .began:             onHoverIn?([:])
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

// MARK: - DesktopPlayerOverlay (lifecycle + hover)
//
// Two jobs:
// 1. Toggle isPlayerActive when mounted/unmounted (triggers menu rebuild
//    and keyCommands swizzle activation).
// 2. Detect mouse hover via UIHoverGestureRecognizer and emit events to JS.
//
// hitTest returns self for .hover events so the gesture recognizer fires,
// but returns nil for all other events so touches pass through to the
// click-to-play layer and control buttons below.

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

  /// Return self for hover events so the gesture recognizer receives them.
  /// Return nil for everything else so touches fall through to JS layers.
  override func hitTest(_ point: CGPoint, with event: UIEvent?) -> UIView? {
    if let event = event, event.type == .hover {
      return self.point(inside: point, with: event) ? self : nil
    }
    return nil
  }

  override func didMoveToWindow() {
    super.didMoveToWindow()
    PlatformInfo.isPlayerActive = (window != nil)
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
  }
}

@objc(DesktopPlayerOverlayManager)
class DesktopPlayerOverlayManager: RCTViewManager {
  override static func requiresMainQueueSetup() -> Bool { false }
  override func view() -> UIView! { DesktopPlayerOverlayView() }
}

#else

@objc(DesktopPlayerOverlayManager)
class DesktopPlayerOverlayManager: RCTViewManager {
  override static func requiresMainQueueSetup() -> Bool { false }
  override func view() -> UIView! {
    let v = UIView(); v.backgroundColor = .clear; return v
  }
}

#endif

// MARK: - UIResponder handlers for menu keyboard shortcuts

#if targetEnvironment(macCatalyst)
extension UIResponder {
  // ── Navigation (always active) ──
  @objc func handleCmdK()     { PlatformInfo.shared?.emitKeyCommand("search") }
  @objc func handleCmdComma() { PlatformInfo.shared?.emitKeyCommand("settings") }
  @objc func handleCmdBack()  { PlatformInfo.shared?.emitKeyCommand("back") }
  @objc func handleTab1()     { PlatformInfo.shared?.emitKeyCommand("tab1") }
  @objc func handleTab2()     { PlatformInfo.shared?.emitKeyCommand("tab2") }
  @objc func handleTab3()     { PlatformInfo.shared?.emitKeyCommand("tab3") }
  @objc func handleTab4()     { PlatformInfo.shared?.emitKeyCommand("tab4") }
  @objc func handleTab5()     { PlatformInfo.shared?.emitKeyCommand("tab5") }

  // ── ESC (always active, context-dependent) ──
  @objc func handleEscape() {
    if PlatformInfo.isPlayerActive && isMacFullscreen() {
      toggleMacFullscreen()
    } else {
      PlatformInfo.shared?.emitKeyCommand("escape")
    }
  }

  // ── Player keys (only in menu when player is active) ──
  @objc func handlePlayerSpace() { PlatformInfo.shared?.emitKeyCommand("playerToggle") }
  @objc func handlePlayerF()     { toggleMacFullscreen() }
  @objc func handlePlayerLeft()  { PlatformInfo.shared?.emitKeyCommand("playerSeekBack") }
  @objc func handlePlayerRight() { PlatformInfo.shared?.emitKeyCommand("playerSeekForward") }
  @objc func handlePlayerUp()    { PlatformInfo.shared?.emitKeyCommand("playerVolumeUp") }
  @objc func handlePlayerDown()  { PlatformInfo.shared?.emitKeyCommand("playerVolumeDown") }
  @objc func handlePlayerM()     { PlatformInfo.shared?.emitKeyCommand("playerMute") }
  @objc func handlePlayerJ()     { PlatformInfo.shared?.emitKeyCommand("playerSeekBack") }
  @objc func handlePlayerL()     { PlatformInfo.shared?.emitKeyCommand("playerSeekForward") }
}
#endif
