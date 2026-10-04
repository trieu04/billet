import React from "react";
import { View, Text, Image, StyleSheet, useWindowDimensions } from "react-native";
import { Post } from "../api/endpoints";
import { colors, radius, spacing } from "../theme";

// A single feed photo: rounded square image with author + caption overlay.
export function PostCard({ post }: { post: Post }) {
  const { width } = useWindowDimensions();
  const size = width - spacing.md * 2;

  return (
    <View style={styles.card}>
      <Image
        source={{ uri: post.imageUrl }}
        style={{ width: size, height: size, borderRadius: radius.lg }}
      />
      <View style={styles.meta}>
        <Text style={styles.author}>{post.author.displayName}</Text>
        {post.caption ? <Text style={styles.caption}>{post.caption}</Text> : null}
        <Text style={styles.time}>{new Date(post.createdAt).toLocaleString()}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { paddingHorizontal: spacing.md, paddingBottom: spacing.lg },
  meta: { paddingTop: spacing.sm, gap: 2 },
  author: { color: colors.text, fontWeight: "700", fontSize: 16 },
  caption: { color: colors.text, fontSize: 15 },
  time: { color: colors.textMuted, fontSize: 12 },
});
