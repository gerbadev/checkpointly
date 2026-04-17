const { getDb } = require("../db");

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

const CHEST_LOOT = [
  { kind: "xp", label: "Malo XP", xp: 10, weight: 45 },
  { kind: "xp", label: "Standard", xp: 20, weight: 28 },
  { kind: "xp", label: "Lijep boost", xp: 30, weight: 16 },
  { kind: "xp", label: "Rijetko", xp: 50, weight: 8 },
  { kind: "xp", label: "Jako rijetko", xp: 100, weight: 2 },
  { kind: "freeze", label: "Ultra rijetko", freeze: 1, weight: 1 },
];

function pickWeighted(items) {
  const total = items.reduce((sum, it) => sum + (Number(it.weight) || 0), 0);
  let r = Math.random() * total;

  for (const it of items) {
    r -= Number(it.weight) || 0;
    if (r <= 0) return it;
  }
  return items[items.length - 1];
}

function buildLootInfo(items) {
  const xpItems = items.filter((x) => x.kind === "xp");
  const freezeItems = items.filter((x) => x.kind === "freeze");

  const totalW = items.reduce((s, x) => s + (Number(x.weight) || 0), 0) || 1;
  const freezeW = freezeItems.reduce((s, x) => s + (Number(x.weight) || 0), 0);

  const xpValues = xpItems.map((x) => Number(x.xp || 0)).filter((n) => n > 0);
  const minXp = xpValues.length ? Math.min(...xpValues) : 0;
  const maxXp = xpValues.length ? Math.max(...xpValues) : 0;

  return {
    minXp,
    maxXp,
    freezeChancePct: Math.round((freezeW / totalW) * 100),
  };
}

const CHEST_LOOT_INFO = buildLootInfo(CHEST_LOOT);


async function confirmStreakFreeze(req, res) {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ error: "unauthorized" });

  const db = getDb();
  const today = todayISO();
  const yesterday = yesterdayISO();

  const client = await db.connect();
  try {
    await client.query("begin");

    await client.query(
      `
      insert into user_reward_state (user_id)
      values ($1)
      on conflict (user_id) do nothing
      `,
      [userId]
    );

    const rewardRes = await client.query(
      `
      select
        freeze_tokens,
        to_char(streak_freeze_last_used::date, 'YYYY-MM-DD') as last_used,
        to_char(streak_freeze_last_confirmed::date, 'YYYY-MM-DD') as last_confirmed
      from user_reward_state
      where user_id = $1
      for update
      `,
      [userId]
    );

    const reward = rewardRes.rows[0] || {};
    const freezeTokens = Number(reward.freeze_tokens || 0);
    const lastUsed = reward.last_used || null;
    const lastConfirmed = reward.last_confirmed || null;

    if (lastConfirmed === today) {
      await client.query("commit");
      return res.json({
        ok: true,
        used: false,
        day: today,
        reason: "already_confirmed_today",
        freezeTokensRemaining: freezeTokens,
        savedHabitIds: [],
      });
    }

    if (freezeTokens <= 0) {
      await client.query("rollback");
      return res.status(409).json({ ok: false, reason: "no_tokens", day: today });
    }

    if (lastUsed === today) {
      await client.query("rollback");
      return res.status(409).json({ ok: false, reason: "already_used_today", day: today });
    }

    const missedRes = await client.query(
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

    const missed = missedRes.rows.map((r) => r.id);

    if (missed.length === 0) {
      await client.query(
        `
        update user_reward_state
        set streak_freeze_last_confirmed = $2::date
        where user_id = $1
        `,
        [userId, today]
      );

      await client.query("commit");
      return res.json({
        ok: true,
        used: false,
        day: today,
        reason: "nothing_to_save",
        freezeTokensRemaining: freezeTokens,
        savedHabitIds: [],
      });
    }

    const updReward = await client.query(
      `
      update user_reward_state
      set
        freeze_tokens = freeze_tokens - 1,
        streak_freeze_last_used = $2::date,
        streak_freeze_last_confirmed = $2::date
      where user_id = $1
      returning freeze_tokens
      `,
      [userId, today]
    );

    await client.query(
      `
      update habits
      set last_completed_date = $2::date
      where user_id = $1
        and id = any($3::uuid[])
      `,
      [userId, yesterday, missed]
    );

    await client.query("commit");

    return res.json({
      ok: true,
      used: true,
      day: today,
      reason: "saved",
      savedHabitIds: missed,
      freezeTokensRemaining: Number(updReward.rows[0].freeze_tokens),
    });
  } catch (e) {
    await client.query("rollback");
    console.error("confirmStreakFreeze error:", e);
    return res.status(500).json({ error: "internal_error" });
  } finally {
    client.release();
  }
}

