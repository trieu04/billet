import React, { useState } from "react";
import { View, Text, StyleSheet, KeyboardAvoidingView, Platform } from "react-native";
import { Link } from "expo-router";
import { useAuth } from "../../src/auth/auth-context";
import { apiErrorMessage } from "../../src/api/client";
import { Screen, TextField, PrimaryButton } from "../../src/components/ui";
import { colors, spacing } from "../../src/theme";

export default function LoginScreen() {
  const { signIn } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onSubmit = async () => {
    setError(null);
    setLoading(true);
    try {
      await signIn(email.trim(), password);
    } catch (e) {
      setError(apiErrorMessage(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.wrap}
      >
        <Text style={styles.title}>Billet</Text>
        <Text style={styles.subtitle}>Photos with your people.</Text>

        <View style={styles.form}>
          <TextField
            placeholder="Email"
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
          />
          <TextField
            placeholder="Password"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <PrimaryButton label="Log in" onPress={onSubmit} loading={loading} />
        </View>

        <Link href="/(auth)/register" style={styles.link}>
          <Text style={styles.linkText}>Need an account? Sign up</Text>
        </Link>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, justifyContent: "center", padding: spacing.lg, gap: spacing.md },
  title: { color: colors.primary, fontSize: 40, fontWeight: "800", textAlign: "center" },
  subtitle: { color: colors.textMuted, textAlign: "center", marginBottom: spacing.md },
  form: { gap: spacing.md },
  error: { color: colors.danger, textAlign: "center" },
  link: { alignSelf: "center", marginTop: spacing.md },
  linkText: { color: colors.text },
});
