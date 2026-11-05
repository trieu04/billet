const baseConfig = require('./app.json').expo

const appleSignInEnabled = process.env.EXPO_PUBLIC_APPLE_SIGN_IN_ENABLED === 'true'

module.exports = {
  ...baseConfig,
  plugins: [
    ...baseConfig.plugins,
    ...(appleSignInEnabled ? ['expo-apple-authentication'] : []),
    ['./plugins/with-optional-apple-authentication', { enabled: appleSignInEnabled }],
  ],
  ios: {
    ...baseConfig.ios,
    usesAppleSignIn: appleSignInEnabled,
  },
}
