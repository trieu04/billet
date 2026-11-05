import { useEffect, useState } from 'react'
import { Keyboard, Platform } from 'react-native'

export function useKeyboardVisible() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    // Android has no “will” events; iOS uses them so the layout moves with the keyboard.
    const show = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow'
    const hide = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide'
    const subscriptions = [
      Keyboard.addListener(show, () => setVisible(true)),
      Keyboard.addListener(hide, () => setVisible(false)),
    ]
    return () => subscriptions.forEach((subscription) => subscription.remove())
  }, [])

  return visible
}
