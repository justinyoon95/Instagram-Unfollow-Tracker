import React, { useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  AlertCircle,
  ArrowDownAZ,
  CheckCircle2,
  Download,
  FileJson,
  Search,
  Upload,
  UserRound,
  UsersRound,
  X,
} from "lucide-react";
import "./styles.css";

const extractUsername = (entry) => {
  if (!entry) return "";

  if (typeof entry === "string") return entry.trim();

  if (Array.isArray(entry.string_list_data) && entry.string_list_data.length > 0) {
    const stringData = entry.string_list_data[0];
    const fromValue = stringData?.value?.trim();
    if (fromValue) return fromValue;

    const fromHref = usernameFromInstagramHref(stringData?.href);
    if (fromHref) return fromHref;
  }

  if (Array.isArray(entry.media_list_data) && entry.media_list_data.length > 0) {
    const mediaData = entry.media_list_data[0];
    const fromValue = mediaData?.value?.trim();
    if (fromValue) return fromValue;

    const fromHref = usernameFromInstagramHref(mediaData?.href);
    if (fromHref) return fromHref;
  }

  if (entry.value) return String(entry.value).trim();
  if (entry.username) return String(entry.username).trim();
  if (entry.title) return String(entry.title).trim();

  return "";
};

const usernameFromInstagramHref = (href) => {
  if (!href) return "";

  try {
    const url = new URL(href);
    const parts = url.pathname.split("/").filter(Boolean);
    const username = parts[0] === "_u" ? parts[1] : parts[0];
    return username?.trim() || "";
  } catch {
    return "";
  }
};

const normalizeUsername = (name) => name.trim().replace(/^@/, "").toLowerCase();

const collectUsernames = (data, preferredKeys = []) => {
  const found = [];

  const visitArray = (items) => {
    for (const item of items) {
      const username = extractUsername(item);
      if (username) found.push(username);
    }
  };

  if (Array.isArray(data)) {
    visitArray(data);
    return found;
  }

  for (const key of preferredKeys) {
    if (Array.isArray(data?.[key])) {
      visitArray(data[key]);
      return found;
    }
  }

  if (data && typeof data === "object") {
    for (const value of Object.values(data)) {
      if (Array.isArray(value)) visitArray(value);
    }
  }

  return found;
};

const parseInstagramFile = async (file, kind) => {
  const text = await file.text();
  const data = JSON.parse(text);
  const preferredKeys =
    kind === "following"
      ? ["relationships_following", "following"]
      : ["relationships_followers", "followers"];

  return collectUsernames(data, preferredKeys)
    .map((username) => username.replace(/^@/, "").trim())
    .filter(Boolean);
};

const uniqueSorted = (items) => {
  const map = new Map();

  for (const item of items) {
    const key = normalizeUsername(item);
    if (key && !map.has(key)) map.set(key, item.replace(/^@/, "").trim());
  }

  return [...map.values()].sort((a, b) => a.localeCompare(b));
};

