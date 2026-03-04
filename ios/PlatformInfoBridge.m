#import <React/RCTBridgeModule.h>
#import <React/RCTEventEmitter.h>
#import <React/RCTViewManager.h>

@interface RCT_EXTERN_MODULE(PlatformInfo, RCTEventEmitter)
@end

@interface RCT_EXTERN_MODULE(HoverViewManager, RCTViewManager)
RCT_EXPORT_VIEW_PROPERTY(onHoverIn, RCTDirectEventBlock)
RCT_EXPORT_VIEW_PROPERTY(onHoverOut, RCTDirectEventBlock)
@end
