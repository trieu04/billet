import { Stack } from "expo-router";

// Auth flow (login / register) — no session yet.
export default function AuthLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
