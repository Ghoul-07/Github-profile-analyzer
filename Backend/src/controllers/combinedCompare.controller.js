// combinedController.js

const axios = require("axios");

// ─── LeetCode GraphQL ─────────────────────────────────────────────────────────

const SOLVED_STATS_QUERY = `
  query userSolvedStats($username: String!) {
    matchedUser(username: $username) {
      profile {
        userAvatar
        ranking
      }
      submitStatsGlobal {
        acSubmissionNum {
          difficulty
          count
        }
      }
    }
  }
`;

async function fetchLeetCode(username) {
  try {
    const { data } = await axios.post(
      "https://leetcode.com/graphql",
      { query: SOLVED_STATS_QUERY, variables: { username } },
      {
        headers: {
          "Content-Type": "application/json",
          Referer: "https://leetcode.com",
          "User-Agent": "Mozilla/5.0 (compatible; profile-analyzer/1.0)",
        },
      }
    );

    if (data.errors || !data.data.matchedUser) return null;

    const { profile, submitStatsGlobal } = data.data.matchedUser;
    const subs = submitStatsGlobal.acSubmissionNum;

    const easy   = subs.find((s) => s.difficulty === "Easy")?.count   ?? 0;
    const medium = subs.find((s) => s.difficulty === "Medium")?.count ?? 0;
    const hard   = subs.find((s) => s.difficulty === "Hard")?.count   ?? 0;
    const total  = subs.find((s) => s.difficulty === "All")?.count    ?? 0;

    return {
      avatar:      profile.userAvatar || null,
      totalSolved: total,
      easy,
      medium,
      hard,
      rawScore:    easy * 1 + medium * 3 + hard * 5,
    };
  } catch {
    return null;
  }
}

// ─── GitHub ───────────────────────────────────────────────────────────────────

async function fetchGitHub(username) {
  try {
    const [{ data: ghUser }, { data: repos }] = await Promise.all([
      axios.get(`https://api.github.com/users/${username}`, {
        headers: { 
          Accept: "application/vnd.github+json",
          Authorization: `Bearer ${process.env.GITHUB_TOKEN}`
        },
      }),
      
      axios.get(`https://api.github.com/users/${username}/repos?per_page=100`, {
        headers: { 
          Accept: "application/vnd.github+json",
          Authorization: `Bearer ${process.env.GITHUB_TOKEN}`
        },
      }),
    ]);

    const totalStars = repos.reduce((sum, r) => sum + r.stargazers_count, 0);
    const totalForks = repos.reduce((sum, r) => sum + r.forks_count, 0);

    return {
      avatar:      ghUser.avatar_url || null,
      publicRepos: ghUser.public_repos || 0,
      followers:   ghUser.followers || 0,
      totalStars,
      totalForks,
      rawScore:    totalStars * 3 + totalForks * 2 + ghUser.public_repos + ghUser.followers * 2,
    };
  } catch {
    return null;
  }
}

// ─── Normalize 0–100 across group ────────────────────────────────────────────

function normalize(users, field) {
  const max = Math.max(...users.map((u) => u[field] ?? 0));
  if (max === 0) return;
  users.forEach((u) => {
    u[field] = u[field] != null ? (u[field] / max) * 100 : null;
  });
}

// ─── Controller ───────────────────────────────────────────────────────────────

const LEETCODE_WEIGHT = 0.6;
const GITHUB_WEIGHT   = 0.4;

async function combinedCompareController(req, res) {
  // Each entry: { name, github, leetcode }
  // github and leetcode are optional — empty string means not provided
  const { users } = req.body;

  if (!users || users.length === 0) {
    return res.status(400).json({ message: "Enter at least one person" });
  }

  try {
    const raw = await Promise.all(
      users.map(async ({ name, github, leetcode }) => {
        const [lcData, ghData] = await Promise.all([
          leetcode ? fetchLeetCode(leetcode) : null,
          github   ? fetchGitHub(github)     : null,
        ]);

        return {
          name,
          githubUsername:   github   || null,
          leetcodeUsername: leetcode || null,
          leetcode:         lcData,
          github:           ghData,
          lcRawScore:       lcData?.rawScore ?? null,
          ghRawScore:       ghData?.rawScore ?? null,
        };
      })
    );

    // Normalize both scores across all users
    normalize(raw, "lcRawScore");
    normalize(raw, "ghRawScore");

    const userdata = raw.map((u) => {
      const lcScore = u.lcRawScore ?? 0;
      const ghScore = u.ghRawScore ?? 0;

      const hasLC = u.leetcode !== null && u.leetcodeUsername !== null;
      const hasGH = u.github   !== null && u.githubUsername   !== null;

      let combinedScore;
      if (hasLC && hasGH) {
        combinedScore = lcScore * LEETCODE_WEIGHT + ghScore * GITHUB_WEIGHT;
      } else if (hasLC) {
        combinedScore = lcScore;
      } else if (hasGH) {
        combinedScore = ghScore;
      } else {
        combinedScore = 0;
      }

      return {
        name:             u.name,
        githubUsername:   u.githubUsername,
        leetcodeUsername: u.leetcodeUsername,
        avatar:           u.leetcode?.avatar || u.github?.avatar || null,
        // LeetCode
        totalSolved: u.leetcode?.totalSolved ?? null,
        easy:        u.leetcode?.easy        ?? null,
        medium:      u.leetcode?.medium      ?? null,
        hard:        u.leetcode?.hard        ?? null,
        lcScore:     Math.round(lcScore),
        // GitHub
        totalStars:  u.github?.totalStars  ?? null,
        totalForks:  u.github?.totalForks  ?? null,
        publicRepos: u.github?.publicRepos ?? null,
        followers:   u.github?.followers   ?? null,
        ghScore:     Math.round(ghScore),
        // Combined
        combinedScore: Math.round(combinedScore),
        missingLC: u.leetcodeUsername && !u.leetcode,  // provided but not found
        missingGH: u.githubUsername   && !u.github,    // provided but not found
        noLC:      !u.leetcodeUsername,                // not provided at all
        noGH:      !u.githubUsername,                  // not provided at all
      };
    });

    userdata.sort((a, b) => b.combinedScore - a.combinedScore);
    userdata.forEach((u, i) => (u.rank = i + 1));

    res.status(200).json({ userdata });
  } catch (err) {
    res.status(500).json({ message: "Couldn't fetch users" });
  }
}

module.exports = { combinedCompareController };