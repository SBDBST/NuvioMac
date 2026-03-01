import Expo
// @generated begin react-native-google-cast-import - expo prebuild (DO NOT MODIFY) sync-4cd300bca26a1d1fcc83f4baf37b0e62afcc1867
#if canImport(GoogleCast) && os(iOS)
import GoogleCast
#endif
// @generated end react-native-google-cast-import
import React
import ReactAppDependencyProvider

@UIApplicationMain
public class AppDelegate: ExpoAppDelegate {
  var window: UIWindow?

  var reactNativeDelegate: ExpoReactNativeFactoryDelegate?
  var reactNativeFactory: RCTReactNativeFactory?

  public override func application(
    _ application: UIApplication,
    didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil
  ) -> Bool {
// @generated begin react-native-google-cast-didFinishLaunchingWithOptions - expo prebuild (DO NOT MODIFY) sync-3f476aa248b3451597781fe1ea72c7d4127ed7f9
#if canImport(GoogleCast) && os(iOS)
    let receiverAppID = "CC1AD845"
    let criteria = GCKDiscoveryCriteria(applicationID: receiverAppID)
    let options = GCKCastOptions(discoveryCriteria: criteria)
    options.disableDiscoveryAutostart = false
    options.startDiscoveryAfterFirstTapOnCastButton = true
    options.suspendSessionsWhenBackgrounded = true
    GCKCastContext.setSharedInstanceWith(options)
    GCKCastContext.sharedInstance().useDefaultExpandedMediaControls = true
#endif
// @generated end react-native-google-cast-didFinishLaunchingWithOptions
    let delegate = ReactNativeDelegate()
    let factory = ExpoReactNativeFactory(delegate: delegate)
    delegate.dependencyProvider = RCTAppDependencyProvider()

    reactNativeDelegate = delegate
    reactNativeFactory = factory
    bindReactNativeFactory(factory)

#if os(iOS) || os(tvOS)
    window = UIWindow(frame: UIScreen.main.bounds)
    factory.startReactNative(
      withModuleName: "main",
      in: window,
      launchOptions: launchOptions)
#endif

    return super.application(application, didFinishLaunchingWithOptions: launchOptions)
  }

  // Linking API
  public override func application(
    _ app: UIApplication,
    open url: URL,
    options: [UIApplication.OpenURLOptionsKey: Any] = [:]
  ) -> Bool {
    return super.application(app, open: url, options: options) || RCTLinkingManager.application(app, open: url, options: options)
  }

  // Universal Links
  public override func application(
    _ application: UIApplication,
    continue userActivity: NSUserActivity,
    restorationHandler: @escaping ([UIUserActivityRestoring]?) -> Void
  ) -> Bool {
    let result = RCTLinkingManager.application(application, continue: userActivity, restorationHandler: restorationHandler)
    return super.application(application, continue: userActivity, restorationHandler: restorationHandler) || result
  }

  // ─── Mac Catalyst Menu & Keyboard Shortcuts ──────────────────────
  #if targetEnvironment(macCatalyst)
  public override func buildMenu(with builder: UIMenuBuilder) {
    super.buildMenu(with: builder)
    guard builder.system == .main else { return }

    // Navigation shortcuts
    let navChildren: [UIKeyCommand] = [
      UIKeyCommand(title: "Search", action: #selector(handleCmdK), input: "k", modifierFlags: .command),
      UIKeyCommand(title: "Preferences...", action: #selector(handleCmdComma), input: ",", modifierFlags: .command),
      UIKeyCommand(title: "Back", action: #selector(handleCmdBack), input: "[", modifierFlags: .command),
    ]
    let navMenu = UIMenu(title: "Navigate", options: .displayInline, children: navChildren)
    builder.insertSibling(navMenu, afterMenu: .view)

    // Tab switching
    let tabChildren: [UIKeyCommand] = [
      UIKeyCommand(title: "Home", action: #selector(handleTab1), input: "1", modifierFlags: .command),
      UIKeyCommand(title: "Search", action: #selector(handleTab2), input: "2", modifierFlags: .command),
      UIKeyCommand(title: "Library", action: #selector(handleTab3), input: "3", modifierFlags: .command),
      UIKeyCommand(title: "Downloads", action: #selector(handleTab4), input: "4", modifierFlags: .command),
    ]
    let tabMenu = UIMenu(title: "Tabs", options: .displayInline, children: tabChildren)
    builder.insertChild(tabMenu, atEndOfMenu: .view)
  }

  @objc func handleCmdK() { PlatformInfo.shared?.emitKeyCommand("search") }
  @objc func handleCmdComma() { PlatformInfo.shared?.emitKeyCommand("settings") }
  @objc func handleCmdBack() { PlatformInfo.shared?.emitKeyCommand("back") }
  @objc func handleTab1() { PlatformInfo.shared?.emitKeyCommand("tab1") }
  @objc func handleTab2() { PlatformInfo.shared?.emitKeyCommand("tab2") }
  @objc func handleTab3() { PlatformInfo.shared?.emitKeyCommand("tab3") }
  @objc func handleTab4() { PlatformInfo.shared?.emitKeyCommand("tab4") }
  #endif
}

class ReactNativeDelegate: ExpoReactNativeFactoryDelegate {
  // Extension point for config-plugins

  override func sourceURL(for bridge: RCTBridge) -> URL? {
    // needed to return the correct URL for expo-dev-client.
    bridge.bundleURL ?? bundleURL()
  }

  override func bundleURL() -> URL? {
#if DEBUG
    return RCTBundleURLProvider.sharedSettings().jsBundleURL(forBundleRoot: ".expo/.virtual-metro-entry")
#else
    return Bundle.main.url(forResource: "main", withExtension: "jsbundle")
#endif
  }

  func application(
    _ application: UIApplication,
    handleEventsForBackgroundURLSession identifier: String,
    completionHandler: @escaping () -> Void
  ) {
    RNBackgroundDownloader.setCompletionHandlerWithIdentifier(identifier, completionHandler: completionHandler)
  }

}
