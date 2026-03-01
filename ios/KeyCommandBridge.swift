import Foundation
import UIKit
import React

/// Native module that emits keyboard shortcut events to JavaScript.
/// Keyboard shortcuts are registered via the Mac Catalyst menu system
/// (buildMenu in AppDelegate) and forwarded here as RCTEventEmitter events.
@objc(KeyCommandBridge)
class KeyCommandBridge: RCTEventEmitter {

  static var shared: KeyCommandBridge?
  private var hasListeners = false

  override init() {
    super.init()
    KeyCommandBridge.shared = self
  }

  @objc override static func requiresMainQueueSetup() -> Bool {
    return false
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

  /// Called from AppDelegate when a key command is triggered.
  func emitKeyCommand(_ commandId: String) {
    guard hasListeners else { return }
    sendEvent(withName: "onKeyCommand", body: ["id": commandId])
  }
}
