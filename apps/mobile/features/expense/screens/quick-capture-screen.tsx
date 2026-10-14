import { Feather } from '@expo/vector-icons'
import { CameraView, type CameraType, type FlashMode, useCameraPermissions } from 'expo-camera'
import * as ImagePicker from 'expo-image-picker'
import { LinearGradient } from 'expo-linear-gradient'
import { router } from 'expo-router'
import { useRef, useState } from 'react'
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { colors, fonts } from '@/features/ui/theme'

export function QuickCaptureScreen() {
  const cameraRef = useRef<CameraView>(null)
  const [permission, requestPermission] = useCameraPermissions()
  const [facing, setFacing] = useState<CameraType>('back')
  const [flash, setFlash] = useState<FlashMode>('off')
  const [isCameraReady, setIsCameraReady] = useState(false)
  const [isCapturing, setIsCapturing] = useState(false)

  const openReview = (imageUri: string) => {
    router.push({ pathname: '/review', params: { imageUri } })
  }

  const takePicture = async () => {
    if (!cameraRef.current || !isCameraReady || isCapturing) return

    try {
      setIsCapturing(true)
      const picture = await cameraRef.current.takePictureAsync({ quality: 0.85 })
      if (picture?.uri) openReview(picture.uri)
    } catch {
      Alert.alert('Không thể chụp ảnh', 'Hãy thử lại hoặc chọn ảnh từ thư viện.')
    } finally {
      setIsCapturing(false)
    }
  }

  const pickImage = async () => {
    const mediaPermission = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (!mediaPermission.granted) {
      Alert.alert('Cần quyền truy cập ảnh', 'Cho phép Billet truy cập thư viện để chọn hóa đơn.')
      return
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      allowsEditing: true,
      mediaTypes: ['images'],
      quality: 0.85,
    })
    if (!result.canceled && result.assets[0]?.uri) openReview(result.assets[0].uri)
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Pressable accessibilityLabel="Đóng" onPress={() => router.back()} style={styles.circle}>
          <Feather color="white" name="x" size={22} />
        </Pressable>
        <Text style={styles.title}>Chụp hóa đơn</Text>
        <Pressable
          accessibilityLabel={flash === 'off' ? 'Bật đèn flash' : 'Tắt đèn flash'}
          accessibilityState={{ selected: flash === 'on' }}
          onPress={() => setFlash((current) => (current === 'off' ? 'on' : 'off'))}
          style={[styles.circle, flash === 'on' && styles.activeCircle]}
        >
          <Feather color="white" name={flash === 'off' ? 'zap-off' : 'zap'} size={20} />
        </Pressable>
      </View>
      <View style={styles.viewfinder}>
        {permission?.granted ? (
          <CameraView
            facing={facing}
            flash={flash}
            mode="picture"
            onCameraReady={() => setIsCameraReady(true)}
            onMountError={() => setIsCameraReady(false)}
            ref={cameraRef}
            style={StyleSheet.absoluteFill}
          />
        ) : (
          <PermissionPrompt loading={!permission} onRequest={requestPermission} />
        )}
        <Corner position="tl" />
        <Corner position="tr" />
        <Corner position="bl" />
        <Corner position="br" />
      </View>
      <Text style={styles.hint}>Đặt hóa đơn vào khung · gợi ý hiện sau khi chụp</Text>
      <Pressable
        accessibilityRole="button"
        onPress={() => router.push('/expense')}
        style={styles.manual}
      >
        <Feather color="white" name="plus" size={18} />
        <Text style={styles.manualText}>Nhập tay</Text>
      </Pressable>
      <View style={styles.controls}>
        <Pressable
          accessibilityLabel="Chọn ảnh từ thư viện"
          onPress={pickImage}
          style={styles.photoPicker}
        >
          <LinearGradient
            colors={[colors.peachSoft, colors.lavender]}
            style={StyleSheet.absoluteFill}
          />
          <Feather color="white" name="image" size={21} />
        </Pressable>
        <Pressable
          accessibilityLabel="Chụp ảnh"
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
        </Pressable>
        <Pressable
          accessibilityLabel="Đổi camera"
          onPress={() => {
            setIsCameraReady(false)
            setFacing((current) => (current === 'back' ? 'front' : 'back'))
          }}
          style={styles.flip}
        >
          <Feather color="white" name="refresh-cw" size={22} />
        </Pressable>
      </View>
    </SafeAreaView>
  )
}

function PermissionPrompt({ loading, onRequest }: { loading: boolean; onRequest: () => void }) {
  if (loading) return <ActivityIndicator color="white" size="large" />

  return (
    <View style={styles.permissionPrompt}>
      <Feather color={colors.peach} name="camera" size={34} />
      <Text style={styles.permissionText}>Cho phép camera để chụp hóa đơn</Text>
      <Pressable accessibilityRole="button" onPress={onRequest} style={styles.permissionButton}>
        <Text style={styles.permissionButtonText}>Cho phép camera</Text>
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
    borderRadius: 20,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  controls: {
    alignItems: 'center',
    bottom: 36,
    flexDirection: 'row',
    justifyContent: 'space-between',
    left: 35,
    position: 'absolute',
    right: 35,
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
    marginTop: 11,
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
    height: 400,
    justifyContent: 'center',
    marginHorizontal: 28,
    marginTop: 24,
    overflow: 'hidden',
  },
})
