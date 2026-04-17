const { getDb } = require('../db');
const { get } = require('../routes/habits');
const { generateHabitMap } = require('../services/openaiService');
const { v4: uuidv4 } = require('uuid');
const { validateAdventureTitle } = require('../utils/validateAdventureTitle');
const { moderateText, decideModeration } = require("../utils/moderation");
const { computeLevelInfo } = require("../utils/levelSystem");


function getDateString(date = new Date()) {
  return date.toISOString().slice(0, 10);
}
function getTodayDateString() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString().slice(0, 10);
}
function isValidUUID(id) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);
}
function calculateStreakState(currentStreak, lastCompletedDate) {
  if (!currentStreak || !lastCompletedDate) {
    return { currentStreak: 0, streakAtRisk: false };
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);

  const last = new Date(lastCompletedDate);
  last.setHours(0, 0, 0, 0);

  if (last.getTime() === today.getTime()) {
    return { currentStreak, streakAtRisk: false };
  }

  if (last.getTime() === yesterday.getTime()) {
    return { currentStreak, streakAtRisk: true };
  }

  return { currentStreak: 0, streakAtRisk: false };
}

async function createHabit(req, res) {
  const pool = getDb();
  const userId = req.user?.id;

  if (!userId) return res.status(401).json({ error: "unauthorized" });

  const {
    title,
    category,
    description,
    daily_minutes,
    experience_level,
    theme,
  } = req.body || {};

  if (!title || !String(title).trim()) {
    return res.status(400).json({ error: "Missing title" });
  }

  const allowedThemes = new Set(["mountain", "space", "forest", "ocean", "desert"]);
  const safeTheme = allowedThemes.has(String(theme)) ? String(theme) : "mountain";

  try {
    const userRes = await pool.query(`select is_adult from users where id = $1`, [userId]);
    const isAdult = Boolean(userRes.rows?.[0]?.is_adult);

    if (typeof validateAdventureTitle === "function") {
      const check = await validateAdventureTitle(String(title), {
        isAdult,
        description: String(description || ""),
      });

      if (!check?.ok) {
        return res.status(400).json({
          error: check?.message || "Ne možemo prihvatiti ovaj naziv.",
          code: check?.code || "blocked",
        });
      }
    }

    const habitId = uuidv4();
    const difficulty_level = 5; // Default

    // Fetch premium status
    const subRes = await pool.query(`SELECT status, plan_tier FROM user_subscriptions WHERE user_id = $1`, [userId]);
    const is_premium = subRes.rows.length > 0 && subRes.rows[0].plan_tier === 'premium' && subRes.rows[0].status === 'active';

    await pool.query(
      `
      INSERT INTO habits (id, user_id, title, description, theme, difficulty_level)
      VALUES ($1, $2, $3, $4, $5, $6)
      `,
      [habitId, userId, String(title).trim(), description ? String(description) : null, safeTheme, difficulty_level]
    );
let checkpoints;
try {
  checkpoints = await generateHabitMap({
    title: String(title).trim(),
    category,
    daily_minutes,
    experience_level,
    theme: safeTheme,
    difficulty_level,
    is_premium,
    user_performance: 'average - new adventure'
  });
} catch (e) {
  console.error("generateHabitMap error:", e);
  return res.status(503).json({
    error: "AI trenutno nije dostupan. Pokušaj ponovno za minutu ili koristi Prilagođeno.",
    code: "ai_unavailable",
  });
}


    if (!Array.isArray(checkpoints) || checkpoints.length === 0) {
      return res.status(500).json({ error: "AI returned no checkpoints" });
    }

    const insertCP = `
      INSERT INTO checkpoints (
        id, habit_id, title, notes, position, completed, completed_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7)
    `;

    for (let i = 0; i < checkpoints.length; i++) {
      await pool.query(insertCP, [
        uuidv4(),
        habitId,
        checkpoints[i].title || `Step ${i + 1}`,
        checkpoints[i].notes || null,
        i,
        false,
        null,
      ]);
    }

    const { rows } = await pool.query(
      `
      SELECT * FROM checkpoints
      WHERE habit_id = $1
      ORDER BY position
      `,
      [habitId]
    );

    return res.json({
      habit: { id: habitId, title: String(title).trim(), theme: safeTheme },
      checkpoints: rows,
    });
  } catch (err) {
  console.error("createHabit error:", {
    message: err?.message,
    code: err?.code,
    detail: err?.detail,
    constraint: err?.constraint,
    table: err?.table,
    column: err?.column,
    stack: err?.stack,
  });
  return res.status(500).json({ error: "Server error" });
}

}

