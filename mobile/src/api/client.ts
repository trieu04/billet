import axios from "axios";
import { API_URL } from "../config";

// Shared axios instance. The auth token is held in-module and injected on every
// request; AuthProvider keeps it in sync with SecureStore.
export const api = axios.create({ baseURL: API_URL });

let authToken: string | null = null;

export function setAuthToken(token: string | null) {
  authToken = token;
}

api.interceptors.request.use((config) => {
  if (authToken) {
    config.headers.Authorization = `Bearer ${authToken}`;
  }
  return config;
});

// Normalise Axios errors into a readable message for the UI.
export function apiErrorMessage(err: unknown): string {
  if (axios.isAxiosError(err)) {
    return err.response?.data?.error ?? err.message ?? "Network error";
  }
  return "Something went wrong";
}
