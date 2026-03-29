import { useState } from "react";

const emptyRow = () => ({ name: "", github: "", leetcode: "" });

const COLUMNS = [
  { label: "Combined", key: "combinedScore" },
  { label: "LC Score", key: "lcScore"       },
  { label: "Solved",   key: "totalSolved"   },
  { label: "Easy",     key: "easy"          },
  { label: "Medium",   key: "medium"        },
  { label: "Hard",     key: "hard"          },
  { label: "GH Score", key: "ghScore"       },
  { label: "Stars",    key: "totalStars"    },
  { label: "Forks",    key: "totalForks"    },
  { label: "Repos",    key: "publicRepos"   },
  { label: "Followers",key: "followers"     },
];

function CombinedPage() {
  const [rows, setRows]       = useState([emptyRow()]);
  const [users, setUsers]     = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");
  const [sortKey, setSortKey] = useState("combinedScore");
  const [sortDir, setSortDir] = useState("desc");

  // ─── Row management ──────────────────────────────────────────────────────────

  const addRow = () => setRows((prev) => [...prev, emptyRow()]);

  const removeRow = (i) =>
    setRows((prev) => prev.length === 1 ? prev : prev.filter((_, idx) => idx !== i));

  const updateRow = (i, field, value) =>
    setRows((prev) => prev.map((row, idx) => idx === i ? { ...row, [field]: value } : row));

  // ─── Fetch ───────────────────────────────────────────────────────────────────

  const loadLeaderboard = async () => {
    const valid = rows.filter((r) => r.name.trim());
    if (valid.length === 0) { setError("Enter at least one name."); return; }
    const hasAnyPlatform = valid.some((r) => r.github.trim() || r.leetcode.trim());
    if (!hasAnyPlatform) { setError("Enter at least one GitHub or LeetCode username."); return; }

    setError("");
    try {
      setLoading(true);
      const res = await fetch("http://localhost:3000/api/compare/combined", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          users: valid.map((r) => ({
            name:     r.name.trim(),
            github:   r.github.trim(),
            leetcode: r.leetcode.trim(),
          })),
        }),
      });
      const result = await res.json();
      setUsers(result.userdata || []);
    } catch (err) {
      console.error(err);
      setError("Something went wrong. Is the server running?");
    } finally {
      setLoading(false);
    }
  };

  // ─── Sort logic ───────────────────────────────────────────────────────────────

  const handleSort = (key) => {
    if (sortKey === key) {
      setSortDir((prev) => (prev === "desc" ? "asc" : "desc"));
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  };

  const sorted = [...users].sort((a, b) => {
    const valA = a[sortKey] ?? 0;
    const valB = b[sortKey] ?? 0;
    return sortDir === "desc" ? valB - valA : valA - valB;
  });

  sorted.forEach((u, i) => (u.rank = i + 1));

  // ─── Helpers ──────────────────────────────────────────────────────────────────

  const getMedalClass = (rank) => {
    if (rank === 1) return "gold";
    if (rank === 2) return "silver";
    if (rank === 3) return "bronze";
    return "";
  };

  const getMedal = (rank) => {
    if (rank === 1) return "🥇";
    if (rank === 2) return "🥈";
    if (rank === 3) return "🥉";
    return `#${rank}`;
  };

  const val = (v) => (v !== null && v !== undefined ? v : "—");

  const arrow = (key) => {
    if (sortKey !== key) return <span style={{ opacity: 0.2 }}> ↕</span>;
    return <span> {sortDir === "desc" ? "↓" : "↑"}</span>;
  };

  const thStyle = { cursor: "pointer", userSelect: "none", whiteSpace: "nowrap" };

  // ─── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="app">
      <h1 className="title">🏆 Combined Leaderboard</h1>
      <p style={{ textAlign: "center", color: "#888", fontSize: "13px", marginBottom: "24px" }}>
        LeetCode 60% · GitHub 40% · Scores normalized across all users
      </p>

      {/* ── Input table ── */}
      <div style={{ overflowX: "auto", marginBottom: "16px" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              {["Name", "GitHub Username", "LeetCode Username", ""].map((h) => (
                <th key={h} style={{ padding: "8px 12px", textAlign: "left", color: "#888", fontSize: "12px", fontWeight: 600, borderBottom: "1px solid #2a2a3d" }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i}>
                {["name", "github", "leetcode"].map((field) => (
                  <td key={field} style={{ padding: "6px 8px" }}>
                    <input
                      className="input-box"
                      style={{ width: "100%", margin: 0 }}
                      placeholder={
                        field === "name"     ? "e.g. John" :
                        field === "github"   ? "e.g. john-doe" :
                                               "e.g. johndoe123"
                      }
                      value={row[field]}
                      onChange={(e) => updateRow(i, field, e.target.value)}
                    />
                  </td>
                ))}
                <td style={{ padding: "6px 8px", width: "40px" }}>
                  <button
                    onClick={() => removeRow(i)}
                    disabled={rows.length === 1}
                    style={{
                      background: "transparent",
                      backgroundColor: "red",
                      border: "1px solid #2a2a3d",
                      color: rows.length === 1 ? "#444" : "white",
                      borderRadius: "6px",
                      cursor: rows.length === 1 ? "not-allowed" : "pointer",
                      padding: "4px 10px",
                      fontSize: "16px",
                      lineHeight: 1,
                      marginLeft: 18
                    }}
                  >
                    ✕
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ── Buttons ── */}
      <div className="input-section" style={{ justifyContent: "flex-start", gap: "10px", marginBottom: "8px" }}>
        <button className="btn" onClick={addRow} style={{ background: "transparent", border: "1px solid #444", color: "#ccc" }}>
          + Add Person
        </button>
        <button className="btn" onClick={loadLeaderboard} disabled={loading}>
          {loading ? "Loading..." : "Compare"}
        </button>
      </div>

      {error && (
        <p style={{ color: "#f87171", fontSize: "13px", marginBottom: "16px", paddingLeft: "4px" }}>
          {error}
        </p>
      )}

      {/* ── Results table ── */}
      {users.length > 0 && (
        <div style={{ overflowX: "auto", marginTop: "32px" }}>
          <table className="leaderboard">
            <thead>
              <tr>
                <th>Rank</th>
                <th>Name</th>
                {COLUMNS.map(({ label, key }) => (
                  <th key={key} style={thStyle} onClick={() => handleSort(key)}>
                    {label}{arrow(key)}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {sorted.map((user) => (
                <tr key={user.name} className={getMedalClass(user.rank)}>
                  <td>{getMedal(user.rank)}</td>

                  <td className="user-cell">
                    <img
                      src={user.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}`}
                      alt="avatar"
                      className="avatar"
                    />
                    <div>
                      <div>{user.name}</div>
                      <div style={{ fontSize: "11px", color: "#666", marginTop: "2px", display: "flex", gap: "6px" }}>
                        {user.githubUsername && (
                          <a href={`https://github.com/${user.githubUsername}`} target="_blank" rel="noreferrer" style={{ color: "#888" }}>
                            GH ↗
                          </a>
                        )}
                        {user.leetcodeUsername && (
                          <a href={`https://leetcode.com/${user.leetcodeUsername}`} target="_blank" rel="noreferrer" style={{ color: "#888" }}>
                            LC ↗
                          </a>
                        )}
                      </div>
                      {user.missingLC && <span style={{ fontSize: "10px", color: "#f87171" }}>LC not found</span>}
                      {user.missingGH && <span style={{ fontSize: "10px", color: "#f87171", marginLeft: "4px" }}>GH not found</span>}
                      {user.noLC      && <span style={{ fontSize: "10px", color: "#888" }}>no LC provided</span>}
                      {user.noGH      && <span style={{ fontSize: "10px", color: "#888", marginLeft: "4px" }}>no GH provided</span>}
                    </div>
                  </td>

                  <td style={{ fontWeight: "bold" }}>{user.combinedScore}</td>
                  <td>{val(user.lcScore)}</td>
                  <td>{val(user.totalSolved)}</td>
                  <td>{val(user.easy)}</td>
                  <td>{val(user.medium)}</td>
                  <td>{val(user.hard)}</td>
                  <td>{val(user.ghScore)}</td>
                  <td>{val(user.totalStars)}</td>
                  <td>{val(user.totalForks)}</td>
                  <td>{val(user.publicRepos)}</td>
                  <td>{val(user.followers)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default CombinedPage;