async function getHabits(req, res) {
  const pool = getDb();
  const userId = req.user.id;
  const { rows: dbInfo } = await pool.query(`
  SELECT
    current_database() AS db,
    inet_server_addr() AS host,
    inet_server_port() AS port
`);

  try {
    const includeArchived = req.query.includeArchived === 'true';

const habits = await pool.query(
  `
  SELECT *
  FROM habits
  WHERE user_id = $1
    ${includeArchived ? '' : "AND status != 'archived'"}
  ORDER BY created_at DESC
  `,
  [userId]
);


    const result = [];

    for (const habit of habits.rows) {
      const checkpoints = await pool.query(
        'SELECT * FROM checkpoints WHERE habit_id = $1 ORDER BY position',
        [habit.id]
      );

      const { currentStreak, streakAtRisk } = calculateStreakState(
      habit.current_streak,
      habit.last_completed_date
      );

      result.push({
      ...habit,
      current_streak: currentStreak,
      streakAtRisk,
      checkpoints: checkpoints.rows,
      });

    }

    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
  

}

async function completeCheckpoint(req, res) {
  const pool = getDb();
  const checkpointId = req.params.id;
  const userId = req.user?.id;

  const XP_PER_DAY_PER_HABIT = 20;

  if (!userId) return res.status(401).json({ error: "unauthorized" });

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    await client.query(
      `
      INSERT INTO user_reward_state (user_id)
      VALUES ($1)
      ON CONFLICT (user_id) DO NOTHING
      `,
      [userId]
    );

    const cpRes = await client.query(
      `
      UPDATE checkpoints
      SET completed = true,
          completed_at = COALESCE(completed_at, NOW())
      WHERE id = $1
      RETURNING habit_id
      `,
      [checkpointId]
    );

    if (!cpRes.rows.length) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "Checkpoint not found" });
    }

    const habitId = cpRes.rows[0].habit_id;

    const habitRes = await client.query(
      `
      SELECT id, status
      FROM habits
      WHERE id = $1 AND user_id = $2
      `,
      [habitId, userId]
    );

    if (!habitRes.rows.length) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "Habit not found" });
    }

    if (habitRes.rows[0].status !== "active") {
      await client.query("ROLLBACK");
      return res.status(400).json({ error: "Habit is not active" });
    }

    const todayDate = new Date();
    todayDate.setHours(0, 0, 0, 0);
    const yyyy = todayDate.getFullYear();
    const mm = String(todayDate.getMonth() + 1).padStart(2, "0");
    const dd = String(todayDate.getDate()).padStart(2, "0");
    const today = `${yyyy}-${mm}-${dd}`;

    const dailyInsert = await client.query(
      `
      INSERT INTO habit_daily_completions (id, habit_id, date)
      VALUES ($1, $2, $3::date)
      ON CONFLICT (habit_id, date) DO NOTHING
      `,
      [uuidv4(), habitId, today]
    );

    let xpGained = 0;
    let xpReason = "none";
    let xpTotal = 0;

    if (dailyInsert.rowCount === 1) {
      await client.query(
        `
        UPDATE habits
        SET
          current_streak = CASE
            WHEN last_completed_date::date = CURRENT_DATE - INTERVAL '1 day'
              THEN current_streak + 1
            ELSE 1
          END,
          last_completed_date = CURRENT_DATE
        WHERE id = $1
        `,
        [habitId]
      );

      const xpUpd = await client.query(
        `
        UPDATE user_reward_state
        SET xp_total = xp_total + $2
        WHERE user_id = $1
        RETURNING xp_total
        `,
        [userId, XP_PER_DAY_PER_HABIT]
      );

      xpGained = XP_PER_DAY_PER_HABIT;
      xpReason = "daily_award";
      xpTotal = Number(xpUpd.rows[0]?.xp_total ?? 0);
    } else {
      const currXp = await client.query(
        `SELECT xp_total FROM user_reward_state WHERE user_id = $1`,
        [userId]
      );
      xpGained = 0;
      xpReason = "already_awarded_today_for_habit";
      xpTotal = Number(currXp.rows[0]?.xp_total ?? 0);
    }

    const next = await client.query(
      `
      SELECT position
      FROM checkpoints
      WHERE habit_id = $1 AND completed = false
      ORDER BY position
      LIMIT 1
      `,
      [habitId]
    );

    const nextIndex = next.rows.length ? next.rows[0].position : null;

    let achievementUnlocked = null;

    // Check if completely finished
    if (next.rows.length === 0) {
      // Finished! Check for 'first_adventure' achievement
      const checkAchiev = await client.query(
        `SELECT id, xp_reward FROM achievements WHERE key_name = 'first_adventure'`
      );
      if (checkAchiev.rows.length > 0) {
        const achievId = checkAchiev.rows[0].id;
        const achievXp = checkAchiev.rows[0].xp_reward;
        
        const userAchiev = await client.query(
          `SELECT id FROM user_achievements WHERE user_id = $1 AND achievement_id = $2`,
          [userId, achievId]
        );
        if (userAchiev.rows.length === 0) {
          // Grant achievement
          await client.query(
            `INSERT INTO user_achievements (user_id, achievement_id) VALUES ($1, $2)`,
            [userId, achievId]
          );
          await client.query(
            `UPDATE user_reward_state SET xp_total = xp_total + $2 WHERE user_id = $1`,
            [userId, achievXp]
          );
          xpGained += achievXp;
          xpTotal += achievXp;
          achievementUnlocked = 'first_adventure';
          if (xpReason === 'none' || xpReason === 'already_awarded_today_for_habit') {
             xpReason = 'achievement_unlocked';
          } else {
             xpReason = 'daily_award_and_achievement';
          }
        }
      }
    }

    await client.query(
      `
      UPDATE habits
      SET current_checkpoint_index = $1
      WHERE id = $2
      `,
      [nextIndex, habitId]
    );

    await client.query("COMMIT");

    return res.json({
      success: true,
      today,
      awarded: dailyInsert.rowCount === 1,
      xpGained,
      xpReason,
      xpTotal,
      achievementUnlocked
    });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("completeCheckpoint error:", err);
    return res.status(500).json({ error: "Server error" });
  } finally {
    client.release();
  }
}

