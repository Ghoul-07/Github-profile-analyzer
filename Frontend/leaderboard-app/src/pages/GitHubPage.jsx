import { useState } from "react";
import "../App.css";

// columns that can be sorted and what key they map to in the user object
const COLUMNS = [
  { label: "Score",     key: "score"       },
  { label: "Followers", key: "followers"   },
  { label: "Repos",     key: "publicRepos" },
  { label: "Stars",     key: "totalStars"  },
];

function GitHubPage() {
  const [input, setInput]     = useState("");
  const [users, setUsers]     = useState([]);
  const [loading, setLoading] = useState(false);
  const [sortKey, setSortKey] = useState("score");
  const [sortDir, setSortDir] = useState("desc");

  const loadLeaderboard = async () => {
    try {
      if (!input) { alert("Enter usernames"); return; }

      const usernames = input.split(",").map((u) => u.trim()).filter((u) => u.length > 0);

      setLoading(true);
      const res = await fetch("http://localhost:3000/api/compare/github", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ usernames }),
      });

      const result = await res.json();
      setUsers(result.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // ─── Sort logic ───────────────────────────────────────────────────────────────

  const handleSort = (key) => {
    if (sortKey === key) {
      // same column clicked → flip direction
      setSortDir((prev) => (prev === "desc" ? "asc" : "desc"));
    } else {
      // new column → default to descending
      setSortKey(key);
      setSortDir("desc");
    }
  };

  const sorted = [...users].sort((a, b) => {
    const valA = a[sortKey] ?? 0;
    const valB = b[sortKey] ?? 0;
    return sortDir === "desc" ? valB - valA : valA - valB;
  });

  // re-assign ranks after sort so medals follow the sort
  sorted.forEach((user, i) => (user.rank = i + 1));

  // ─── Helpers ──────────────────────────────────────────────────────────────────

  const getClass = (rank) => {
    if (rank === 1) return "gold";
    if (rank === 2) return "silver";
    if (rank === 3) return "bronze";
    return "";
  };

  const arrow = (key) => {
    if (sortKey !== key) return <span style={{ opacity: 0.2 }}> ↕</span>;
    return <span> {sortDir === "desc" ? "↓" : "↑"}</span>;
  };

  const thStyle = { cursor: "pointer", userSelect: "none", whiteSpace: "nowrap" };

  // ─── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="app">
      <h1 className="title">🏆 GitHub Leaderboard</h1>

      <div className="input-section">
        <input
          className="input-box"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Enter usernames (comma separated)"
        />
        <button className="btn" onClick={loadLeaderboard} disabled={loading}>
          {loading ? "Loading..." : "Compare"}
        </button>
      </div>

      <table className="leaderboard">
        <thead>
          <tr>
            <th>Rank</th>
            <th>User</th>
            {COLUMNS.map(({ label, key }) => (
              <th key={key} style={thStyle} onClick={() => handleSort(key)}>
                {label}{arrow(key)}
              </th>
            ))}
          </tr>
        </thead>

        <tbody>
          {sorted.map((user) => (
            <tr key={user.username} className={getClass(user.rank)}>
              <td>
                {user.rank === 1 ? "🥇" :
                 user.rank === 2 ? "🥈" :
                 user.rank === 3 ? "🥉" :
                 `#${user.rank}`}
              </td>

              <td className="user-cell">
                <img
                  src={`https://github.com/${user.username}.png`}
                  alt="avatar"
                  className="avatar"
                />
                <a href={`https://github.com/${user.username}`} target="_blank" rel="noreferrer">
                  {user.username}
                </a>
              </td>

              <td>{user.score}</td>
              <td>{user.followers}</td>
              <td>{user.publicRepos}</td>
              <td>{user.totalStars}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default GitHubPage;