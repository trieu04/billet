import { Feather } from '@expo/vector-icons'
import { type Href, router } from 'expo-router'
import { Pressable, StyleSheet, Text, View } from 'react-native'

import { colors, fonts } from '@/features/ui/theme'

type TabKey = 'journal' | 'statistics' | 'profile'

const tabs: Array<{
  icon: 'file-text' | 'bar-chart-2' | 'user'
  key: TabKey
  label: string
  route: string
}> = [
  { icon: 'file-text', key: 'journal', label: 'Journal', route: '/' },
  { icon: 'bar-chart-2', key: 'statistics', label: 'Thống kê', route: '/statistics' },
  { icon: 'user', key: 'profile', label: 'Hồ sơ', route: '/profile' },
]

export function BottomTabBar({ active }: { active: TabKey }) {
  return (
    <View accessibilityRole="tablist" style={styles.bar}>
      {tabs.map((tab) => {
        const selected = active === tab.key
        return (
          <Pressable
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            key={tab.key}
            onPress={() => router.replace(tab.route as Href)}
            style={styles.tab}
          >
            <View style={[styles.pill, selected && styles.selectedPill]}>
              <Feather
                color={selected ? colors.text : colors.textSecondary}
                name={tab.icon}
                size={21}
              />
            </View>
            <Text style={[styles.label, selected && styles.selectedLabel]}>{tab.label}</Text>
          </Pressable>
        )
      })}
    </View>
  )
}

const styles = StyleSheet.create({
  bar: {
    alignItems: 'flex-start',
    backgroundColor: colors.card,
    borderTopColor: '#E9E2D7',
    borderTopWidth: 1,
    bottom: 0,
    flexDirection: 'row',
    height: 84,
    justifyContent: 'space-between',
    left: 0,
    paddingHorizontal: 29,
    paddingTop: 10,
    position: 'absolute',
    right: 0,
  },
  label: { color: colors.textSecondary, fontFamily: fonts.semibold, fontSize: 10 },
  pill: { alignItems: 'center', borderRadius: 15, height: 30, justifyContent: 'center', width: 52 },
  selectedLabel: { color: colors.text },
  selectedPill: { backgroundColor: colors.peachSoft },
  tab: { alignItems: 'center', gap: 3, width: 72 },
})
