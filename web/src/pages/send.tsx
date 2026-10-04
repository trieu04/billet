import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { createPost } from "../api/endpoints";
import { apiErrorMessage } from "../api/client";

export function SendPage() {
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [caption, setCaption] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onPick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] ?? null;
    setFile(f);
    setPreviewUrl(f ? URL.createObjectURL(f) : null);
  };

  const send = async () => {
    if (!file) return;
    setSending(true);
    setError(null);
    try {
      await createPost(file, caption.trim());
      navigate("/");
    } catch (e) {
      setError(apiErrorMessage(e));
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="page">
      <div className="preview" onClick={() => inputRef.current?.click()}>
        {previewUrl ? <img src={previewUrl} alt="preview" /> : <span className="muted">Click to choose a photo</span>}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        style={{ display: "none" }}
        onChange={onPick}
      />
      <input
        className="field"
        placeholder="Add a message (optional)"
        value={caption}
        onChange={(e) => setCaption(e.target.value)}
      />
      {error && <p className="error">{error}</p>}
      <button className="btn" onClick={send} disabled={!file || sending}>
        {sending ? "Sending…" : "Send to friends"}
      </button>
    </div>
  );
}
