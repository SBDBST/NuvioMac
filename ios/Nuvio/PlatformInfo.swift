import Foundation
import UIKit
import React

// ═══════════════════════════════════════════════════════════════════════
// NuvioMac Player Input Architecture v3
//
// KEYBOARD:  All shortcuts go through AppDelegate.buildMenu as hidden
//            UIKeyCommand items. Player keys (Space, F, ESC, arrows,
//            M, J, L) are ONLY added when the player is active, and
//            use wantsPriorityOverSystemBehavior = true to override
//            KSPlayer's own keyCommands.
//            When the player closes, UIMenuSystem.main.setNeedsRebuild()
//            removes them so Space types normally, arrows scroll, etc.
//
// MOUSE:     JS onPointerMove on the click-to-play surface (primary).
//            Native UIHoverGestureRecognizer on the overlay (fallback).
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

// MARK: - PlatformInfo Event Emitter

@objc(PlatformInfo)
class PlatformInfo: RCTEventEmitter {

  static var shared: PlatformInfo?
  private var hasListeners = false

  /// True when the player is on screen. Toggled by DesktopPlayerOverlayView.
  /// Read by AppDelegate.buildMenu to conditionally add player key commands.
  static var isPlayerActive = false {
    didSet {
      #if targetEnvironment(macCatalyst)
      if oldValue != isPlayerActive {
        // Rebuild the menu bar to add/remove player keyboard shortcuts
        DispatchQueue.main.async {
          UIMenuSystem.main.setNeedsRebuild()
        }
      }
      #endif
    }
  }

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

// MARK: - DesktopPlayerOverlay (lifecycle flag + hover fallback)

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
//
// Navigation keys (Cmd+K, Cmd+[, Cmd+1-5) are always active.
// Player keys (Space, F, arrows, M, J, L) are only in the menu
// when isPlayerActive is true (AppDelegate rebuilds the menu).
// ESC is always in the menu but behaviour depends on player state.

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

  // ── ESC (always active, behaviour depends on context) ──
  @objc func handleEscape() {
    if PlatformInfo.isPlayerActive {
      if isMacFullscreen() {
        toggleMacFullscreen()
      } else {
        PlatformInfo.shared?.emitKeyCommand("escape")
      }
    } else {
      PlatformInfo.shared?.emitKeyCommand("escape")
    }
  }

  // ── Player keys (only in menu when player is active) ──
  @objc func handlePlayerSpace() {
    nuvioLog("[Menu] Space -> playerToggle")
    PlatformInfo.shared?.emitKeyCommand("playerToggle")
  }
  @objc func handlePlayerF() {
    nuvioLog("[Menu] F -> fullscreen")
    toggleMacFullscreen()
  }
  @objc func handlePlayerLeft() {
    nuvioLog("[Menu] Left -> seekBack")
    PlatformInfo.shared?.emitKeyCommand("playerSeekBack")
  }
  @objc func handlePlayerRight() {
    nuvioLog("[Menu] Right -> seekForward")
    PlatformInfo.shared?.emitKeyCommand("playerSeekForward")
  }
  @objc func handlePlayerUp() {
    nuvioLog("[Menu] Up -> volumeUp")
    PlatformInfo.shared?.emitKeyCommand("playerVolumeUp")
  }
  @objc func handlePlayerDown() {
    nuvioLog("[Menu] Down -> volumeDown")
    PlatformInfo.shared?.emitKeyCommand("playerVolumeDown")
  }
  @objc func handlePlayerM() {
    nuvioLog("[Menu] M -> mute")
    PlatformInfo.shared?.emitKeyCommand("playerMute")
  }
  @objc func handlePlayerJ() {
    nuvioLog("[Menu] J -> seekBack")
    PlatformInfo.shared?.emitKeyCommand("playerSeekBack")
  }
  @objc func handlePlayerL() {
    nuvioLog("[Menu] L -> seekForward")
    PlatformInfo.shared?.emitKeyCommand("playerSeekForward")
  }
}
#endif
