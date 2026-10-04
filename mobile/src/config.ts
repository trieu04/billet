// Central app configuration.
// EXPO_PUBLIC_API_URL (if set in a .env file) overrides the default LAN address.
export const API_URL =
  process.env.EXPO_PUBLIC_API_URL ?? "http://192.168.88.243:4000";
