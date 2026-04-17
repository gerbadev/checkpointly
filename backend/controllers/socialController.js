const { getDb } = require('../db');
const { v4: uuidv4 } = require('uuid');

async function ensureHabitShareInvitationsTable(pool) {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS public.habit_share_invitations (
      id UUID PRIMARY KEY,
      from_user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
      to_user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
      habit_id UUID NOT NULL REFERENCES public.habits(id) ON DELETE CASCADE,
      status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined')),
      created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
      copied_habit_id UUID
    );
  `);
}

async function ensureFriendshipAccepted(pool, fromUserId, toUserId) {
  const { rows } = await pool.query(
    `
      SELECT id
      FROM friendships
      WHERE status = 'accepted'
        AND ((user_id_1 = $1 AND user_id_2 = $2) OR (user_id_1 = $2 AND user_id_2 = $1))
    `,
    [fromUserId, toUserId]
  );
  if (!rows.length) return false;
  return true;
}

async function copyHabitForUser(pool, { habitId, fromUserId, toUserId }) {
  // Verify habit ownership.
  const habitRes = await pool.query(
    `
      SELECT id, title, description, category, theme, difficulty_level
      FROM habits
      WHERE id = $1 AND user_id = $2
    `,
    [habitId, fromUserId]
  );
  if (!habitRes.rows.length) {
    throw new Error('Avantura nije dostupna za dijeljenje.');
  }

  const original = habitRes.rows[0];
  const newHabitId = uuidv4();

  await pool.query(
    `
      INSERT INTO habits (
        id, user_id, title, description, category, theme, difficulty_level,
        status,
        current_streak, longest_streak, last_completed_date,
        current_checkpoint_index, last_activity_date, streak_at_risk
      )
      VALUES (
        $1, $2, $3, $4, $5, $6, $7,
        'active',
        0, 0, NULL,
        0, NULL, false
      )
    `,
    [
      newHabitId,
      toUserId,
      original.title,
      original.description,
      original.category,
      original.theme,
      original.difficulty_level,
    ]
  );

  const cpRes = await pool.query(
    `
      SELECT title, notes, position, generation_source
      FROM checkpoints
      WHERE habit_id = $1
      ORDER BY position
    `,
    [habitId]
  );

  for (const cp of cpRes.rows) {
    await pool.query(
      `
        INSERT INTO checkpoints (
          id, habit_id, title, notes, position,
          completed, completed_at, skipped, generation_source
        )
        VALUES ($1, $2, $3, $4, $5, false, NULL, false, COALESCE($6, 'custom'))
      `,
      [uuidv4(), newHabitId, cp.title, cp.notes, cp.position, cp.generation_source]
    );
  }

  return newHabitId;
}

exports.sendFriendRequest = async (req, res) => {
  try {
    const friendEmail = req.body.email;
    const userId = req.user.id; // from auth middleware

    const pool = getDb();
    
    // Find the friend by email
    const friendRes = await pool.query('SELECT id FROM users WHERE email = $1', [friendEmail]);
    if (friendRes.rows.length === 0) {
      return res.status(404).json({ error: 'Korisnik s tom email adresom nije pronađen.' });
    }
    const friendId = friendRes.rows[0].id;

    if (userId === friendId) {
      return res.status(400).json({ error: 'Ne možete dodati sami sebe.' });
    }

    // Check if request already exists
    const existingReq = await pool.query(
      'SELECT id, status FROM friendships WHERE (user_id_1 = $1 AND user_id_2 = $2) OR (user_id_1 = $2 AND user_id_2 = $1)',
      [userId, friendId]
    );

    if (existingReq.rows.length > 0) {
      return res.status(400).json({ error: 'Zahtjev za prijateljstvo već postoji.' });
    }

    await pool.query(
      'INSERT INTO friendships (user_id_1, user_id_2, status) VALUES ($1, $2, $3)',
      [userId, friendId, 'pending']
    );

    res.status(201).json({ message: 'Zahtjev za prijateljstvo poslan.' });
  } catch (error) {
    console.error('Greška pri slanju zahtjeva:', error);
    res.status(500).json({ error: 'Došlo je do greške na poslužitelju.' });
  }
};

exports.acceptFriendRequest = async (req, res) => {
  try {
    const friendshipId = req.params.id;
    const userId = req.user.id;
    const pool = getDb();

    // Verify friendship request is directed to user
    const checkRes = await pool.query(
      'SELECT id FROM friendships WHERE id = $1 AND user_id_2 = $2 AND status = $3',
      [friendshipId, userId, 'pending']
    );

    if (checkRes.rows.length === 0) {
      return res.status(404).json({ error: 'Zahtjev nije pronađen ili niste ovlašteni prihvatiti ga.' });
    }

    await pool.query(
      'UPDATE friendships SET status = $1 WHERE id = $2',
      ['accepted', friendshipId]
    );

    res.json({ message: 'Prijateljstvo prihvaćeno.' });
  } catch (error) {
    console.error('Greška pri prihvaćanju:', error);
    res.status(500).json({ error: 'Došlo je do greške.' });
  }
};

exports.getFriends = async (req, res) => {
  try {
    const userId = req.user.id;
    const pool = getDb();

    const result = await pool.query(`
      SELECT f.id as friendship_id, f.status, 
             f.user_id_1 as requester_id,
             CASE WHEN f.user_id_1 = $1 THEN f.user_id_2 ELSE f.user_id_1 END as friend_id,
             u.email, u.name, u.avatar_url,
             r.xp_total, r.freeze_tokens,
             DATE(up.last_seen_at) AS last_active_date,
             CASE
               WHEN up.last_seen_at >= NOW() - INTERVAL '3 minutes' THEN true
               ELSE false
             END AS is_active_now
      FROM friendships f
      JOIN users u ON (f.user_id_1 = u.id OR f.user_id_2 = u.id) AND u.id != $1
      LEFT JOIN user_reward_state r ON r.user_id = u.id
      LEFT JOIN user_presence up ON up.user_id = u.id
      WHERE (f.user_id_1 = $1 OR f.user_id_2 = $1)
    `, [userId]);

    res.json(result.rows);
  } catch (error) {
    console.error('Greška u getFriends:', error);
    res.status(500).json({ error: 'Greška pri dohvaćanju prijatelja.' });
  }
};

exports.getLeaderboard = async (req, res) => {
  try {
    const userId = req.user.id;
    const pool = getDb();

    // Prikaz globalne ljestvice (top 20 po xp_total)
    const result = await pool.query(`
      SELECT u.id, u.name, u.email, u.avatar_url, r.xp_total,
             DATE(up.last_seen_at) AS last_active_date,
             CASE
               WHEN up.last_seen_at >= NOW() - INTERVAL '3 minutes' THEN true
               ELSE false
             END AS is_active_now
      FROM user_reward_state r
      JOIN users u ON u.id = r.user_id
      LEFT JOIN user_presence up ON up.user_id = u.id
      ORDER BY r.xp_total DESC
      LIMIT 20
    `);

    res.json(result.rows);
  } catch (error) {
    console.error('Greška u getLeaderboard:', error);
    res.status(500).json({ error: 'Ljestvica nije dostupna.' });
  }
};

exports.getPublicProfile = async (req, res) => {
  try {
    const targetUserId = req.params.id;
    const pool = getDb();

    // Basic user info + XP
    const userRes = await pool.query(`
      SELECT u.id, u.name, u.email, u.avatar_url,
             COALESCE(r.xp_total, 0) AS xp_total,
             COALESCE(r.freeze_tokens, 0) AS freeze_tokens
      FROM users u
      LEFT JOIN user_reward_state r ON r.user_id = u.id
      WHERE u.id = $1
    `, [targetUserId]);

    if (userRes.rows.length === 0) {
      return res.status(404).json({ error: 'Korisnik nije pronađen.' });
    }

    const user = userRes.rows[0];

    // Habit stats
    const habitRes = await pool.query(`
      SELECT COUNT(*) AS total_habits,
             COALESCE(MAX(current_streak), 0) AS longest_streak
      FROM habits
      WHERE user_id = $1
    `, [targetUserId]);

    // Completed checkpoints count
    const cpRes = await pool.query(`
      SELECT COUNT(*) AS total_checkpoints
      FROM checkpoints c
      JOIN habits h ON h.id = c.habit_id
      WHERE h.user_id = $1 AND c.completed = true
    `, [targetUserId]);

    // Achievements
    const achievRes = await pool.query(`
      SELECT a.title AS name, a.description, ua.unlocked_at
      FROM user_achievements ua
      JOIN achievements a ON a.id = ua.achievement_id
      WHERE ua.user_id = $1
      ORDER BY ua.unlocked_at DESC
    `, [targetUserId]);

    const xpTotal = Number(user.xp_total);
    const level = Math.floor(xpTotal / 100) + 1;
    const levelCurrentXp = xpTotal % 100;
    const levelProgress = levelCurrentXp / 100;

    // Activity powered by user_presence (updated on each authenticated request).
    const lastActiveRes = await pool.query(`
      SELECT
        DATE(up.last_seen_at) AS last_active_date,
        CASE
          WHEN up.last_seen_at >= NOW() - INTERVAL '3 minutes' THEN true
          ELSE false
        END AS is_active_now
      FROM user_presence up
      WHERE up.user_id = $1
    `, [targetUserId]);

    res.json({
      id: user.id,
      name: user.name,
      email: user.email,
      avatar_url: user.avatar_url,
      xp_total: xpTotal,
      freeze_tokens: Number(user.freeze_tokens),
      level,
      levelCurrentXp,
      levelNextXp: 100,
      levelProgress,
      totalHabits: Number(habitRes.rows[0].total_habits),
      longestStreak: Number(habitRes.rows[0].longest_streak),
      totalCheckpoints: Number(cpRes.rows[0].total_checkpoints),
      achievements: achievRes.rows,
      last_active_date: lastActiveRes.rows[0]?.last_active_date ?? null,
      is_active_now: Boolean(lastActiveRes.rows[0]?.is_active_now),
    });
  } catch (error) {
    console.error('Greška u getPublicProfile:', error);
    res.status(500).json({ error: 'Profil nije dostupan.' });
  }
};

exports.sendHabitShareInvitation = async (req, res) => {
  const pool = getDb();
  const fromUserId = req.user.id;
  try {
    await ensureHabitShareInvitationsTable(pool);

    const { habit_id, friend_id } = req.body || {};
    if (!habit_id || !friend_id) {
      return res.status(400).json({ error: 'Missing habit_id or friend_id' });
    }
    if (fromUserId === friend_id) {
      return res.status(400).json({ error: 'Ne možete dijeliti avanturu sebi.' });
    }

    const ownsHabitRes = await pool.query(
      `SELECT id FROM habits WHERE id = $1 AND user_id = $2`,
      [habit_id, fromUserId]
    );
    if (!ownsHabitRes.rows.length) {
      return res.status(404).json({ error: 'Avantura nije pronađena.' });
    }

    const isFriend = await ensureFriendshipAccepted(pool, fromUserId, friend_id);
    if (!isFriend) {
      return res.status(400).json({ error: 'Korisnik nije vaš prijatelj.' });
    }

    const existing = await pool.query(
      `
        SELECT id
        FROM habit_share_invitations
        WHERE from_user_id = $1
          AND to_user_id = $2
          AND habit_id = $3
          AND status = 'pending'
      `,
      [fromUserId, friend_id, habit_id]
    );

    if (existing.rows.length) {
      return res.status(400).json({ error: 'Poziv već postoji.' });
    }

    const inviteId = uuidv4();
    await pool.query(
      `
        INSERT INTO habit_share_invitations (id, from_user_id, to_user_id, habit_id, status)
        VALUES ($1, $2, $3, $4, 'pending')
      `,
      [inviteId, fromUserId, friend_id, habit_id]
    );

    return res.json({ invite_id: inviteId, message: 'Poziv poslan.' });
  } catch (error) {
    console.error('sendHabitShareInvitation error:', error);
    return res.status(500).json({ error: 'Greška pri dijeljenju avanture.' });
  }
};

exports.getIncomingHabitShareInvitations = async (req, res) => {
  const pool = getDb();
  const userId = req.user.id;
  try {
    await ensureHabitShareInvitationsTable(pool);

    const { rows } = await pool.query(
      `
        SELECT
          inv.id,
          inv.habit_id,
          inv.created_at,
          inv.status,
          h.title AS habit_title,
          u.name AS from_user_name,
          u.avatar_url AS from_user_avatar_url,
          DATE(up.last_seen_at) AS from_user_last_active_date,
          CASE
            WHEN up.last_seen_at >= NOW() - INTERVAL '3 minutes' THEN true
            ELSE false
          END AS from_user_is_active_now
        FROM habit_share_invitations inv
        JOIN habits h ON h.id = inv.habit_id
        JOIN users u ON u.id = inv.from_user_id
        LEFT JOIN user_presence up ON up.user_id = u.id
        WHERE inv.to_user_id = $1
          AND inv.status = 'pending'
        ORDER BY inv.created_at DESC
      `,
      [userId]
    );

    return res.json(rows);
  } catch (error) {
    console.error('getIncomingHabitShareInvitations error:', error);
    return res.status(500).json({ error: 'Greška pri učitavanju poziva.' });
  }
};

exports.acceptHabitShareInvitation = async (req, res) => {
  const pool = getDb();
  const userId = req.user.id;
  try {
    await ensureHabitShareInvitationsTable(pool);

    const inviteId = req.params.id;
    const inviteRes = await pool.query(
      `
        SELECT id, from_user_id, to_user_id, habit_id, status
        FROM habit_share_invitations
        WHERE id = $1
          AND to_user_id = $2
      `,
      [inviteId, userId]
    );

    if (!inviteRes.rows.length) {
      return res.status(404).json({ error: 'Poziv nije pronađen.' });
    }

    const invite = inviteRes.rows[0];
    if (invite.status !== 'pending') {
      return res.status(400).json({ error: 'Poziv nije u statusu pending.' });
    }

    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const newHabitId = await copyHabitForUser(client, {
        habitId: invite.habit_id,
        fromUserId: invite.from_user_id,
        toUserId: invite.to_user_id,
      });

      await client.query(
        `
          UPDATE habit_share_invitations
          SET status = 'accepted', copied_habit_id = $2
          WHERE id = $1
        `,
        [inviteId, newHabitId]
      );

      await client.query("COMMIT");
      return res.json({ message: "Avantura je kopirana.", habit_id: newHabitId });
    } catch (txErr) {
      try {
        await client.query("ROLLBACK");
      } catch {}
      throw txErr;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('acceptHabitShareInvitation error:', error);
    return res.status(500).json({ error: 'Greška pri prihvaćanju poziva.' });
  }
};

exports.declineHabitShareInvitation = async (req, res) => {
  const pool = getDb();
  const userId = req.user.id;
  try {
    await ensureHabitShareInvitationsTable(pool);

    const inviteId = req.params.id;

    const inviteRes = await pool.query(
      `
        SELECT id, status
        FROM habit_share_invitations
        WHERE id = $1
          AND to_user_id = $2
      `,
      [inviteId, userId]
    );

    if (!inviteRes.rows.length) {
      return res.status(404).json({ error: 'Poziv nije pronađen.' });
    }

    const invite = inviteRes.rows[0];
    if (invite.status !== 'pending') {
      return res.status(400).json({ error: 'Poziv nije u statusu pending.' });
    }

    await pool.query(
      `
        UPDATE habit_share_invitations
        SET status = 'declined'
        WHERE id = $1
      `,
      [inviteId]
    );

    return res.json({ message: 'Poziv odbijen.' });
  } catch (error) {
    console.error('declineHabitShareInvitation error:', error);
    return res.status(500).json({ error: 'Greška pri odbijanju poziva.' });
  }
};
