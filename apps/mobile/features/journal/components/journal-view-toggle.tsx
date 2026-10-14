import { Feather } from '@expo/vector-icons'
import { type Href, router } from 'expo-router'
import { Pressable, StyleSheet, View } from 'react-native'

import { colors } from '@/features/ui/theme'

type JournalView = 'timeline' | 'grid'

export function JournalViewToggle({ active }: { active: JournalView }) {
  return (
    <View accessibilityRole="tablist" style={styles.toggle}>
      <Pressable
        accessibilityLabel="Dạng thời gian"
        accessibilityRole="tab"
        accessibilityState={{ selected: active === 'timeline' }}
        onPress={() => router.replace('/' as Href)}
        style={[styles.button, active === 'timeline' && styles.active]}
      >
        <Feather
          color={active === 'timeline' ? colors.text : colors.textSecondary}
          name="list"
          size={18}
        />
      </Pressable>
      <Pressable
        accessibilityLabel="Dạng bảng"
        accessibilityRole="tab"
        accessibilityState={{ selected: active === 'grid' }}
        onPress={() => router.replace('/calendar' as Href)}
        style={[styles.button, active === 'grid' && styles.active]}
      >
        <Feather
          color={active === 'grid' ? colors.text : colors.textSecondary}
          name="grid"
          size={18}
        />
      </Pressable>
    </View>
  )
}

const styles = StyleSheet.create({
  active: {
    backgroundColor: colors.card,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  button: { alignItems: 'center', borderRadius: 8, flex: 1, justifyContent: 'center' },
  toggle: {
    backgroundColor: '#EAE3D8',
    borderRadius: 10,
    flexDirection: 'row',
    gap: 2,
    height: 34,
    padding: 3,
    width: 88,
  },
})