const FileDrop = ({ title, description, file, count, error, onFile, icon: Icon }) => {
  const inputRef = useRef(null);

  return (
    <section className={`drop-zone ${error ? "has-error" : ""} ${file ? "has-file" : ""}`}>
      <div className="drop-icon">
        <Icon size={22} aria-hidden="true" />
      </div>
      <div className="drop-copy">
        <h2>{title}</h2>
        <p>{description}</p>
        {file && (
          <div className="file-pill">
            <CheckCircle2 size={16} aria-hidden="true" />
            <span>{file.name}</span>
            <strong>{count.toLocaleString()}</strong>
          </div>
        )}
        {error && (
          <div className="error-pill">
            <AlertCircle size={16} aria-hidden="true" />
            <span>{error}</span>
          </div>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="application/json,.json"
        onChange={(event) => onFile(event.target.files?.[0] || null)}
      />
      <button className="ghost-button" type="button" onClick={() => inputRef.current?.click()}>
        <Upload size={17} aria-hidden="true" />
        Choose JSON
      </button>
    </section>
  );
};

function App() {
  const [username, setUsername] = useState("");
  const [followingFile, setFollowingFile] = useState(null);
  const [followersFile, setFollowersFile] = useState(null);
  const [following, setFollowing] = useState([]);
  const [followers, setFollowers] = useState([]);
  const [errors, setErrors] = useState({});
  const [query, setQuery] = useState("");

  const handleFile = async (file, kind) => {
    if (kind === "following") {
      setFollowingFile(file);
      setFollowing([]);
    } else {
      setFollowersFile(file);
      setFollowers([]);
    }

    setErrors((current) => ({ ...current, [kind]: "" }));
    if (!file) return;

    try {
      const parsed = uniqueSorted(await parseInstagramFile(file, kind));
      if (parsed.length === 0) throw new Error("No usernames found in this file.");
      kind === "following" ? setFollowing(parsed) : setFollowers(parsed);
    } catch (error) {
      setErrors((current) => ({
        ...current,
        [kind]: error.message || "This file could not be parsed.",
      }));
    }
  };

  const notFollowingBack = useMemo(() => {
    const followerSet = new Set(followers.map(normalizeUsername));
    return following.filter((name) => !followerSet.has(normalizeUsername(name)));
  }, [followers, following]);

  const filteredResults = useMemo(() => {
    const normalizedQuery = normalizeUsername(query);
    if (!normalizedQuery) return notFollowingBack;
    return notFollowingBack.filter((name) => normalizeUsername(name).includes(normalizedQuery));
  }, [notFollowingBack, query]);

  const canAnalyze = following.length > 0 && followers.length > 0;
  const accountLabel = username.trim() || "your account";

  const downloadCsv = () => {
    const rows = ["username", ...notFollowingBack].join("\n");
    const blob = new Blob([rows], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${normalizeUsername(username) || "instagram"}-not-following-back.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  return (
    <main className="app-shell">
      <section className="hero">
        <div className="hero-copy">
          <div className="eyebrow">
            <UserRound size={16} aria-hidden="true" />
            Private Instagram export checker
          </div>
          <h1>Find who you follow that does not follow you back.</h1>
          <p>
            Enter your Instagram username, upload your exported following and followers JSON files,
            and this browser-only tool compares them instantly.
          </p>
        </div>

        <div className="account-panel">
          <label htmlFor="username">Instagram username</label>
          <div className="username-input">
            <span>@</span>
            <input
              id="username"
              type="text"
              value={username}
              placeholder="yourusername"
              onChange={(event) => setUsername(event.target.value)}
              autoComplete="off"
            />
            {username && (
              <button type="button" aria-label="Clear username" onClick={() => setUsername("")}>
                <X size={16} aria-hidden="true" />
              </button>
            )}
          </div>
        </div>
      </section>

      <section className="upload-grid">
        <FileDrop
          title="Following"
          description="Upload Instagram's following.json file."
          file={followingFile}
          count={following.length}
          error={errors.following}
          icon={UsersRound}
          onFile={(file) => handleFile(file, "following")}
        />
        <FileDrop
          title="Followers"
          description="Upload Instagram's followers_1.json file."
          file={followersFile}
          count={followers.length}
          error={errors.followers}
          icon={FileJson}
          onFile={(file) => handleFile(file, "followers")}
        />
      </section>

      <section className="results-panel">
        <div className="results-header">
          <div>
            <div className="eyebrow muted">
              <ArrowDownAZ size={16} aria-hidden="true" />
              Results for {accountLabel}
            </div>
            <h2>
              {canAnalyze
                ? `${notFollowingBack.length.toLocaleString()} non-mutual follow${
                    notFollowingBack.length === 1 ? "" : "s"
                  }`
                : "Upload both files to analyze"}
            </h2>
          </div>

          <button
            className="primary-button"
            type="button"
            disabled={!canAnalyze || notFollowingBack.length === 0}
            onClick={downloadCsv}
          >
            <Download size={17} aria-hidden="true" />
            Export CSV
          </button>
        </div>

        <div className="stats-row">
          <div>
            <span>Following</span>
            <strong>{following.length.toLocaleString()}</strong>
          </div>
          <div>
            <span>Followers</span>
            <strong>{followers.length.toLocaleString()}</strong>
          </div>
          <div>
            <span>Not following back</span>
            <strong>{canAnalyze ? notFollowingBack.length.toLocaleString() : "-"}</strong>
          </div>
        </div>

        <div className="search-row">
          <Search size={18} aria-hidden="true" />
          <input
            type="search"
            placeholder="Search usernames"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            disabled={!canAnalyze}
          />
        </div>

        <div className="results-list" aria-live="polite">
          {!canAnalyze && (
            <div className="empty-state">
              <Upload size={26} aria-hidden="true" />
              <p>Download your Instagram data as JSON, then upload the followers and following files here.</p>
            </div>
          )}

          {canAnalyze && filteredResults.length === 0 && (
            <div className="empty-state">
              <CheckCircle2 size={26} aria-hidden="true" />
              <p>No matching usernames found.</p>
            </div>
          )}

          {canAnalyze &&
            filteredResults.map((name) => (
              <a
                className="result-row"
                href={`https://www.instagram.com/${encodeURIComponent(name)}/`}
                target="_blank"
                rel="noreferrer"
                key={name}
              >
                <span>@{name}</span>
                <small>Open profile</small>
              </a>
            ))}
        </div>
      </section>
    </main>
  );
}

createRoot(document.getElementById("root")).render(<App />);