async function getDailyChest(req, res) {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: "unauthorized" });

    const db = getDb();
    const today = todayISO();

    await db.query(
      `
      insert into user_reward_state (user_id)
      values ($1)
      on conflict (user_id) do nothing
      `,
      [userId]
    );

    const r = await db.query(
      `
      select
        xp_total,
        freeze_tokens,
        to_char(daily_chest_last_claimed::date, 'YYYY-MM-DD') as last_claimed,
        (daily_chest_last_claimed is null or daily_chest_last_claimed::date <> $2::date) as available
      from user_reward_state
      where user_id = $1
      `,
      [userId, today]
    );

    const row = r.rows[0];

    return res.json({
      available: !!row.available,
      today,
      lastClaimed: row.last_claimed || null,
      xpTotal: Number(row.xp_total || 0),
      freezeTokens: Number(row.freeze_tokens || 0),
      lootInfo: CHEST_LOOT_INFO,
    });
  } catch (e) {
    console.error("getDailyChest error:", e);
    return res.status(500).json({ error: "internal_error" });
  }
}

async function claimDailyChest(req, res) {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ error: "unauthorized" });

  const db = getDb();
  const today = todayISO();

  const client = await db.connect();
  try {
    await client.query("begin");

    await client.query(
      `
      insert into user_reward_state (user_id)
      values ($1)
      on conflict (user_id) do nothing
      `,
      [userId]
    );

    const existing = await client.query(
      `
      select daily_chest_last_claimed::date as last_claimed
      from user_reward_state
      where user_id = $1
      for update
      `,
      [userId]
    );

    const lastClaimed = existing.rows[0]?.last_claimed || null;

    const check = await client.query(
      `select ($1::date = $2::date) as same_day`,
      [lastClaimed, today]
    );

    if (check.rows[0]?.same_day) {
      await client.query("rollback");
      return res.status(409).json({ claimed: false, reason: "already_claimed", today });
    }

    const roll = pickWeighted(CHEST_LOOT);
    const xpGained = roll.kind === "xp" ? roll.xp : 0;
    const freezeGained = roll.kind === "freeze" ? roll.freeze : 0;

    const upd = await client.query(
      `
      update user_reward_state
      set
        xp_total = xp_total + $2,
        freeze_tokens = freeze_tokens + $3,
        daily_chest_last_claimed = $4::date
      where user_id = $1
      returning xp_total, freeze_tokens
      `,
      [userId, xpGained, freezeGained, today]
    );

    await client.query("commit");

    return res.json({
      claimed: true,
      today,
      rewardType: roll.kind, 
      rewardLabel: roll.label,
      xpGained,
      freezeGained,
      xpTotal: Number(upd.rows[0].xp_total || 0),
      freezeTokens: Number(upd.rows[0].freeze_tokens || 0),
    });
  } catch (e) {
    await client.query("rollback");
    console.error("claimDailyChest error:", e);
    return res.status(500).json({ error: "internal_error" });
  } finally {
    client.release();
  }
}

module.exports = { getDailyChest, claimDailyChest, confirmStreakFreeze };
