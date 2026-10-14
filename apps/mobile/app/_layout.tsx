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
    <>
      <Stack screenOptions={{ headerShown: false, animation: 'fade' }} />
      <StatusBar style="dark" />
    </>
  )
}
