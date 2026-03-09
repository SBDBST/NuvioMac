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

    // Set Mac Catalyst window constraints after scene connection
    #if targetEnvironment(macCatalyst)
    DispatchQueue.main.async { [weak self] in
      if let windowScene = self?.window?.windowScene {
        windowScene.sizeRestrictions?.minimumSize = CGSize(width: 900, height: 600)
        windowScene.title = "Nuvio"
        // Enable full-size content for a more native Mac feel
        windowScene.titlebar?.titleVisibility = .hidden
        windowScene.titlebar?.toolbar = nil
      }
    }
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

    // Remove system menus that crash when forwarded to KSPlayer's first responder
    builder.remove(menu: .format)
    builder.remove(menu: .spelling)
    builder.remove(menu: .substitutions)
    builder.remove(menu: .transformations)

    // Navigation shortcuts
    let navChildren: [UIKeyCommand] = [
      UIKeyCommand(title: "Search", action: #selector(UIResponder.handleCmdK), input: "k", modifierFlags: .command),
      UIKeyCommand(title: "Preferences...", action: #selector(UIResponder.handleCmdComma), input: ",", modifierFlags: .command),
      UIKeyCommand(title: "Back", action: #selector(UIResponder.handleCmdBack), input: "[", modifierFlags: .command),
    ]
    // ESC without modifiers -- fires globally, handled by the player to close
    // or by other screens to go back. Hidden so it doesn't appear in menu bar.
    let escCmd = UIKeyCommand(title: "", action: #selector(UIResponder.handleEscape), input: UIKeyCommand.inputEscape, modifierFlags: [])
    escCmd.discoverabilityTitle = nil
    let navMenu = UIMenu(title: "Navigate", options: .displayInline, children: navChildren + [escCmd])
    builder.insertSibling(navMenu, afterMenu: .view)

    // Tab switching -- order matches the tab bar: Home, Library, Search, Downloads, Settings
    let tabChildren: [UIKeyCommand] = [
      UIKeyCommand(title: "Home", action: #selector(UIResponder.handleTab1), input: "1", modifierFlags: .command),
      UIKeyCommand(title: "Library", action: #selector(UIResponder.handleTab2), input: "2", modifierFlags: .command),
      UIKeyCommand(title: "Search", action: #selector(UIResponder.handleTab3), input: "3", modifierFlags: .command),
      UIKeyCommand(title: "Downloads", action: #selector(UIResponder.handleTab4), input: "4", modifierFlags: .command),
      UIKeyCommand(title: "Settings", action: #selector(UIResponder.handleTab5), input: "5", modifierFlags: .command),
    ]
    let tabMenu = UIMenu(title: "Tabs", options: .displayInline, children: tabChildren)
    builder.insertChild(tabMenu, atEndOfMenu: .view)
  }
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
