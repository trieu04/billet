import { Feather } from '@expo/vector-icons'
import { CameraView, type CameraType, type FlashMode, useCameraPermissions } from 'expo-camera'
import * as ImagePicker from 'expo-image-picker'
import { LinearGradient } from 'expo-linear-gradient'
import { router, useFocusEffect, useIsFocused } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { useCallback, useRef, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  Linking,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { AnimatedPressable } from '@/features/ui/motion'
import { expensePhotoAspectRatio } from '@/features/ui/media'
import { colors, fonts } from '@/features/ui/theme'

export function QuickCaptureScreen() {
  const focused = useIsFocused()
  const cameraRef = useRef<CameraView>(null)
  const [permission, requestPermission] = useCameraPermissions()
  const [facing, setFacing] = useState<CameraType>('back')
  const [flash, setFlash] = useState<FlashMode>('off')
  const [isCameraReady, setIsCameraReady] = useState(false)
  const [isCapturing, setIsCapturing] = useState(false)
  const [cameraError, setCameraError] = useState(false)
  const captureLock = useRef(false)
  const active = useRef(true)
  useFocusEffect(
    useCallback(() => {
      active.current = true
      return () => {
        active.current = false
        setIsCameraReady(false)
      }
    }, []),
  )

  const openReview = (imageUri: string) => {
    router.push({ pathname: '/review', params: { imageUri, capturedAt: new Date().toISOString() } })
  }

  const takePicture = async () => {
    if (!cameraRef.current || !isCameraReady || captureLock.current) return

    try {
      captureLock.current = true
      setIsCapturing(true)
      const picture = await cameraRef.current.takePictureAsync({ quality: 0.85 })
      if (!picture?.uri) throw new Error('Camera did not return a photo')
      if (active.current) openReview(picture.uri)
    } catch {
      Alert.alert('Không thể chụp ảnh', 'Hãy thử lại hoặc chọn ảnh từ thư viện.')
    } finally {
      setIsCapturing(false)
      captureLock.current = false
    }
  }

  const pickImage = async () => {
    if (captureLock.current) return
    captureLock.current = true
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        allowsEditing: false,
        mediaTypes: ['images'],
        quality: 0.85,
      })
      if (active.current && !result.canceled && result.assets[0]?.uri)
        openReview(result.assets[0].uri)
    } catch {
      Alert.alert('Không thể mở thư viện', 'Hãy thử lại hoặc chụp ảnh mới.')
    } finally {
      captureLock.current = false
    }
  }

  return (
    <SafeAreaView edges={['top', 'bottom']} style={styles.safe}>
      <StatusBar style="light" />
      <View style={styles.header}>
        <AnimatedPressable
          accessibilityLabel="Đóng"
          accessibilityRole="button"
          disabled={isCapturing}
          onPress={() => router.dismissTo('/')}
          pressedScale={0.9}
          style={styles.circle}
        >
          <Feather color="white" name="x" size={22} />
        </AnimatedPressable>
        <Text style={styles.title}>Thêm chi tiêu</Text>
        <AnimatedPressable
          accessibilityLabel={flash === 'off' ? 'Bật đèn flash' : 'Tắt đèn flash'}
          accessibilityRole="button"
          accessibilityState={{ selected: flash === 'on' }}
          onPress={() => setFlash((current) => (current === 'off' ? 'on' : 'off'))}
          style={[styles.circle, flash === 'on' && styles.activeCircle]}
        >
          <Feather color="white" name={flash === 'off' ? 'zap-off' : 'zap'} size={20} />
        </AnimatedPressable>
      </View>
      <View style={styles.viewfinder}>
        {permission?.granted && focused && !cameraError ? (
          <CameraView
            facing={facing}
            flash={flash}
            mode="picture"
            ratio="4:3"
            onCameraReady={() => setIsCameraReady(true)}
            onMountError={() => {
              setIsCameraReady(false)
              setCameraError(true)
            }}
            ref={cameraRef}
            style={StyleSheet.absoluteFill}
          />
        ) : (
          <PermissionPrompt
            loading={!permission}
            unavailable={cameraError}
            canAskAgain={permission?.canAskAgain ?? true}
            onRequest={() => {
              if (cameraError) {
                setCameraError(false)
                return
              }
              if (permission?.canAskAgain === false && Platform.OS !== 'web')
                void Linking.openSettings()
              else void requestPermission()
            }}
          />
        )}
        <Corner position="tl" />
        <Corner position="tr" />
        <Corner position="bl" />
        <Corner position="br" />
      </View>
      <Text style={styles.hint}>Chụp hóa đơn hoặc khoảnh khắc chi tiêu</Text>
      <AnimatedPressable
        accessibilityRole="button"
        onPress={() => router.push('/review')}
        style={styles.manual}
      >
        <Feather color="white" name="plus" size={18} />
        <Text style={styles.manualText}>Nhập tay</Text>
      </AnimatedPressable>
      <View style={styles.controls}>
        <AnimatedPressable
          accessibilityLabel="Chọn ảnh từ thư viện"
          accessibilityRole="button"
          disabled={isCapturing}
          onPress={pickImage}
          style={styles.photoPicker}
        >
          <LinearGradient
            colors={[colors.peachSoft, colors.lavender]}
            style={StyleSheet.absoluteFill}
          />
          <Feather color="white" name="image" size={21} />
        </AnimatedPressable>
        <AnimatedPressable
          accessibilityLabel="Chụp ảnh"
          accessibilityRole="button"
          accessibilityState={{ disabled: !isCameraReady || isCapturing }}
          disabled={!isCameraReady || isCapturing}
          onPress={takePicture}
          style={[styles.shutterOuter, (!isCameraReady || isCapturing) && styles.disabled]}
        >
          {isCapturing ? (
            <ActivityIndicator color={colors.text} />
          ) : (
            <View style={styles.shutterInner} />
          )}
        </AnimatedPressable>
        <AnimatedPressable
          accessibilityLabel="Đổi camera"
          accessibilityRole="button"
          disabled={isCapturing}
          onPress={() => {
            setIsCameraReady(false)
            setFacing((current) => (current === 'back' ? 'front' : 'back'))
          }}
          style={styles.flip}
        >
          <Feather color="white" name="refresh-cw" size={22} />
        </AnimatedPressable>
      </View>
    </SafeAreaView>
  )
}

