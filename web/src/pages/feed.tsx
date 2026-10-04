import { useCallback, useEffect, useState } from "react";
import { fetchFeed, type Post } from "../api/endpoints";
import { apiErrorMessage } from "../api/client";

export function FeedPage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setPosts(await fetchFeed());
      setError(null);
    } catch (e) {
      setError(apiErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) return <div className="center muted">Loading feed…</div>;

  if (posts.length === 0) {
    return (
      <div className="center">
        <h2>No photos yet</h2>
        <p className="muted">
          {error ?? "Add friends and share your first photo from the Send tab."}
        </p>
        <button className="btn btn-small" onClick={load}>
          Refresh
        </button>
      </div>
    );
  }

  return (
    <div className="page">
      {posts.map((p) => (
        <article className="post" key={p.id}>
          <img src={p.imageUrl} alt={p.caption ?? "photo"} />
          <div className="author">{p.author.displayName}</div>
          {p.caption && <div>{p.caption}</div>}
          <div className="time">{new Date(p.createdAt).toLocaleString()}</div>
        </article>
      ))}
    </div>
  );
}
