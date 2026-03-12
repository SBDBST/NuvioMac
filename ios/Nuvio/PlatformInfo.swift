import Foundation
import UIKit
import ObjectiveC
import React

// ═══════════════════════════════════════════════════════════════════════
// NuvioMac Player Input Architecture v5
//
// PROBLEM: The native overlay view (DesktopPlayerOverlayView) never
// mounts on Fabric/New Architecture because requireNativeComponent is a
// Bridge API. This broke ALL prior approaches that depended on the view's
// didMoveToWindow lifecycle.
//
// FIX: Use NativeModules method calls (work on both Bridge and Fabric)
// for the player lifecycle flag. Use Pressable onHoverIn/onHoverOut in
// JS for mouse hover (no native view needed).
//
// KEYBOARD: Menu UIKeyCommands in AppDelegate.buildMenu (dynamic).
//           UIResponder.keyCommands swizzle suppresses KSPlayer's keys.
// MOUSE:    JS Pressable onHoverIn/onHoverOut on click-to-play surface.
// CLICK:    JS Pressable onPress on click-to-play surface.
// FULLSCREEN: Native toggle via NSWindow.
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
// Swizzles UIResponder.keyCommands (the BASE class where it's defined).
// When isPlayerActive is true, returns nil for ALL responders, including
// KSPlayer's views. Our menu-level UIKeyCommands are the only handlers.
// When the player is inactive, returns the original value.

#if targetEnvironment(macCatalyst)

private var swizzleInstalled = false

private func installKeyCommandsSwizzle() {
  guard !swizzleInstalled else { return }

  // keyCommands is defined on UIResponder, NOT UIView.
  // Using UIView.self would return nil and the swizzle would silently fail.
  let original = class_getInstanceMethod(UIResponder.self, #selector(getter: UIResponder.keyCommands))
  let replacement = class_getInstanceMethod(UIResponder.self, #selector(getter: UIResponder._nuvio_keyCommands))

  guard let orig = original, let repl = replacement else {
    NSLog("[Nuvio] ERROR: keyCommands swizzle failed - methods not found")
    return
  }

  method_exchangeImplementations(orig, repl)
  swizzleInstalled = true
  NSLog("[Nuvio] keyCommands swizzle installed on UIResponder")
}

extension UIResponder {
  @objc dynamic var _nuvio_keyCommands: [UIKeyCommand]? {
    if PlatformInfo.isPlayerActive {
      return nil  // Suppress ALL keyCommands during playback
    }
    // Call original implementation (method is swizzled, so this calls the real getter)
    return self._nuvio_keyCommands
  }
}

#endif

// MARK: - PlatformInfo Event Emitter

@objc(PlatformInfo)
class PlatformInfo: RCTEventEmitter {

  static var shared: PlatformInfo?
  private var hasListeners = false

  /// True when the player is on screen. Set from JS via setPlayerActive().
  /// Controls menu rebuild and keyCommands swizzle activation.
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

  // ── JS-callable methods ──

  /// Called from JS when the player mounts/unmounts.
  /// Triggers menu rebuild and keyCommands swizzle activation.
  @objc func setPlayerActive(_ active: Bool) {
    PlatformInfo.isPlayerActive = active
  }

  /// Called from JS to toggle macOS native fullscreen.
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

// MARK: - DesktopPlayerOverlay (non-critical stub)
//
// This native view is kept for backwards compatibility with the JS
// requireNativeComponent call, but it does NOT work on Fabric and
// is NOT relied upon for any functionality. All critical functions
// use NativeModules method calls and JS Pressable instead.

#if targetEnvironment(macCatalyst)
class DesktopPlayerOverlayView: UIView {
  @objc var onMouseMove: RCTDirectEventBlock?
  override init(frame: CGRect) {
    super.init(frame: frame)
    backgroundColor = .clear
  }
  required init?(coder: NSCoder) { fatalError() }
  override func hitTest(_ point: CGPoint, with event: UIEvent?) -> UIView? { nil }
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

  // ── ESC (always active) ──
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
