/**
 * Debug builds on a physical iPhone need an embedded JS bundle unless Metro is reachable on the LAN.
 * Expo's default Xcode script sets SKIP_BUNDLING for all Debug configs, and AppDelegate always asks
 * Metro in DEBUG — together that yields "No script URL provided" when you open the app from the icon.
 *
 * This plugin (1) limits SKIP_BUNDLING to the simulator only and (2) prefers `main.jsbundle` on device.
 */
const fs = require('fs');
const path = require('path');
const { withDangerousMod } = require('expo/config-plugins');

const PBX_OLD =
  'if [[ \\"$CONFIGURATION\\" = *Debug* ]]; then\\n  export SKIP_BUNDLING=1\\nfi\\nif [[ -z \\"$ENTRY_FILE\\" ]]; then';
const PBX_NEW =
  'if [[ \\"$CONFIGURATION\\" = *Debug* && \\"$PLATFORM_NAME\\" == *simulator* ]]; then\\n  export SKIP_BUNDLING=1\\nfi\\nif [[ -z \\"$ENTRY_FILE\\" ]]; then';

const SWIFT_NEEDLE = 'override func bundleURL() -> URL?';
const SWIFT_MARKER = 'targetEnvironment(simulator)';

const SWIFT_OLD_BLOCK = `  override func bundleURL() -> URL? {
#if DEBUG
    return RCTBundleURLProvider.sharedSettings().jsBundleURL(forBundleRoot: ".expo/.virtual-metro-entry")
#else
    return Bundle.main.url(forResource: "main", withExtension: "jsbundle")
#endif
  }`;

const SWIFT_NEW_BLOCK = `  override func bundleURL() -> URL? {
#if DEBUG
    #if targetEnvironment(simulator)
    return RCTBundleURLProvider.sharedSettings().jsBundleURL(forBundleRoot: ".expo/.virtual-metro-entry")
    #else
    if let embedded = Bundle.main.url(forResource: "main", withExtension: "jsbundle") {
      return embedded
    }
    return RCTBundleURLProvider.sharedSettings().jsBundleURL(forBundleRoot: ".expo/.virtual-metro-entry")
    #endif
#else
    return Bundle.main.url(forResource: "main", withExtension: "jsbundle")
#endif
  }`;

module.exports = function withIosPhysicalDeviceDebugBundle(config) {
  return withDangerousMod(config, [
    'ios',
    async (cfg) => {
      const iosRoot = cfg.modRequest.platformProjectRoot;
      const pbxPath = path.join(iosRoot, 'DealHub.xcodeproj', 'project.pbxproj');
      if (fs.existsSync(pbxPath)) {
        let pbx = fs.readFileSync(pbxPath, 'utf8');
        if (pbx.includes(PBX_OLD)) {
          pbx = pbx.replace(PBX_OLD, PBX_NEW);
          fs.writeFileSync(pbxPath, pbx);
        }
      }
      const appDelegatePath = path.join(iosRoot, 'DealHub', 'AppDelegate.swift');
      if (fs.existsSync(appDelegatePath)) {
        let src = fs.readFileSync(appDelegatePath, 'utf8');
        if (!src.includes(SWIFT_MARKER) && src.includes(SWIFT_NEEDLE) && src.includes(SWIFT_OLD_BLOCK)) {
          src = src.replace(SWIFT_OLD_BLOCK, SWIFT_NEW_BLOCK);
          fs.writeFileSync(appDelegatePath, src);
        }
      }
      return cfg;
    },
  ]);
};
