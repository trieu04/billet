import { Stack } from 'expo-router'
import { StatusBar } from 'expo-status-bar'

export default function RootLayout() {
  return (
    <>
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: '#0c0a09' },
          headerTintColor: '#fafaf9',
        }}
      >
        <Stack.Screen name="index" options={{ title: 'Billet' }} />
        <Stack.Screen name="health" options={{ title: 'Health' }} />
      </Stack>
      <StatusBar style="light" />
    </>
  )
}