async function regenerateCheckpoints(req, res) {
  const pool = getDb();
  const userId = req.user.id;
  const habitId = req.params.id;

  try {
    const habitRes = await pool.query(
      `
      SELECT *
      FROM habits
      WHERE id = $1 AND user_id = $2
      `,
      [habitId, userId]
    );

    if (!habitRes.rows.length) {
      return res.status(404).json({ error: 'Habit not found' });
    }

    const habit = habitRes.rows[0];

    const newCheckpoints = await generateHabitMap({
      title: habit.title,
      category: habit.category,
      daily_minutes: habit.daily_minutes,
      experience_level: habit.experience_level,
    });

    if (!Array.isArray(newCheckpoints) || newCheckpoints.length === 0) {
      return res.status(500).json({ error: 'AI returned no checkpoints' });
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(
        `DELETE FROM checkpoints WHERE habit_id = $1`,
        [habitId]
      );
      for (let i = 0; i < newCheckpoints.length; i++) {
        await client.query(
          `
          INSERT INTO checkpoints (
            id,
            habit_id,
            title,
            notes,
            position,
            completed,
            skipped,
            completed_at
          )
          VALUES ($1, $2, $3, $4, $5, false, false, NULL)
          `,
          [
            uuidv4(),
            habitId,
            newCheckpoints[i].title || `Step ${i + 1}`,
            newCheckpoints[i].notes || null,
            i,
          ]
        );
      }

      await client.query(
        `
        UPDATE habits
        SET
          current_checkpoint_index = 0,
          current_streak = 0,
          last_completed_date = NULL
        WHERE id = $1
        `,
        [habitId]
      );

      await client.query('COMMIT');

      res.json({
        success: true,
        message: 'Habit progress fully reset and checkpoints regenerated',
      });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
}

async function regenerateCheckpoint(req, res) {
  const pool = getDb();
  const userId = req.user.id;
  const checkpointId = req.params.id;

  try {
    const cpRes = await pool.query(
      `
      SELECT c.id, c.habit_id, c.position, h.title
      FROM checkpoints c
      JOIN habits h ON h.id = c.habit_id
      WHERE c.id = $1 AND h.user_id = $2
      `,
      [checkpointId, userId]
    );

    if (!cpRes.rows.length) {
      return res.status(404).json({ error: 'Checkpoint not found' });
    }

    const { habit_id, position, title } = cpRes.rows[0];

    const regenerated = await generateHabitMap({
      title,
      single_step: true,
    });

    if (!Array.isArray(regenerated) || !regenerated[0]) {
      return res.status(500).json({ error: 'AI failed to regenerate checkpoint' });
    }

    await pool.query(
      `
      UPDATE checkpoints
      SET
      title = $1,
      notes = $2,
      completed = false,
      skipped = false,
      completed_at = NULL
      WHERE id = $3

      `,
      [regenerated[0].title, regenerated[0].notes || null, checkpointId]
    );

    res.json({
      success: true,
      message: 'Checkpoint regenerated',
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
}

async function getHabitCompletions(req, res) {
  const pool = getDb();
  const userId = req.user.id;
  const habitId = req.params.id;
  if (!isValidUUID(habitId)) {
    return res.status(400).json({ error: 'Invalid habit id' });
  }

  const check = await pool.query(
    `SELECT id FROM habits WHERE id = $1 AND user_id = $2`,
    [habitId, userId]
  );

  if (!check.rows.length) {
    return res.status(404).json({ error: 'Habit not found' });
  }

  const { rows } = await pool.query(
    `
    SELECT date
    FROM habit_daily_completions
    WHERE habit_id = $1
    ORDER BY date
    `,
    [habitId]
  );

  res.json(rows.map(r => r.date));
}

async function getHabitProgress(req, res) {
  const pool = getDb();
  const habitId = req.params.id;
  const userId = req.user.id;

  if (!isValidUUID(habitId)) {
    return res.status(400).json({ error: 'Invalid habit id' });
  }

  const habitRes = await pool.query(
    `
    SELECT
      current_checkpoint_index,
      current_streak,
      last_completed_date
    FROM habits
    WHERE id = $1 AND user_id = $2
    `,
    [habitId, userId]
  );

  if (!habitRes.rows.length) {
    return res.status(404).json({ error: 'Habit not found' });
  }

  const habit = habitRes.rows[0];

  const cps = await pool.query(
    `SELECT completed FROM checkpoints WHERE habit_id = $1`,
    [habitId]
  );

  const total = cps.rows.length;
  const completed = cps.rows.filter(c => c.completed).length;

  const percentage =
    total === 0 ? 0 : Math.round((completed / total) * 100);
  let currentStreak = habit.current_streak || 0;
  let streakAtRisk = false;

  if (currentStreak > 0 && habit.last_completed_date) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);

    const last = new Date(habit.last_completed_date);
    last.setHours(0, 0, 0, 0);

    if (last.getTime() === today.getTime()) {
      streakAtRisk = false;
    } else if (last.getTime() === yesterday.getTime()) {
      streakAtRisk = true;
    } else {
      currentStreak = 0;
      streakAtRisk = false;
    }
  } else {
    currentStreak = 0;
    streakAtRisk = false;
  }

  res.json({
    habitId,
    currentCheckpointIndex: habit.current_checkpoint_index,
    completed,
    total,
    percentage,
    currentStreak,
    streakAtRisk,
  });
}

async function getHabitProgressDetailed(req, res) {
  const pool = getDb();
  const userId = req.user.id;
  const habitId = req.params.id;

  try {
    const habitCheck = await pool.query(
      'SELECT id FROM habits WHERE id = $1 AND user_id = $2',
      [habitId, userId]
    );

    if (habitCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Habit not found' });
    }

    const cps = await pool.query(
      `
      SELECT completed
      FROM checkpoints
      WHERE habit_id = $1
      ORDER BY position
      `,
      [habitId]
    );

    const total = cps.rows.length;
    const completed = cps.rows.filter(c => c.completed).length;

    let status = 'not_started';
    if (completed > 0) status = 'in_progress';
    if (completed === total && total > 0) status = 'completed';

    const percentage = total === 0
      ? 0
      : Math.round((completed / total) * 100);

    res.json({
      habitId,
      totalCheckpoints: total,
      completedCheckpoints: completed,
      percentage,
      status
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
}

async function getHabit(req, res) {
  const pool = getDb();
  const userId = req.user.id;
  const habitId = req.params.id;

  try {
    const habitResult = await pool.query(
      'SELECT * FROM habits WHERE id = $1 AND user_id = $2',
      [habitId, userId]
    );

    if (habitResult.rows.length === 0) {
      return res.status(404).json({ error: 'Habit not found' });
    }

    const habit = habitResult.rows[0];

    const { currentStreak, streakAtRisk } = calculateStreakState(
      habit.current_streak,
      habit.last_completed_date
    );

    const checkpointsResult = await pool.query(
      'SELECT * FROM checkpoints WHERE habit_id = $1 ORDER BY position',
      [habitId]
    );

    res.json({
      habit: {
        ...habit,
        current_streak: currentStreak, 
        streakAtRisk,                 
      },
      checkpoints: checkpointsResult.rows
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
}

async function checkHabitFailure(req, res) {
  const pool = getDb();
  const habitId = req.params.id;
  const userId = req.user.id;

  try {
    const habitResult = await pool.query(
      `
      SELECT *
      FROM habits
      WHERE id = $1 AND user_id = $2
      `,
      [habitId, userId]
    );

    if (habitResult.rows.length === 0) {
      return res.status(404).json({ error: 'Habit not found' });
    }

    const habit = habitResult.rows[0];

    if (!Array.isArray(newCheckpoints) || newCheckpoints.length === 0) {
      return res.status(500).json({ error: 'AI failed to regenerate habit' });
    }

    await pool.query(
      `
      DELETE FROM checkpoints
      WHERE habit_id = $1 AND completed = false
      `,
      [habitId]
    );

    for (let i = 0; i < newCheckpoints.length; i++) {
      await pool.query(
        `
        INSERT INTO checkpoints (id, habit_id, title, position, completed)
        VALUES ($1, $2, $3, $4, false)
        `,
        [uuidv4(), habitId, newCheckpoints[i].title, i]
      );
    }

    await pool.query(
      `
      UPDATE habits
      SET current_streak = 0
      WHERE id = $1
      `,
      [habitId]
    );

    res.json({
      message: 'Habit adjusted to be easier after missed streak',
      newCheckpoints
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
}

async function deleteHabit(req, res) {
  const pool = getDb();
  const userId = req.user.id;
  const habitId = req.params.id;

  try {
    const check = await pool.query(
      'SELECT id FROM habits WHERE id = $1 AND user_id = $2',
      [habitId, userId]
    );

    if (check.rows.length === 0) {
      return res.status(404).json({ error: 'Habit not found' });
    }

    await pool.query(
      'DELETE FROM checkpoints WHERE habit_id = $1',
      [habitId]
    );

    await pool.query(
      'DELETE FROM habits WHERE id = $1',
      [habitId]
    );

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
}

async function deleteAllHabits(req, res) {
  const pool = getDb();
  const userId = req.user.id;
  try {
    const habitsRes = await pool.query(
      `SELECT id FROM habits WHERE user_id = $1`,
      [userId]
    );

    const habitIds = habitsRes.rows.map(h => h.id);

    if (habitIds.length === 0) {
      return res.json({ success: true, deleted: 0 });
    }

    await pool.query(
      `DELETE FROM habit_daily_completions WHERE habit_id = ANY($1)`,
      [habitIds]
    );

    await pool.query(
      `DELETE FROM checkpoints WHERE habit_id = ANY($1)`,
      [habitIds]
    );

    await pool.query(
      `DELETE FROM habits WHERE user_id = $1`,
      [userId]
    );

    res.json({
      success: true,
      deleted: habitIds.length,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete habits' });
  }
}

async function uncompleteCheckpoint(req, res) {
  const pool = getDb();
  const checkpointId = req.params.id;

  const cpRes = await pool.query(
    `SELECT habit_id, position FROM checkpoints WHERE id = $1`,
    [checkpointId]
  );

  if (!cpRes.rows.length) {
    return res.status(404).json({ error: 'Checkpoint not found' });
  }

  const { habit_id, position } = cpRes.rows[0];

  await pool.query(
    `UPDATE checkpoints
     SET completed = false, completed_at = NULL
     WHERE id = $1`,
    [checkpointId]
  );

  await pool.query(
    `UPDATE habits
     SET current_checkpoint_index = $1
     WHERE id = $2`,
    [position, habit_id]
  );

  res.json({ success: true });
}

async function skipCheckpoint(req, res) {
  const pool = getDb();
  const checkpointId = req.params.id;
const alreadySkipped = await pool.query(
  `SELECT skipped FROM checkpoints WHERE id = $1`,
  [checkpointId]
);

if (alreadySkipped.rows[0].skipped) {
  return res.json({ success: true, message: 'Already skipped' });
}
  const cp = await pool.query(
    `SELECT habit_id FROM checkpoints WHERE id = $1`,
    [checkpointId]
  );

  if (!cp.rows.length) {
    return res.status(404).json({ error: 'Checkpoint not found' });
  }

  const habitId = cp.rows[0].habit_id;

  await pool.query(
    `UPDATE checkpoints
     SET skipped = true
     WHERE id = $1`,
    [checkpointId]
  );

  let next = await pool.query(
    `SELECT position
     FROM checkpoints
     WHERE habit_id = $1
       AND completed = false
       AND skipped = false
     ORDER BY position
     LIMIT 1`,
    [habitId]
  );

  if (!next.rows.length) {
    next = await pool.query(
      `SELECT position
       FROM checkpoints
       WHERE habit_id = $1
         AND completed = false
         AND skipped = true
       ORDER BY position
       LIMIT 1`,
      [habitId]
    );
  }

  const nextIndex = next.rows.length ? next.rows[0].position : null;

  await pool.query(
    `UPDATE habits
     SET current_checkpoint_index = $1
     WHERE id = $2`,
    [nextIndex, habitId]
  );

  res.json({ success: true });
}

async function pauseHabit(req, res) {
  const pool = getDb();
  const userId = req.user.id;
  const habitId = req.params.id;

  if (!isValidUUID(habitId)) {
    return res.status(400).json({ error: 'Invalid habit id' });
  }

  const check = await pool.query(
    `SELECT id FROM habits WHERE id = $1 AND user_id = $2`,
    [habitId, userId]
  );

  if (!check.rows.length) {
    return res.status(404).json({ error: 'Habit not found' });
  }

  await pool.query(
    `
    UPDATE habits
    SET status = 'paused'
    WHERE id = $1
    `,
    [habitId]
  );

  res.json({ success: true });
}

async function resumeHabit(req, res) {
  const pool = getDb();
  const userId = req.user.id;
  const habitId = req.params.id;

  if (!isValidUUID(habitId)) {
    return res.status(400).json({ error: 'Invalid habit id' });
  }

  const check = await pool.query(
    `SELECT id FROM habits WHERE id = $1 AND user_id = $2`,
    [habitId, userId]
  );

  if (!check.rows.length) {
    return res.status(404).json({ error: 'Habit not found' });
  }

  await pool.query(
    `
    UPDATE habits
    SET status = 'active'
    WHERE id = $1
    `,
    [habitId]
  );

  res.json({ success: true });
}

async function archiveHabit(req, res) {
  const pool = getDb();
  const userId = req.user.id;
  const habitId = req.params.id;

  if (!isValidUUID(habitId)) {
    return res.status(400).json({ error: 'Invalid habit id' });
  }

  const check = await pool.query(
    `SELECT id FROM habits WHERE id = $1 AND user_id = $2`,
    [habitId, userId]
  );

  if (!check.rows.length) {
    return res.status(404).json({ error: 'Habit not found' });
  }

  await pool.query(
    `
    UPDATE habits
    SET status = 'archived'
    WHERE id = $1
    `,
    [habitId]
  );

  res.json({ success: true });
}

async function unarchiveHabit(req, res) {
  const pool = getDb();
  const userId = req.user.id;
  const habitId = req.params.id;

  await pool.query(
    `
    UPDATE habits
    SET status = 'active'
    WHERE id = $1 AND user_id = $2
    `,
    [habitId, userId]
  );

  res.json({ success: true });
}
async function updateCheckpoint(req, res) {
  const pool = getDb();
  const userId = req.user?.id;
  const checkpointId = req.params.id;

  if (!userId) return res.status(401).json({ error: "unauthorized" });
  if (!isValidUUID(checkpointId)) return res.status(400).json({ error: "Invalid checkpoint id" });

  const { title, notes } = req.body || {};
  const hasTitle = typeof title === "string";
  const hasNotes = typeof notes === "string" || notes === null;

  if (!hasTitle && !hasNotes) {
    return res.status(400).json({ error: "Nothing to update" });
  }

  try {
    const check = await pool.query(
  `
  SELECT c.id, c.habit_id, c.completed
  FROM checkpoints c
  JOIN habits h ON h.id = c.habit_id
  WHERE c.id = $1 AND h.user_id = $2
  `,
  [checkpointId, userId]
);

if (!check.rows.length) return res.status(404).json({ error: "Checkpoint not found" });

if (check.rows[0].completed) {
  return res.status(400).json({ error: "Cannot edit completed checkpoint" });
}

    const upd = await pool.query(
      `
      UPDATE checkpoints
      SET
        title = COALESCE($2, title),
        notes = COALESCE($3, notes)
      WHERE id = $1
      RETURNING id, habit_id, title, notes, position, completed, skipped, completed_at
      `,
      [
        checkpointId,
        hasTitle ? String(title).trim() : null,
        hasNotes ? (notes === null ? null : String(notes)) : null,
      ]
    );

    return res.json({ success: true, checkpoint: upd.rows[0] });
  } catch (err) {
    console.error("updateCheckpoint error:", err);
    return res.status(500).json({ error: "Server error" });
  }
}

async function addCheckpoint(req, res) {
  const pool = getDb();
  const userId = req.user?.id;
  const habitId = req.params.id;

  if (!userId) return res.status(401).json({ error: "unauthorized" });
  if (!isValidUUID(habitId)) return res.status(400).json({ error: "Invalid habit id" });

  const { title, notes } = req.body || {};
  if (!title || !String(title).trim()) {
    return res.status(400).json({ error: "Missing title" });
  }

  try {
    const habitCheck = await pool.query(
      `SELECT id FROM habits WHERE id = $1 AND user_id = $2`,
      [habitId, userId]
    );
    if (!habitCheck.rows.length) {
      return res.status(404).json({ error: "Habit not found" });
    }

    const maxPosRes = await pool.query(
      `SELECT COALESCE(MAX(position), -1) AS maxpos FROM checkpoints WHERE habit_id = $1`,
      [habitId]
    );
    const nextPos = Number(maxPosRes.rows?.[0]?.maxpos ?? -1) + 1;

    const id = uuidv4();
    const ins = await pool.query(
      `
      INSERT INTO checkpoints (
        id, habit_id, title, notes, position,
        completed, completed_at, skipped, generation_source
      )
      VALUES ($1, $2, $3, $4, $5, false, NULL, false, $6)
      RETURNING id, habit_id, title, notes, position, completed, skipped, completed_at
      `,
      [
        id,
        habitId,
        String(title).trim(),
        notes ? String(notes) : null,
        nextPos,
        "custom",
      ]
    );

    return res.json({ success: true, checkpoint: ins.rows[0] });
  } catch (err) {
    console.error("addCheckpoint error:", err);
    return res.status(500).json({ error: "Server error" });
  }
}

async function deleteCheckpointFuture(req, res) {
  const pool = getDb();
  const userId = req.user?.id;
  const checkpointId = req.params.id;

  if (!userId) return res.status(401).json({ error: "unauthorized" });
  if (!isValidUUID(checkpointId)) return res.status(400).json({ error: "Invalid checkpoint id" });

  try {
    const check = await pool.query(
      `
      SELECT c.id, c.habit_id, c.completed
      FROM checkpoints c
      JOIN habits h ON h.id = c.habit_id
      WHERE c.id = $1 AND h.user_id = $2
      `,
      [checkpointId, userId]
    );

    if (!check.rows.length) return res.status(404).json({ error: "Checkpoint not found" });
    if (check.rows[0].completed) {
      return res.status(400).json({ error: "Cannot delete completed checkpoint" });
    }

    await pool.query(`DELETE FROM checkpoints WHERE id = $1`, [checkpointId]);
    
const rows = await pool.query(
  `SELECT id FROM checkpoints WHERE habit_id = $1 ORDER BY position`,
  [check.rows[0].habit_id]
);

for (let i = 0; i < rows.rows.length; i++) {
  await pool.query(`UPDATE checkpoints SET position = $1 WHERE id = $2`, [
    i,
    rows.rows[i].id,
  ]);
}

    return res.json({ success: true });
  } catch (err) {
    console.error("deleteCheckpointFuture error:", err);
    return res.status(500).json({ error: "Server error" });
  }
}

async function reorderFutureCheckpoints(req, res) {
  const pool = getDb();
  const userId = req.user?.id;
  const habitId = req.params.id;

  if (!userId) return res.status(401).json({ error: "unauthorized" });
  if (!isValidUUID(habitId)) return res.status(400).json({ error: "Invalid habit id" });

  const orderedIds = Array.isArray(req.body?.orderedIds) ? req.body.orderedIds : null;
  if (!orderedIds || orderedIds.length < 2) {
    return res.status(400).json({ error: "orderedIds must be an array with at least 2 ids" });
  }

  const seen = new Set();
  for (const id of orderedIds) {
    if (!isValidUUID(id)) return res.status(400).json({ error: "Invalid checkpoint id in orderedIds" });
    if (seen.has(id)) return res.status(400).json({ error: "Duplicate checkpoint id in orderedIds" });
    seen.add(id);
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const habitCheck = await client.query(
      `SELECT id FROM habits WHERE id = $1 AND user_id = $2`,
      [habitId, userId]
    );
    if (!habitCheck.rows.length) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "Habit not found" });
    }

    const cps = await client.query(
      `
      SELECT id, position, completed
      FROM checkpoints
      WHERE habit_id = $1 AND id = ANY($2::uuid[])
      `,
      [habitId, orderedIds]
    );

    if (cps.rows.length !== orderedIds.length) {
      await client.query("ROLLBACK");
      return res.status(400).json({ error: "Some checkpoints are missing or not in this habit" });
    }

    if (cps.rows.some((c) => c.completed)) {
      await client.query("ROLLBACK");
      return res.status(400).json({ error: "Cannot reorder completed checkpoints" });
    }

    const minPos = Math.min(...cps.rows.map((c) => Number(c.position)));

    for (let i = 0; i < orderedIds.length; i++) {
      await client.query(
        `UPDATE checkpoints SET position = $1 WHERE id = $2 AND habit_id = $3`,
        [minPos + i, orderedIds[i], habitId]
      );
    }

    await client.query("COMMIT");
    return res.json({ success: true });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("reorderFutureCheckpoints error:", err);
    return res.status(500).json({ error: "Server error" });
  } finally {
    client.release();
  }
}


async function shareHabit(req, res) {
  const pool = getDb();
  const userId = req.user?.id;
  const habitId = req.params.id;
  const friendId = req.body.friendId;

  if (!userId) return res.status(401).json({ error: "unauthorized" });
  if (!isValidUUID(habitId) || !isValidUUID(friendId)) {
    return res.status(400).json({ error: "Invalid IDs" });
  }

  try {
    // Check if the habit belongs to the user
    const checkHabit = await pool.query(
      `SELECT id FROM habits WHERE id = $1 AND user_id = $2`,
      [habitId, userId]
    );

    if (checkHabit.rows.length === 0) {
      return res.status(404).json({ error: "Habit not found or not owned by you" });
    }

    // Check if they are friends
    const checkFriend = await pool.query(
      `SELECT id FROM friendships WHERE status = 'accepted' AND 
       ((user_id_1 = $1 AND user_id_2 = $2) OR (user_id_1 = $2 AND user_id_2 = $1))`,
      [userId, friendId]
    );

    if (checkFriend.rows.length === 0) {
      return res.status(400).json({ error: "Korisnik vam nije prijatelj" });
    }

    // Insert into shared_habits
    await pool.query(
      `INSERT INTO shared_habits (habit_id, user_id, role) VALUES ($1, $2, 'participant') ON CONFLICT DO NOTHING`,
      [habitId, friendId]
    );

    res.json({ message: "Avantura uspješno podijeljena!" });
  } catch (err) {
    console.error("Greška pri dijeljenju:", err);
    res.status(500).json({ error: "Došlo je do greške" });
  }
}

module.exports = {
  createHabit,
  getHabits,
  getHabit,
  completeCheckpoint,
  getHabitProgress,
  getHabitProgressDetailed,
  checkHabitFailure,
  deleteHabit,
  deleteAllHabits,
  uncompleteCheckpoint,
  skipCheckpoint,
  regenerateCheckpoints,
  regenerateCheckpoint,
  getHabitCompletions,
  pauseHabit,
  resumeHabit,
  archiveHabit,
  unarchiveHabit,
  updateCheckpoint,
  addCheckpoint,
  deleteCheckpointFuture,
  reorderFutureCheckpoints,
  shareHabit,
};


