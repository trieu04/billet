import type { ViewStyle } from 'react-native'

import { colors } from '@/features/ui/theme'

export const cardShadow: ViewStyle = {
  backgroundColor: colors.card,
  shadowColor: '#5A3C1E',
  shadowOffset: { width: 0, height: 6 },
  shadowOpacity: 0.07,
  shadowRadius: 24,
}
