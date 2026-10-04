import { api } from "./client";

export interface User {
  id: string;
  username: string;
  displayName: string;
  createdAt: string;
}

export interface Post {
  id: string;
  imageUrl: string;
  caption: string | null;
  createdAt: string;
  author: User;
}

export interface FriendRequest {
  id: string;
  createdAt: string;
  requester: User;
}

interface AuthResponse {
  user: User;
  token: string;
}

// --- Auth ---
export const register = (body: {
  username: string;
  email: string;
  password: string;
  displayName?: string;
}) => api.post<AuthResponse>("/auth/register", body).then((r) => r.data);

export const login = (body: { email: string; password: string }) =>
  api.post<AuthResponse>("/auth/login", body).then((r) => r.data);

export const fetchMe = () =>
  api.get<{ user: User }>("/auth/me").then((r) => r.data.user);

// --- Users & friends ---
export const searchUsers = (q: string) =>
  api.get<{ users: User[] }>("/users/search", { params: { q } }).then((r) => r.data.users);

export const sendFriendRequest = (addresseeId: string) =>
  api.post("/friends/request", { addresseeId }).then((r) => r.data);

export const fetchFriendRequests = () =>
  api.get<{ requests: FriendRequest[] }>("/friends/requests").then((r) => r.data.requests);

export const respondFriendRequest = (friendshipId: string, accept: boolean) =>
  api.post("/friends/respond", { friendshipId, accept }).then((r) => r.data);

export const fetchFriends = () =>
  api.get<{ friends: User[] }>("/friends").then((r) => r.data.friends);

// --- Posts ---
export const fetchFeed = () =>
  api.get<{ posts: Post[] }>("/posts/feed").then((r) => r.data.posts);

export function createPost(imageUri: string, caption: string) {
  const form = new FormData();
  const name = imageUri.split("/").pop() || "photo.jpg";
  // React Native FormData file shape.
  form.append("image", { uri: imageUri, name, type: "image/jpeg" } as any);
  if (caption) form.append("caption", caption);
  return api
    .post<{ post: Post }>("/posts", form, {
      headers: { "Content-Type": "multipart/form-data" },
    })
    .then((r) => r.data.post);
}
