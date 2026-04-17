const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { getDb } = require('../db');
const { v4: uuidv4 } = require('uuid');
const { OAuth2Client } = require('google-auth-library');

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const SALT_ROUNDS = parseInt(process.env.SALT_ROUNDS || '10', 10);
const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret';

function parseISODateOnly(str) {
  if (typeof str !== "string") return null;
  const m = str.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return null;

  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);

  const dt = new Date(Date.UTC(y, mo - 1, d));
  if (
    dt.getUTCFullYear() !== y ||
    dt.getUTCMonth() !== mo - 1 ||
    dt.getUTCDate() !== d
  ) {
    return null;
  }
  return dt; 
}

function getAgeFromDobUTC(dobUtcDate) {
  const now = new Date();
  const y = now.getUTCFullYear();
  const m = now.getUTCMonth();
  const d = now.getUTCDate();

  const by = dobUtcDate.getUTCFullYear();
  const bm = dobUtcDate.getUTCMonth();
  const bd = dobUtcDate.getUTCDate();

  let age = y - by;
  if (m < bm || (m === bm && d < bd)) age--;
  return age;
}

function parseDob(dobStr) {
  if (typeof dobStr !== "string") return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dobStr)) return null;

  const [y, m, d] = dobStr.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== m - 1 || dt.getUTCDate() !== d) return null;

  return { y, m, d };
}

function computeIsAdult({ y, m, d }) {
  const now = new Date();
  const yy = now.getUTCFullYear();
  const mm = now.getUTCMonth() + 1;
  const dd = now.getUTCDate();

  let age = yy - y;
  if (mm < m || (mm === m && dd < d)) age -= 1;

  return age >= 18;
}

async function register(req, res) {
  const pool = getDb();
  const { email, password, date_of_birth, name } = req.body;

  if (!email || !password || !date_of_birth || !name) {
    return res.status(400).json({ error: "Email, password, korisničko ime i datum rođenja su obavezni" });
  }

  const dob = parseDob(date_of_birth);
  if (!dob) {
    return res.status(400).json({ error: "Neispravan format datuma rođenja (YYYY-MM-DD)" });
  }

  const isAdult = computeIsAdult(dob);

  try {
    const existing = await pool.query("SELECT id FROM users WHERE email = $1", [email]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: "User already exists" });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const userId = uuidv4();

    await pool.query(
      `
      INSERT INTO users (id, email, password_hash, date_of_birth, is_adult, onboarding_completed, onboarding_completed_at, name)
      VALUES ($1, $2, $3, $4::date, $5, false, null, $6)
      `,
      [userId, email, passwordHash, date_of_birth, isAdult, name]
    );

    const token = jwt.sign({ id: userId }, JWT_SECRET, { expiresIn: "7d" });
    return res.status(201).json({ token });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Server error" });
  }
}


async function oauthLogin(req, res) {
  const { provider, idToken } = req.body;
  const pool = getDb();

  if (provider !== 'google') {
    return res.status(400).json({ error: 'Unsupported provider' });
  }

  const audiences = [
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_WEB_CLIENT_ID,
    process.env.GOOGLE_IOS_CLIENT_ID,
    process.env.GOOGLE_ANDROID_CLIENT_ID,
    process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
    process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
    process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID,
  ].filter(Boolean);

  if (!audiences.length) {
    return res.status(500).json({ error: "Missing Google OAuth client id env (set GOOGLE_WEB_CLIENT_ID and/or GOOGLE_IOS_CLIENT_ID/GOOGLE_ANDROID_CLIENT_ID)" });
  }

  const ticket = await googleClient.verifyIdToken({
    idToken,
    audience: audiences,
  });

  const payload = ticket.getPayload();

  const {
    sub: providerUserId,
    email,
    name,
    picture,
  } = payload;

  const userRes = await pool.query(
    `
    SELECT * FROM users
    WHERE auth_provider = 'google'
      AND provider_user_id = $1
    `,
    [providerUserId]
  );

  let user;

  if (userRes.rows.length) {
    user = userRes.rows[0];
  } else {
    const placeholderPassword = uuidv4();
    const placeholderHash = await bcrypt.hash(placeholderPassword, SALT_ROUNDS);

    const insertRes = await pool.query(
      `
      INSERT INTO users (
        email,
        name,
        auth_provider,
        provider_user_id,
        avatar_url,
        password_hash
      )
      VALUES ($1, $2, 'google', $3, $4, $5)
      RETURNING *
      `,
      [email, name, providerUserId, picture, placeholderHash]
    );

    user = insertRes.rows[0];
  }

  const needsProfileSetup = !user.date_of_birth;

  const token = jwt.sign(
    { id: user.id },
    JWT_SECRET,
    { expiresIn: '30d' }
  );

  res.json({ token, needsProfileSetup });
}


async function login(req, res) {
  const { email, password } = req.body;
  const pool = getDb();

  try {
    const result = await pool.query(
      'SELECT * FROM users WHERE email = $1',
      [email]
    );

    if (result.rows.length === 0) {
      console.log('USER NOT FOUND');
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = result.rows[0];


    const match = await bcrypt.compare(password, user.password_hash);

    if (!match) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email },
      JWT_SECRET,
      { expiresIn: '30d' }
    );

    res.json({ token });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
}
async function me(req, res) {
  const pool = getDb();
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ error: "unauthorized" });

  try {
    const r = await pool.query(
      `
      SELECT
        id,
        email,
        name,
        auth_provider,
        avatar_url,
        date_of_birth,
        is_adult,
        COALESCE(onboarding_completed, false) AS onboarding_completed,
        onboarding_completed_at
      FROM users
      WHERE id = $1
      `,
      [userId]
    );

    if (!r.rows.length) return res.status(404).json({ error: "User not found" });

    const u = r.rows[0];
    const needsProfileSetup = !u.date_of_birth; 

    return res.json({
      user: {
        id: u.id,
        email: u.email,
        name: u.name,
        auth_provider: u.auth_provider,
        avatar_url: u.avatar_url,
        date_of_birth: u.date_of_birth,
        is_adult: u.is_adult,
        onboarding_completed: u.onboarding_completed,
        onboarding_completed_at: u.onboarding_completed_at,
      },
      needsProfileSetup,
    });
  } catch (err) {
    console.error("me error:", err);
    return res.status(500).json({ error: "Server error" });
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


module.exports = { register, login, oauthLogin, me, completeOnboarding };
