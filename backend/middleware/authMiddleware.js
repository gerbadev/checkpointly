const jwt = require('jsonwebtoken');
const { getDb } = require('../db');

let presenceTableEnsured = false;

async function ensurePresenceTable(pool) {
  if (presenceTableEnsured) return;
  await pool.query(`
    CREATE TABLE IF NOT EXISTS public.user_presence (
      user_id UUID PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
      last_seen_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
    )
  `);
  presenceTableEnsured = true;
}

async function touchUserPresence(userId) {
  const pool = getDb();
  await ensurePresenceTable(pool);
  await pool.query(
    `
      INSERT INTO public.user_presence (user_id, last_seen_at)
      VALUES ($1, NOW())
      ON CONFLICT (user_id)
      DO UPDATE SET last_seen_at = NOW()
    `,
    [userId]
  );
}

function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization || '';
  if (!authHeader) return res.status(401).json({ error: 'Missing auth token' });

  const [scheme, token] = authHeader.split(' ');
  if (scheme !== 'Bearer' || !token) return res.status(401).json({ error: 'Malformed auth header' });

  try {
    const secret = process.env.JWT_SECRET || 'dev_secret';
    const payload = jwt.verify(token, secret);
    req.user = { id: payload.id, email: payload.email };
    // Update "last seen" on every authenticated request.
    // This powers messenger-like "active now" indicators.
    touchUserPresence(req.user.id)
      .catch((e) => {
        // Do not block the request on presence failures.
        console.warn('touchUserPresence failed:', e?.message || e);
      })
      .finally(() => next());
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

module.exports = authMiddleware;
