import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../auth/auth-context";

// Shared shell: brand, tab nav, and sign-out for authenticated pages.
export function Layout() {
  const { signOut } = useAuth();
  return (
    <div className="app-shell">
      <header className="topbar">
        <span className="brand">Billet</span>
        <nav className="nav">
          <NavLink to="/" end>
            Feed
          </NavLink>
          <NavLink to="/send">Send</NavLink>
          <NavLink to="/friends">Friends</NavLink>
        </nav>
        <button className="sign-out" onClick={signOut}>
          Sign out
        </button>
      </header>
      <main>
        <Outlet />
      </main>
    </div>
  );
}
