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
  FlatList,
  Image,
  Linking,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { formatZoomFactor, nextZoomPreset } from '../camera-zoom'
import {
  pickPlaceholderPhotos,
  placeholderPhotoUri,
  type PlaceholderPhoto,
} from '../placeholder-photos'
import { usePinchZoom } from '../use-pinch-zoom'
import { AnimatedPressable } from '@/features/ui/motion'
import { expensePhotoAspectRatio } from '@/features/ui/media'
import { colors, fonts } from '@/features/ui/theme'

const stripItemSize = { height: 64, width: 48 }

export function QuickCaptureScreen() {
  const focused = useIsFocused()
  const cameraRef = useRef<CameraView>(null)
  const [permission, requestPermission] = useCameraPermissions()
  const [facing, setFacing] = useState<CameraType>('back')
  const [flash, setFlash] = useState<FlashMode>('off')
  const [isCameraReady, setIsCameraReady] = useState(false)
  const [isCapturing, setIsCapturing] = useState(false)
  const [cameraError, setCameraError] = useState(false)
  const { width } = useWindowDimensions()
  const { zoom, setZoom, panHandlers } = usePinchZoom()
  const [samples, setSamples] = useState(pickPlaceholderPhotos)
  const captureLock = useRef(false)
  const active = useRef(true)
  useFocusEffect(
    useCallback(() => {
      active.current = true
      setSamples(pickPlaceholderPhotos())
      return () => {
        active.current = false
        setIsCameraReady(false)
      }
    }, []),
  )

  const openReview = (imageUri: string, categoryCode?: string) => {
    router.push({
      pathname: '/review',
      params: { imageUri, capturedAt: new Date().toISOString(), categoryCode },
    })
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

  const selectPlaceholder = (photo: PlaceholderPhoto) => {
    const uri = placeholderPhotoUri(photo)
    if (uri && !captureLock.current) openReview(uri, photo.categoryCode)
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
      <View
        style={[styles.viewfinder, { maxHeight: width / expensePhotoAspectRatio }]}
        {...panHandlers}
      >
        {permission?.granted && focused && !cameraError ? (
          <CameraView
            facing={facing}
            flash={flash}
            zoom={zoom}
            mode="picture"
            onCameraReady={() => setIsCameraReady(true)}
            onMountError={() => {
              setIsCameraReady(false)
              setCameraError(true)
              setZoom(0)
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
        {permission?.granted && focused && !cameraError ? (
          <AnimatedPressable
            accessibilityHint="Chạm để đổi mức zoom hoặc chụm hai ngón để zoom"
            accessibilityLabel={`Mức zoom ${formatZoomFactor(zoom)}`}
            accessibilityRole="button"
            onPress={() => setZoom(nextZoomPreset(zoom))}
            pressedScale={0.92}
            style={styles.zoomButton}
          >
            <Text adjustsFontSizeToFit numberOfLines={1} style={styles.zoomText}>
              {formatZoomFactor(zoom)}
            </Text>
          </AnimatedPressable>
        ) : null}
      </View>
      <PlaceholderStrip disabled={isCapturing} onSelect={selectPlaceholder} photos={samples} />
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

function PlaceholderStrip({
  disabled,
  onSelect,
  photos,
}: {
  disabled: boolean
  photos: PlaceholderPhoto[]
  onSelect: (photo: PlaceholderPhoto) => void
}) {
  return (
    <FlatList
      accessibilityLabel="Ảnh mẫu"
      contentContainerStyle={styles.stripContent}
      data={photos}
      initialNumToRender={8}
      windowSize={5}
      horizontal
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => (
        <AnimatedPressable
          accessibilityLabel={`Dùng ảnh mẫu ${item.label}`}
          accessibilityRole="button"
          disabled={disabled}
          onPress={() => onSelect(item)}
          style={styles.stripItem}
        >
          <Image
            fadeDuration={0}
            resizeMethod="scale"
            resizeMode="cover"
            source={item.thumbnail}
            style={styles.stripImage}
          />
        </AnimatedPressable>
      )}
      showsHorizontalScrollIndicator={false}
      style={styles.strip}
    />
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
          ? 'Camera chưa khả dụng. Bạn có thể chọn ảnh từ thư viện.'
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
    marginBottom: 24,
    marginTop: 'auto',
    paddingTop: 14,
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
  left: { left: 16 },
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
    flex: 1,
    justifyContent: 'center',
    marginTop: 16,
    overflow: 'hidden',
    width: '100%',
  },
  strip: { flexGrow: 0, flexShrink: 0, height: 72, marginTop: 14 },
  stripContent: { alignItems: 'center', gap: 8, paddingHorizontal: 20 },
  stripImage: {
    borderRadius: 12,
    height: stripItemSize.height,
    width: stripItemSize.width,
  },
  stripItem: { height: stripItemSize.height, width: stripItemSize.width },
  zoomButton: {
    alignItems: 'center',
    backgroundColor: 'rgba(31,27,24,0.65)',
    borderRadius: 24,
    bottom: 14,
    height: 48,
    justifyContent: 'center',
    position: 'absolute',
    width: 48,
  },
  zoomText: { color: colors.peach, fontFamily: fonts.semibold, fontSize: 14 },
})
