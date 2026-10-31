import { Tabs } from 'expo-router/js-tabs'
import { type Animated, Dimensions, Easing } from 'react-native'

import { BottomTabBar } from '@/features/ui/bottom-tab-bar'
import { tabRoutes } from '@/features/ui/tab-routes'
import { colors } from '@/features/ui/theme'

// Both scenes travel the full screen width together: the outgoing one leaves as the incoming one arrives.
const slideTransition = {
  sceneStyleInterpolator: ({ current }: { current: { progress: Animated.Value } }) => ({
    sceneStyle: {
      transform: [
        {
          translateX: current.progress.interpolate({
            inputRange: [-1, 0, 1],
            outputRange: [-Dimensions.get('window').width, 0, Dimensions.get('window').width],
          }),
        },
      ],
    },
  }),
  transitionSpec: {
    animation: 'timing' as const,
    config: { duration: 300, easing: Easing.out(Easing.cubic) },
  },
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        animation: 'shift',
        headerShown: false,
        sceneStyle: { backgroundColor: colors.canvas },
        ...slideTransition,
      }}
      tabBar={({ state }) => <BottomTabBar active={tabRoutes[state.index]?.key ?? 'journal'} />}
    >
      <Tabs.Screen name="calendar" />
      <Tabs.Screen name="index" />
      <Tabs.Screen name="statistics" />
    </Tabs>
  )
}
