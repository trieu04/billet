import { Stack } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts as useInterFonts,
} from '@expo-google-fonts/inter'
import { Nunito_800ExtraBold, useFonts as useNunitoFonts } from '@expo-google-fonts/nunito'

import { SessionGuard, SessionProvider } from '@/features/auth/session'

export default function RootLayout() {
  const [interLoaded] = useInterFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  })
  const [nunitoLoaded] = useNunitoFonts({ Nunito_800ExtraBold })

  if (!interLoaded || !nunitoLoaded) return null

  return (
    <SessionProvider>
      <SessionGuard>
        <Stack screenOptions={{ headerShown: false, animation: 'fade' }}>
          <Stack.Screen name="capture" options={{ animation: 'fade', gestureEnabled: false }} />
          <Stack.Screen name="review" options={{ animation: 'fade_from_bottom' }} />
          <Stack.Screen name="expense" options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="calendar" options={{ animation: 'fade' }} />
        </Stack>
        <StatusBar style="dark" />
      </SessionGuard>
    </SessionProvider>
  )
}
