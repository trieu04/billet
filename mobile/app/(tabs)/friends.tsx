import React, { useCallback, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  RefreshControl,
  Alert,
} from "react-native";
import { useFocusEffect } from "expo-router";
import {
  searchUsers,
  sendFriendRequest,
  fetchFriendRequests,
  respondFriendRequest,
  fetchFriends,
  User,
  FriendRequest,
} from "../../src/api/endpoints";
import { apiErrorMessage } from "../../src/api/client";
import { useAuth } from "../../src/auth/auth-context";
import { Screen, TextField } from "../../src/components/ui";
import { colors, radius, spacing } from "../../src/theme";

export default function FriendsScreen() {
  const { user, signOut } = useAuth();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<User[]>([]);
  const [requests, setRequests] = useState<FriendRequest[]>([]);
  const [friends, setFriends] = useState<User[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    setRefreshing(true);
    try {
      const [r, f] = await Promise.all([fetchFriendRequests(), fetchFriends()]);
      setRequests(r);
      setFriends(f);
    } catch (e) {
      Alert.alert("Error", apiErrorMessage(e));
    } finally {
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const runSearch = async (q: string) => {
    setQuery(q);
    if (q.trim().length < 1) return setResults([]);
    try {
      setResults(await searchUsers(q.trim()));
    } catch {
      setResults([]);
    }
  };

  const addFriend = async (u: User) => {
    try {
      await sendFriendRequest(u.id);
      setResults((prev) => prev.filter((x) => x.id !== u.id));
      Alert.alert("Request sent", `Friend request sent to ${u.displayName}`);
    } catch (e) {
      Alert.alert("Could not send", apiErrorMessage(e));
    }
  };

  const respond = async (req: FriendRequest, accept: boolean) => {
    try {
      await respondFriendRequest(req.id, accept);
      load();
    } catch (e) {
      Alert.alert("Error", apiErrorMessage(e));
    }
  };

  return (
    <Screen>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={load} tintColor={colors.primary} />
        }
      >
        <Text style={styles.hello}>Signed in as {user?.displayName}</Text>

        <Text style={styles.section}>Find friends</Text>
        <TextField placeholder="Search by username" value={query} onChangeText={runSearch} />
        {results.map((u) => (
          <Row key={u.id} title={u.displayName} subtitle={`@${u.username}`}>
            <ActionButton label="Add" onPress={() => addFriend(u)} />
          </Row>
        ))}

        {requests.length > 0 && <Text style={styles.section}>Requests</Text>}
        {requests.map((req) => (
          <Row
            key={req.id}
            title={req.requester.displayName}
            subtitle={`@${req.requester.username}`}
          >
            <ActionButton label="Accept" onPress={() => respond(req, true)} />
            <ActionButton label="Decline" muted onPress={() => respond(req, false)} />
          </Row>
        ))}

        <Text style={styles.section}>Your friends ({friends.length})</Text>
        {friends.length === 0 ? (
          <Text style={styles.muted}>No friends yet. Search above to add some.</Text>
        ) : (
          friends.map((f) => <Row key={f.id} title={f.displayName} subtitle={`@${f.username}`} />)
        )}

        <Pressable style={styles.signOut} onPress={signOut}>
          <Text style={styles.signOutText}>Sign out</Text>
        </Pressable>
      </ScrollView>
    </Screen>
  );
}

function Row({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children?: React.ReactNode;
}) {
  return (
    <View style={styles.row}>
      <View style={{ flex: 1 }}>
        <Text style={styles.rowTitle}>{title}</Text>
        <Text style={styles.rowSub}>{subtitle}</Text>
      </View>
      <View style={styles.rowActions}>{children}</View>
    </View>
  );
}

function ActionButton({
  label,
  onPress,
  muted,
}: {
  label: string;
  onPress: () => void;
  muted?: boolean;
}) {
  return (
    <Pressable onPress={onPress} style={[styles.actionBtn, muted && styles.actionMuted]}>
      <Text style={[styles.actionText, muted && styles.actionMutedText]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.md, gap: spacing.sm },
  hello: { color: colors.textMuted, marginBottom: spacing.sm },
  section: { color: colors.text, fontSize: 16, fontWeight: "700", marginTop: spacing.md },
  muted: { color: colors.textMuted },
  row: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  rowTitle: { color: colors.text, fontWeight: "600" },
  rowSub: { color: colors.textMuted, fontSize: 12 },
  rowActions: { flexDirection: "row", gap: spacing.sm },
  actionBtn: {
    backgroundColor: colors.primary,
    borderRadius: radius.pill,
    paddingVertical: spacing.xs + 2,
    paddingHorizontal: spacing.md,
  },
  actionMuted: { backgroundColor: colors.surfaceAlt },
  actionText: { color: colors.primaryText, fontWeight: "700" },
  actionMutedText: { color: colors.text },
  signOut: { marginTop: spacing.xl, alignItems: "center", padding: spacing.md },
  signOutText: { color: colors.danger, fontWeight: "600" },
});
