#import <React/RCTBridgeModule.h>
#import <React/RCTEventEmitter.h>
#import <React/RCTViewManager.h>

@interface RCT_EXTERN_MODULE(PlatformInfo, RCTEventEmitter)
RCT_EXTERN_METHOD(toggleFullscreen)
@end

@interface RCT_EXTERN_MODULE(HoverViewManager, RCTViewManager)
RCT_EXPORT_VIEW_PROPERTY(onHoverIn, RCTDirectEventBlock)
RCT_EXPORT_VIEW_PROPERTY(onHoverOut, RCTDirectEventBlock)
@end

@interface RCT_EXTERN_MODULE(DesktopPlayerOverlayManager, RCTViewManager)
RCT_EXPORT_VIEW_PROPERTY(onMouseMove, RCTDirectEventBlock)
@end
