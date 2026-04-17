const { getDb } = require("../db");
const { computeLevelInfo } = require("../utils/levelSystem");

function todayISO() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function yesterdayISO() {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

async function getStreakFreezePreview(pool, userId, today, yesterday) {
  await pool.query(
    `
    insert into user_reward_state (user_id)
    values ($1)
    on conflict (user_id) do nothing
    `,
    [userId]
  );

  const rewardRes = await pool.query(
    `
    select
      freeze_tokens,
      to_char(streak_freeze_last_used::date, 'YYYY-MM-DD') as last_used,
      to_char(streak_freeze_last_confirmed::date, 'YYYY-MM-DD') as last_confirmed
    from user_reward_state
    where user_id = $1
    `,
    [userId]
  );

  const reward = rewardRes.rows[0] || {};
  const freezeTokens = Number(reward.freeze_tokens || 0);
  const lastUsed = reward.last_used || null;
  const lastConfirmed = reward.last_confirmed || null;
  const confirmed = lastConfirmed === today;

  const missedRes = await pool.query(
    `
    select id
    from habits
    where user_id = $1
      and current_streak > 0
      and last_completed_date is not null
      and last_completed_date::date < $2::date
    `,
    [userId, yesterday]
  );

  const missedHabitIds = missedRes.rows.map((r) => r.id);

  const base = {
    used: false,
    day: today,
    confirmed,
    missedHabitIds,
    freezeTokensRemaining: freezeTokens,
    lastUsed,
  };

  if (freezeTokens <= 0) return { ...base, canUse: false, reason: "no_tokens" };
  if (lastUsed === today) return { ...base, canUse: false, reason: "already_used_today" };
  if (missedHabitIds.length === 0)
    return { ...base, canUse: false, reason: "nothing_to_save", missedHabitIds: [] };

  return { ...base, canUse: true, reason: "can_save" };
}

async function getDashboardSummary(req, res) {
  const pool = getDb();
  const userId = req.user.id;

  const today = todayISO();
  const yesterday = yesterdayISO();

  try {
    const streakFreeze = await getStreakFreezePreview(pool, userId, today, yesterday);

    await pool.query(
      `
      insert into user_reward_state (user_id)
      values ($1)
      on conflict (user_id) do nothing
      `,
      [userId]
    );

    const rewardStateRes = await pool.query(
      `
      select xp_total, freeze_tokens
      from user_reward_state
      where user_id = $1
      `,
      [userId]
    );

    const xpTotal = Number(rewardStateRes.rows[0]?.xp_total ?? 0);
    const freezeTokens = Number(rewardStateRes.rows[0]?.freeze_tokens ?? 0);
    const levelInfo = computeLevelInfo(xpTotal);

    const totalHabitsRes = await pool.query(
      `select count(*) from habits where user_id = $1`,
      [userId]
    );

    const totalCompletionsRes = await pool.query(
      `
      select count(*)
      from habit_daily_completions hdc
      join habits h on h.id = hdc.habit_id
      where h.user_id = $1
      `,
      [userId]
    );

    const activeStreaksRes = await pool.query(
      `select count(*) from habits where user_id = $1 and current_streak > 0`,
      [userId]
    );

    const longestStreakRes = await pool.query(
      `select coalesce(max(current_streak), 0) as longest from habits where user_id = $1`,
      [userId]
    );

    const habitsAtRiskRes = await pool.query(
      `
      select id, title, current_streak
      from habits
      where user_id = $1
        and current_streak > 0
        and last_completed_date is not null
        and last_completed_date::date = $2::date
      `,
      [userId, yesterday]
    );

    return res.json({
      today,
      habitsAtRisk: habitsAtRiskRes.rows ?? [],
      totalHabits: Number(totalHabitsRes.rows[0].count),
      totalCompletions: Number(totalCompletionsRes.rows[0].count),
      activeStreaks: Number(activeStreaksRes.rows[0].count),
      longestStreak: Number(longestStreakRes.rows[0].longest),

      streakFreeze,

      xpTotal,
      freezeTokens,
      level: levelInfo.level,
      levelCurrentXp: levelInfo.currentXp,
      levelNextXp: levelInfo.nextLevelXp,
      levelProgress: levelInfo.progress,
    });
  } catch (err) {
    console.error("❌ DASHBOARD ERROR:", err);
    return res.status(500).json({ error: "Failed to load dashboard summary" });
  }
}

module.exports = { getDashboardSummary };
