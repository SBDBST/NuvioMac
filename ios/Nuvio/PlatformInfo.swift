import Foundation
import UIKit
import React

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
}

// MARK: - HoverView (native hover detection for Mac Catalyst)

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

// MARK: - UIResponder extension for keyboard shortcut handling
// This ensures key commands work regardless of which view is first responder.
// Without this, commands crash when KSPlayer's view is first responder because
// it doesn't implement our custom selectors.

#if targetEnvironment(macCatalyst)
extension UIResponder {
  // Navigation
  @objc func handleCmdK() { PlatformInfo.shared?.emitKeyCommand("search") }
  @objc func handleCmdComma() { PlatformInfo.shared?.emitKeyCommand("settings") }
  @objc func handleCmdBack() { PlatformInfo.shared?.emitKeyCommand("back") }
  @objc func handleEscape() { PlatformInfo.shared?.emitKeyCommand("escape") }

  // Tabs
  @objc func handleTab1() { PlatformInfo.shared?.emitKeyCommand("tab1") }
  @objc func handleTab2() { PlatformInfo.shared?.emitKeyCommand("tab2") }
  @objc func handleTab3() { PlatformInfo.shared?.emitKeyCommand("tab3") }
  @objc func handleTab4() { PlatformInfo.shared?.emitKeyCommand("tab4") }
  @objc func handleTab5() { PlatformInfo.shared?.emitKeyCommand("tab5") }

  // Player media controls
  @objc func handleSpace() { PlatformInfo.shared?.emitKeyCommand("playerToggle") }
  @objc func handleArrowLeft() { PlatformInfo.shared?.emitKeyCommand("playerSeekBack") }
  @objc func handleArrowRight() { PlatformInfo.shared?.emitKeyCommand("playerSeekForward") }
  @objc func handleMuteKey() { PlatformInfo.shared?.emitKeyCommand("playerMute") }
  @objc func handleFullscreen() { PlatformInfo.shared?.emitKeyCommand("playerFullscreen") }
}
#endif
