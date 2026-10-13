import { Link } from 'expo-router'
import { Pressable, StyleSheet, Text, View } from 'react-native'

export default function JournalScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.eyebrow}>BILLET</Text>
      <Text style={styles.title}>Your money has a story.</Text>
      <Text style={styles.copy}>
        Capture a receipt, purchase, or meal and remember more than the total.
      </Text>
      <Link href="/health" asChild>
        <Pressable accessibilityRole="button" style={styles.button}>
          <Text style={styles.buttonText}>Check app health</Text>
        </Pressable>
      </Link>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    backgroundColor: '#0c0a09',
    padding: 28,
  },
  eyebrow: {
    color: '#fb923c',
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 4,
  },
  title: {
    color: '#fafaf9',
    fontSize: 48,
    fontWeight: '700',
    letterSpacing: -2,
    marginTop: 20,
  },
  copy: { color: '#a8a29e', fontSize: 18, lineHeight: 28, marginTop: 20 },
  button: {
    alignSelf: 'flex-start',
    backgroundColor: '#f97316',
    borderRadius: 999,
    marginTop: 36,
    paddingHorizontal: 22,
    paddingVertical: 14,
  },
  buttonText: { color: '#1c1917', fontSize: 16, fontWeight: '700' },
})