function PermissionPrompt({
  loading,
  unavailable,
  canAskAgain,
  onRequest,
}: {
  loading: boolean
  unavailable: boolean
  canAskAgain: boolean
  onRequest: () => void
}) {
  if (loading) return <ActivityIndicator color="white" size="large" />

  return (
    <View style={styles.permissionPrompt}>
      <Feather color={colors.peach} name="camera" size={34} />
      <Text style={styles.permissionText}>
        {unavailable
          ? 'Camera chưa khả dụng. Bạn có thể chọn ảnh từ thư viện hoặc nhập tay.'
          : canAskAgain
            ? 'Cho phép camera để chụp khoản chi'
            : 'Quyền camera đang tắt. Bật trong Cài đặt hoặc chọn ảnh từ thư viện.'}
      </Text>
      <Pressable accessibilityRole="button" onPress={onRequest} style={styles.permissionButton}>
        <Text style={styles.permissionButtonText}>
          {unavailable
            ? 'Thử lại camera'
            : canAskAgain
              ? 'Cho phép camera'
              : Platform.OS === 'web'
                ? 'Thử lại'
                : 'Mở Cài đặt'}
        </Text>
      </Pressable>
    </View>
  )
}
function Corner({ position }: { position: 'tl' | 'tr' | 'bl' | 'br' }) {
  return (
    <View
      style={[
        styles.corner,
        position.includes('t') ? styles.top : styles.bottom,
        position.includes('l') ? styles.left : styles.right,
        position.includes('t')
          ? position.includes('l')
            ? styles.tl
            : styles.tr
          : position.includes('l')
            ? styles.bl
            : styles.br,
      ]}
    />
  )
}
const styles = StyleSheet.create({
  bl: { borderBottomWidth: 3, borderLeftWidth: 3 },
  activeCircle: { backgroundColor: colors.link },
  bottom: { bottom: 16 },
  br: { borderBottomWidth: 3, borderRightWidth: 3 },
  circle: {
    alignItems: 'center',
    backgroundColor: '#484440',
    borderRadius: 24,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  controls: {
    alignItems: 'center',
    marginTop: 'auto',
    marginBottom: 24,
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginHorizontal: 35,
  },
  corner: { borderColor: colors.peach, height: 34, position: 'absolute', width: 34 },
  disabled: { opacity: 0.5 },
  flip: {
    alignItems: 'center',
    backgroundColor: '#484440',
    borderRadius: 26,
    height: 52,
    justifyContent: 'center',
    width: 52,
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginHorizontal: 20,
    marginTop: 12,
  },
  hint: {
    color: 'rgba(255,255,255,0.75)',
    fontFamily: fonts.regular,
    fontSize: 13,
    marginTop: 13,
    textAlign: 'center',
  },
  left: { left: 16 },
  manual: {
    alignItems: 'center',
    alignSelf: 'center',
    backgroundColor: '#484440',
    borderRadius: 20,
    flexDirection: 'row',
    gap: 6,
    height: 40,
    justifyContent: 'center',
    marginTop: 34,
    paddingHorizontal: 18,
  },
  manualText: { color: 'white', fontFamily: fonts.medium, fontSize: 15 },
  permissionButton: {
    backgroundColor: colors.peach,
    borderRadius: 20,
    minHeight: 44,
    paddingHorizontal: 18,
    paddingVertical: 11,
  },
  permissionButtonText: { color: '#3A1D0E', fontFamily: fonts.semibold, fontSize: 14 },
  permissionPrompt: { alignItems: 'center', gap: 14, paddingHorizontal: 30 },
  permissionText: { color: 'white', fontFamily: fonts.medium, fontSize: 15, textAlign: 'center' },
  photoPicker: {
    alignItems: 'center',
    backgroundColor: colors.lavender,
    borderColor: 'white',
    borderRadius: 14,
    borderWidth: 2,
    height: 52,
    justifyContent: 'center',
    overflow: 'hidden',
    width: 52,
  },
  right: { right: 16 },
  safe: { backgroundColor: colors.camera, flex: 1 },
  shutterInner: { backgroundColor: colors.card, borderRadius: 30, height: 60, width: 60 },
  shutterOuter: {
    alignItems: 'center',
    borderColor: colors.peach,
    borderRadius: 39,
    borderWidth: 4,
    height: 78,
    justifyContent: 'center',
    width: 78,
  },
  title: { color: 'white', fontFamily: fonts.semibold, fontSize: 16 },
  tl: { borderLeftWidth: 3, borderTopWidth: 3 },
  top: { top: 16 },
  tr: { borderRightWidth: 3, borderTopWidth: 3 },
  viewfinder: {
    alignItems: 'center',
    borderRadius: 30,
    aspectRatio: expensePhotoAspectRatio,
    justifyContent: 'center',
    marginHorizontal: 28,
    marginTop: 20,
    overflow: 'hidden',
  },
})
