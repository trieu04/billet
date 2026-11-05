const { withEntitlementsPlist } = require('expo/config-plugins')

module.exports = (config, { enabled = false } = {}) => {
  if (enabled) return config

  return withEntitlementsPlist(config, (entitlementsConfig) => {
    delete entitlementsConfig.modResults['com.apple.developer.applesignin']
    return entitlementsConfig
  })
}
