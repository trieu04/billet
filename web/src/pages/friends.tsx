import { useCallback, useEffect, useState } from "react";
import {
  searchUsers,
  sendFriendRequest,
  fetchFriendRequests,
  respondFriendRequest,
  fetchFriends,
  type User,
  type FriendRequest,
} from "../api/endpoints";
import { apiErrorMessage } from "../api/client";
import { useAuth } from "../auth/auth-context";

export function FriendsPage() {
  const { user } = useAuth();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<User[]>([]);
  const [requests, setRequests] = useState<FriendRequest[]>([]);
  const [friends, setFriends] = useState<User[]>([]);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [r, f] = await Promise.all([fetchFriendRequests(), fetchFriends()]);
      setRequests(r);
      setFriends(f);
    } catch (e) {
      setNotice(apiErrorMessage(e));
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

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
      setNotice(`Friend request sent to ${u.displayName}`);
    } catch (e) {
      setNotice(apiErrorMessage(e));
    }
  };

  const respond = async (req: FriendRequest, accept: boolean) => {
    try {
      await respondFriendRequest(req.id, accept);
      load();
    } catch (e) {
      setNotice(apiErrorMessage(e));
    }
  };

  return (
    <div className="page">
      <p className="muted">Signed in as {user?.displayName}</p>
      {notice && <p className="muted">{notice}</p>}

      <h3 className="section">Find friends</h3>
      <input
        className="field"
        placeholder="Search by username"
        value={query}
        onChange={(e) => runSearch(e.target.value)}
      />
      {results.map((u) => (
        <div className="row" key={u.id}>
          <div className="grow">
            <div>{u.displayName}</div>
            <div className="sub">@{u.username}</div>
          </div>
          <button className="btn btn-small" onClick={() => addFriend(u)}>
            Add
          </button>
        </div>
      ))}

      {requests.length > 0 && <h3 className="section">Requests</h3>}
      {requests.map((req) => (
        <div className="row" key={req.id}>
          <div className="grow">
            <div>{req.requester.displayName}</div>
            <div className="sub">@{req.requester.username}</div>
          </div>
          <div className="row-actions">
            <button className="btn btn-small" onClick={() => respond(req, true)}>
              Accept
            </button>
            <button className="btn btn-secondary btn-small" onClick={() => respond(req, false)}>
              Decline
            </button>
          </div>
        </div>
      ))}

      <h3 className="section">Your friends ({friends.length})</h3>
      {friends.length === 0 ? (
        <p className="muted">No friends yet. Search above to add some.</p>
      ) : (
        friends.map((f) => (
          <div className="row" key={f.id}>
            <div className="grow">
              <div>{f.displayName}</div>
              <div className="sub">@{f.username}</div>
            </div>
          </div>
        ))
      )}
    </div>
  );
}
