import Foundation
import UIKit
import React

// MARK: - Debug Logging

/// Set to true to enable verbose native overlay/keyboard logs.
/// Automatically disabled in release builds regardless of this flag.
private let kNuvioVerboseLogging = false

private func nuvioLog(_ message: String) {
  #if DEBUG
  if kNuvioVerboseLogging {
    NSLog("%@", message)
  }
  #endif
}

// MARK: - PlatformInfo Event Emitter (keyboard shortcuts + constants)

@objc(PlatformInfo)
class PlatformInfo: RCTEventEmitter {

  static var shared: PlatformInfo?
  private var hasListeners = false

  override init() {
    super.init()
    PlatformInfo.shared = self
  }

  @objc override static func requiresMainQueueSetup() -> Bool {
    return false
  }

  @objc override func constantsToExport() -> [AnyHashable: Any]! {
    var isMacCatalyst = false
    #if targetEnvironment(macCatalyst)
    isMacCatalyst = true
    #endif
    return ["isMacCatalyst": isMacCatalyst]
  }

  override func supportedEvents() -> [String]! {
    return ["onKeyCommand"]
  }

  override func startObserving() {
    hasListeners = true
  }

  override func stopObserving() {
    hasListeners = false
  }

  func emitKeyCommand(_ commandId: String) {
    guard hasListeners else { return }
    sendEvent(withName: "onKeyCommand", body: ["id": commandId])
  }

  /// Called from JS to toggle macOS native fullscreen
  @objc func toggleFullscreen() {
    #if targetEnvironment(macCatalyst)
    DispatchQueue.main.async {
      toggleMacFullscreen()
    }
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
    let hover = UIHoverGestureRecognizer(target: self, action: #selector(handleHover(_:)))
    addGestureRecognizer(hover)
    #endif
  }

  required init?(coder: NSCoder) {
    fatalError("init(coder:) has not been implemented")
  }

  #if targetEnvironment(macCatalyst)
  @objc private func handleHover(_ recognizer: UIHoverGestureRecognizer) {
    switch recognizer.state {
    case .began:
      onHoverIn?([:])
    case .ended, .cancelled:
      onHoverOut?([:])
    default:
      break
    }
  }
  #endif
}

@objc(HoverViewManager)
class HoverViewManager: RCTViewManager {
  override static func requiresMainQueueSetup() -> Bool {
    return false
  }

  override func view() -> UIView! {
    return HoverableNativeView()
  }
}

// MARK: - Fullscreen helper (shared)

#if targetEnvironment(macCatalyst)
private func isMacFullscreen() -> Bool {
  guard let nsApp = NSClassFromString("NSApplication")?.value(forKeyPath: "sharedApplication") as? NSObject,
        let nsWindow = nsApp.value(forKey: "keyWindow") as? NSObject else { return false }
  // NSWindow.styleMask contains .fullScreen (1 << 14 = 16384) when in fullscreen
  let mask = (nsWindow.value(forKey: "styleMask") as? UInt) ?? 0
  return (mask & (1 << 14)) != 0
}

private func toggleMacFullscreen() {
  if let nsApp = NSClassFromString("NSApplication")?.value(forKeyPath: "sharedApplication") as? NSObject,
     let nsWindow = nsApp.value(forKey: "keyWindow") as? NSObject {
    nsWindow.perform(NSSelectorFromString("toggleFullScreen:"), with: nil)
    nuvioLog("[DesktopPlayerOverlay] toggleFullScreen called")
  } else {
    NSLog("[DesktopPlayerOverlay] Could not get NSWindow for fullscreen")
  }
}
#endif

// MARK: - DesktopPlayerOverlay (keyboard + mouse hover for player on Catalyst)
// Click-to-play and double-click-to-fullscreen are handled on the JS side
// to avoid gesture recogniser conflicts and the 300ms single-click delay.

#if targetEnvironment(macCatalyst)
class DesktopPlayerOverlayView: UIView {
  @objc var onMouseMove: RCTDirectEventBlock?

  private var mouseIdleTimer: Timer?

