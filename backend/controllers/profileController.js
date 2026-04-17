const { getDb } = require("../db");
const { computeLevelInfo } = require("../utils/levelSystem");

async function getProfileSummary(req, res) {
  const db = getDb();
  const userId = req.user.id;

  try {
    const habitsRes = await db.query(
      `SELECT COUNT(*) FROM habits WHERE user_id = $1`,
      [userId]
    );

    const completionsRes = await db.query(
      `
      SELECT COUNT(*)
      FROM habit_completions hc
      JOIN habits h ON h.id = hc.habit_id
      WHERE h.user_id = $1
      `,
      [userId]
    );

    const longestStreakRes = await db.query(
      `
      SELECT COALESCE(MAX(current_streak), 0) AS longest
      FROM habits
      WHERE user_id = $1
      `,
      [userId]
    );

    await db.query(
      `
      INSERT INTO user_reward_state (user_id)
      VALUES ($1)
      ON CONFLICT (user_id) DO NOTHING
      `,
      [userId]
    );

    const rewardRes = await db.query(
      `
      SELECT xp_total, freeze_tokens
      FROM user_reward_state
      WHERE user_id = $1
      `,
      [userId]
    );

    const xpTotal = Number(rewardRes.rows[0]?.xp_total ?? 0);
    const freezeTokens = Number(rewardRes.rows[0]?.freeze_tokens ?? 0);

    const lvl = computeLevelInfo(xpTotal);

    return res.json({
      totalHabits: Number(habitsRes.rows[0].count),
      totalCompletions: Number(completionsRes.rows[0].count),
      longestStreak: Number(longestStreakRes.rows[0].longest),

      xpTotal,
      freezeTokens,

      level: lvl.level,
      levelCurrentXp: lvl.currentXp,
      levelNextXp: lvl.nextLevelXp,
      levelProgress: lvl.progress,
    });
  } catch (err) {
    console.error("❌ PROFILE ERROR:", err);
    return res.status(500).json({ error: "Failed to load profile summary" });
  }
}

async function resetUserData(req, res) {
  const pool = getDb();
  const userId = req.user.id;

  try {
    await pool.query(
      `
      DELETE FROM habit_daily_completions
      USING habits
      WHERE habits.id = habit_daily_completions.habit_id
        AND habits.user_id = $1
      `,
      [userId]
    );

    await pool.query(
      `
      DELETE FROM checkpoints
      USING habits
      WHERE habits.id = checkpoints.habit_id
        AND habits.user_id = $1
      `,
      [userId]
    );

    await pool.query(`DELETE FROM habits WHERE user_id = $1`, [userId]);

    return res.json({ success: true });
  } catch (err) {
    console.error("❌ RESET DATA ERROR:", err);
    return res.status(500).json({ error: "Failed to reset data" });
  }
}

async function deleteAccount(req, res) {
  const pool = getDb();
  const userId = req.user.id;

  try {
    await pool.query(
      `
      DELETE FROM habit_daily_completions
      USING habits
      WHERE habits.id = habit_daily_completions.habit_id
        AND habits.user_id = $1
      `,
      [userId]
    );

    await pool.query(
      `
      DELETE FROM checkpoints
      USING habits
      WHERE habits.id = checkpoints.habit_id
        AND habits.user_id = $1
      `,
      [userId]
    );

    await pool.query(`DELETE FROM habits WHERE user_id = $1`, [userId]);
    await pool.query(`DELETE FROM users WHERE id = $1`, [userId]);

    return res.json({ success: true });
  } catch (err) {
    console.error("❌ DELETE ACCOUNT ERROR:", err);
    return res.status(500).json({ error: "Failed to delete account" });
  }
}

async function getProfileIdentity(req, res) {
  const db = getDb();
  const userId = req.user.id;

  try {
    const result = await db.query(
      `
      SELECT email, name, created_at, onboarding_completed, avatar_url
      FROM users
      WHERE id = $1
      `,
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    return res.json(result.rows[0]);
  } catch (err) {
    console.error("❌ PROFILE IDENTITY ERROR:", err);
    return res.status(500).json({ error: "Failed to load profile identity" });
  }
}

async function updateProfileIdentity(req, res) {
  const db = getDb();
  const userId = req.user.id;
  const { name } = req.body;

  if (!name || !name.trim()) {
    return res.status(400).json({ error: "Name is required" });
  }

  try {
    const result = await db.query(
      `
      UPDATE users 
      SET name = $1 
      WHERE id = $2 
      RETURNING name
      `,
      [name.trim(), userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    return res.json(result.rows[0]);
  } catch (err) {
    console.error("❌ UPDATE IDENTITY ERROR:", err);
    return res.status(500).json({ error: "Failed to update profile name" });
  }
}

async function updateProfileAvatar(req, res) {
  const db = getDb();
  const userId = req.user.id;

  try {
    if (!req.file) return res.status(400).json({ error: "Missing avatar file" });

    // Build public URL for uploaded avatar (used by Image source={uri}).
    const forwardedProto = req.headers["x-forwarded-proto"];
    const proto =
      (Array.isArray(forwardedProto) ? forwardedProto[0] : forwardedProto) ||
      (process.env.NODE_ENV === "production" ? "https" : "http");
    const host = req.get("host");

    const avatarUrl = `${proto}://${host}/uploads/avatars/${req.file.filename}`;

    await db.query(`UPDATE users SET avatar_url = $1 WHERE id = $2`, [avatarUrl, userId]);

    return res.json({ avatar_url: avatarUrl });
  } catch (err) {
    console.error("❌ UPDATE AVATAR ERROR:", err);
    return res.status(500).json({ error: "Failed to update avatar" });
  }
}
async function completeOnboarding(req, res) {
  const pool = getDb();
  const userId = req.user?.id;

  if (!userId) return res.status(401).json({ error: "unauthorized" });

  try {
    await pool.query(
      `
      UPDATE users
      SET onboarding_completed = true,
          onboarding_completed_at = NOW()
      WHERE id = $1
      `,
      [userId]
    );

    return res.json({ success: true });
  } catch (err) {
    console.error("completeOnboarding error:", err);
    return res.status(500).json({ error: "Server error" });
  }
}
module.exports = {
  getProfileSummary,
  resetUserData,
  deleteAccount,
  getProfileIdentity,
  updateProfileIdentity,
  updateProfileAvatar,
  completeOnboarding,
};