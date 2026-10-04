import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../auth/auth-context";
import { apiErrorMessage } from "../api/client";

export function LoginPage() {
  const { signIn } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await signIn(email.trim(), password);
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <form className="auth-wrap" onSubmit={onSubmit}>
      <h1 className="auth-title">Billet</h1>
      <p className="auth-sub">Photos with your people.</p>
      <input
        className="field"
        type="email"
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      <input
        className="field"
        type="password"
        placeholder="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      {error && <p className="error">{error}</p>}
      <button className="btn" type="submit" disabled={loading}>
        {loading ? "Logging in…" : "Log in"}
      </button>
      <p className="auth-sub">
        Need an account? <Link to="/register">Sign up</Link>
      </p>
    </form>
  );
}
