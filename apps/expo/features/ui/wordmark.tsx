import { View } from 'react-native'
import Svg, { Circle, Path, Rect } from 'react-native-svg'

import { colors } from './theme'

const CORAL = '#E3705A'
const WIDTH = 422.33
const HEIGHT = 140

/** Finalized Billet wordmark (docs/brand/logo.md). */
export function Wordmark({ height = 28 }: { height?: number }) {
  return (
    <View accessibilityLabel="Billet" accessibilityRole="image" accessible>
      <Svg
        fill="none"
        height={height}
        stroke={colors.text}
        strokeWidth={18}
        viewBox={`0 60 ${WIDTH} ${HEIGHT}`}
        width={(height * WIDTH) / HEIGHT}
      >
        <Path d="M50 109A41 41 0 0 1 91 150A41 41 0 0 1 50 191H9V150A41 41 0 0 1 50 109Z" />
        <Path d="M9 60V150" />
        <Circle cx={50} cy={150} fill={CORAL} r={17.6} stroke="none" />
        <Path d="M132.9 100V200" />
        <Rect fill={colors.text} height={20.88} stroke="none" width={20.88} x={122.46} y={71.66} />
        <Path d="M174.8 60V200" />
        <Path d="M216.7 60V200" />
        <Path d="M258.6 150H336.6A39 39 0 1 0 326.92 175.72" />
        <Path d="M380.33 72V167A24 24 0 0 0 404.33 191H422.33" />
        <Path d="M360.33 109H420.33" />
      </Svg>
    </View>
  )
}
