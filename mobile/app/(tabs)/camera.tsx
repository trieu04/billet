import React, { useState } from "react";
import { View, Text, Image, StyleSheet, Pressable, Alert } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import { createPost } from "../../src/api/endpoints";
import { apiErrorMessage } from "../../src/api/client";
import { Screen, TextField, PrimaryButton } from "../../src/components/ui";
import { colors, radius, spacing } from "../../src/theme";

export default function CameraScreen() {
  const router = useRouter();
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [caption, setCaption] = useState("");
  const [sending, setSending] = useState(false);

  const takePhoto = async () => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) return Alert.alert("Camera permission is required");
    const result = await ImagePicker.launchCameraAsync({ quality: 0.7, allowsEditing: true, aspect: [1, 1] });
    if (!result.canceled) setImageUri(result.assets[0].uri);
  };

  const pickPhoto = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({ quality: 0.7, allowsEditing: true, aspect: [1, 1] });
    if (!result.canceled) setImageUri(result.assets[0].uri);
  };

  const send = async () => {
    if (!imageUri) return;
    setSending(true);
    try {
      await createPost(imageUri, caption.trim());
      setImageUri(null);
      setCaption("");
      router.replace("/(tabs)");
    } catch (e) {
      Alert.alert("Could not send", apiErrorMessage(e));
    } finally {
      setSending(false);
    }
  };

  return (
    <Screen>
      <View style={styles.wrap}>
        <Pressable style={styles.preview} onPress={pickPhoto}>
          {imageUri ? (
            <Image source={{ uri: imageUri }} style={styles.previewImg} />
          ) : (
            <Text style={styles.previewHint}>Tap to choose a photo</Text>
          )}
        </Pressable>

        <View style={styles.actionsRow}>
          <Pressable style={styles.secondaryBtn} onPress={takePhoto}>
            <Text style={styles.secondaryText}>Take photo</Text>
          </Pressable>
          <Pressable style={styles.secondaryBtn} onPress={pickPhoto}>
            <Text style={styles.secondaryText}>Choose photo</Text>
          </Pressable>
        </View>

        <TextField placeholder="Add a message (optional)" value={caption} onChangeText={setCaption} />
        <PrimaryButton label="Send to friends" onPress={send} loading={sending} disabled={!imageUri} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, padding: spacing.md, gap: spacing.md },
  preview: {
    aspectRatio: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  previewImg: { width: "100%", height: "100%" },
  previewHint: { color: colors.textMuted },
  actionsRow: { flexDirection: "row", gap: spacing.md },
  secondaryBtn: {
    flex: 1,
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.pill,
    paddingVertical: spacing.md,
    alignItems: "center",
  },
  secondaryText: { color: colors.text, fontWeight: "600" },
});
