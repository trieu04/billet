import { StyleSheet, Text, View } from 'react-native'
import { healthStatus } from '@/features/health/health-status'

export default function HealthScreen() {
  return (
    <View style={styles.container}>
      <View style={styles.dot} />
      <Text style={styles.title}>{healthStatus.label}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    backgroundColor: '#0c0a09',
    flex: 1,
    justifyContent: 'center',
  },
  dot: { backgroundColor: '#34d399', borderRadius: 8, height: 16, width: 16 },
  title: { color: '#fafaf9', fontSize: 24, fontWeight: '600', marginTop: 18 },
})
