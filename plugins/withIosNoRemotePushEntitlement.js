/**
 * Runs after expo-notifications and removes `aps-environment` from the iOS entitlements file.
 *
 * Apple’s free “Personal Team” cannot provision apps that declare the Push Notifications capability.
 * DealHub only uses *local* scheduled notifications (`scheduleNotificationAsync`), which do not require
 * `aps-environment`. Remote push / Expo push tokens would require a paid Apple Developer Program account
 * and this entitlement.
 */
const { withEntitlementsPlist } = require('expo/config-plugins');

module.exports = function withIosNoRemotePushEntitlement(config) {
  return withEntitlementsPlist(config, (mod) => {
    delete mod.modResults['aps-environment'];
    return mod;
  });
};