  override init(frame: CGRect) {
    super.init(frame: frame)
    backgroundColor = .clear
    isUserInteractionEnabled = true

    // Hover only -- no click/double-click gestures (handled in JS)
    let hover = UIHoverGestureRecognizer(target: self, action: #selector(handleMouseMove(_:)))
    addGestureRecognizer(hover)

    nuvioLog("[DesktopPlayerOverlay] Initialized with hover gesture")
  }

  required init?(coder: NSCoder) {
    fatalError("init(coder:) has not been implemented")
  }

  override var canBecomeFirstResponder: Bool { true }

  // Allow touches to pass through to views underneath (controls, buttons)
  override func hitTest(_ point: CGPoint, with event: UIEvent?) -> UIView? {
    // Only claim hits for hover -- return nil so taps fall through
    return nil
  }

  override func didMoveToWindow() {
    super.didMoveToWindow()
    if window != nil {
      DispatchQueue.main.asyncAfter(deadline: .now() + 0.3) { [weak self] in
        self?.becomeFirstResponder()
        NSLog("[DesktopPlayerOverlay] becomeFirstResponder: \(self?.isFirstResponder ?? false)")
      }
    }
  }

  // Override keyCommands to intercept keys BEFORE the UIKit focus system
  override var keyCommands: [UIKeyCommand]? {
    let cmds = [
      UIKeyCommand(input: UIKeyCommand.inputLeftArrow, modifierFlags: [], action: #selector(arrowLeft)),
      UIKeyCommand(input: UIKeyCommand.inputRightArrow, modifierFlags: [], action: #selector(arrowRight)),
      UIKeyCommand(input: UIKeyCommand.inputUpArrow, modifierFlags: [], action: #selector(arrowUp)),
      UIKeyCommand(input: UIKeyCommand.inputDownArrow, modifierFlags: [], action: #selector(arrowDown)),
      UIKeyCommand(input: " ", modifierFlags: [], action: #selector(spaceKey)),
      UIKeyCommand(input: UIKeyCommand.inputEscape, modifierFlags: [], action: #selector(escapeKey)),
      UIKeyCommand(input: "f", modifierFlags: [], action: #selector(fKey)),
      UIKeyCommand(input: "m", modifierFlags: [], action: #selector(mKey)),
      UIKeyCommand(input: "j", modifierFlags: [], action: #selector(jKey)),
      UIKeyCommand(input: "l", modifierFlags: [], action: #selector(lKey)),
    ]
    for c in cmds { c.discoverabilityTitle = nil }
    return cmds
  }

  @objc private func arrowLeft() {
    nuvioLog("[DesktopPlayerOverlay] LEFT -> seekBack")
    PlatformInfo.shared?.emitKeyCommand("playerSeekBack")
  }
  @objc private func arrowRight() {
    nuvioLog("[DesktopPlayerOverlay] RIGHT -> seekForward")
    PlatformInfo.shared?.emitKeyCommand("playerSeekForward")
  }
  @objc private func arrowUp() {
    nuvioLog("[DesktopPlayerOverlay] UP -> volumeUp")
    PlatformInfo.shared?.emitKeyCommand("playerVolumeUp")
  }
  @objc private func arrowDown() {
    nuvioLog("[DesktopPlayerOverlay] DOWN -> volumeDown")
    PlatformInfo.shared?.emitKeyCommand("playerVolumeDown")
  }
  @objc private func spaceKey() {
    nuvioLog("[DesktopPlayerOverlay] SPACE -> toggle")
    PlatformInfo.shared?.emitKeyCommand("playerToggle")
  }
  @objc private func escapeKey() {
    // ESC only exits fullscreen. If not fullscreen, show controls instead.
    if isMacFullscreen() {
      nuvioLog("[DesktopPlayerOverlay] ESC -> exit fullscreen")
      toggleMacFullscreen()
    } else {
      nuvioLog("[DesktopPlayerOverlay] ESC -> show controls")
      PlatformInfo.shared?.emitKeyCommand("playerShowControls")
    }
  }
  @objc private func fKey() {
    nuvioLog("[DesktopPlayerOverlay] F -> fullscreen")
    toggleMacFullscreen()
  }
  @objc private func mKey() {
    nuvioLog("[DesktopPlayerOverlay] M -> mute")
    PlatformInfo.shared?.emitKeyCommand("playerMute")
  }
  @objc private func jKey() {
    nuvioLog("[DesktopPlayerOverlay] J -> seekBack")
    PlatformInfo.shared?.emitKeyCommand("playerSeekBack")
  }
  @objc private func lKey() {
    nuvioLog("[DesktopPlayerOverlay] L -> seekForward")
    PlatformInfo.shared?.emitKeyCommand("playerSeekForward")
  }

  // MARK: Mouse movement
  @objc private func handleMouseMove(_ recognizer: UIHoverGestureRecognizer) {
    switch recognizer.state {
    case .began, .changed:
      PlatformInfo.shared?.emitKeyCommand("playerMouseMove")
      resetMouseIdleTimer()
    case .ended, .cancelled:
      PlatformInfo.shared?.emitKeyCommand("playerMouseLeave")
    default:
      break
    }
  }

  private func resetMouseIdleTimer() {
    mouseIdleTimer?.invalidate()
    mouseIdleTimer = Timer.scheduledTimer(withTimeInterval: 3.0, repeats: false) { [weak self] _ in
      guard self != nil else { return }
      PlatformInfo.shared?.emitKeyCommand("playerMouseIdle")
    }
  }

  deinit {
    mouseIdleTimer?.invalidate()
    nuvioLog("[DesktopPlayerOverlay] Deinit")
  }
}

@objc(DesktopPlayerOverlayManager)
class DesktopPlayerOverlayManager: RCTViewManager {
  override static func requiresMainQueueSetup() -> Bool { false }
  override func view() -> UIView! { DesktopPlayerOverlayView() }
}
#else
// Non-Catalyst stub so JS requireNativeComponent doesn't crash
@objc(DesktopPlayerOverlayManager)
class DesktopPlayerOverlayManager: RCTViewManager {
  override static func requiresMainQueueSetup() -> Bool { false }
  override func view() -> UIView! {
    let v = UIView(); v.backgroundColor = .clear; return v
  }
}
#endif

// MARK: - UIResponder extension for MENU keyboard shortcuts
// Handles Cmd+key shortcuts from the menu bar. Player-specific keys
// (space, arrows, etc.) are handled by DesktopPlayerOverlay instead.

#if targetEnvironment(macCatalyst)
extension UIResponder {
  @objc func handleCmdK() { PlatformInfo.shared?.emitKeyCommand("search") }
  @objc func handleCmdComma() { PlatformInfo.shared?.emitKeyCommand("settings") }
  @objc func handleCmdBack() { PlatformInfo.shared?.emitKeyCommand("back") }
  @objc func handleEscape() { PlatformInfo.shared?.emitKeyCommand("escape") }
  @objc func handleTab1() { PlatformInfo.shared?.emitKeyCommand("tab1") }
  @objc func handleTab2() { PlatformInfo.shared?.emitKeyCommand("tab2") }
  @objc func handleTab3() { PlatformInfo.shared?.emitKeyCommand("tab3") }
  @objc func handleTab4() { PlatformInfo.shared?.emitKeyCommand("tab4") }
  @objc func handleTab5() { PlatformInfo.shared?.emitKeyCommand("tab5") }
}
#endif
