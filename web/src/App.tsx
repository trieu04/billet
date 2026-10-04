import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./auth/auth-context";
import { Layout } from "./components/layout";
import { LoginPage } from "./pages/login";
import { RegisterPage } from "./pages/register";
import { FeedPage } from "./pages/feed";
import { SendPage } from "./pages/send";
import { FriendsPage } from "./pages/friends";

export default function App() {
  const { user, loading } = useAuth();

  if (loading) {
    return <div className="center muted">Loading…</div>;
  }

  // Signed out: only the auth routes are reachable.
  if (!user) {
    return (
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  // Signed in: the app shell with tabbed pages.
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<FeedPage />} />
        <Route path="/send" element={<SendPage />} />
        <Route path="/friends" element={<FriendsPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
