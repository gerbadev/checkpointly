const { moderateText, decideModeration } = require("./moderation");

async function validateAdventureTitle(title, { isAdult }) {
  const t = String(title || "").trim();
  if (!t) return { ok: false, code: "missing_title", message: "Naziv je obavezan." };

  const m = await moderateText(t);
  const d = decideModeration(m, { isAdult });

  if (!d.allowed) {
    return { ok: false, code: "blocked", message: "Ne možemo prihvatiti ovaj naziv avanture." };
  }
  return { ok: true };
}

module.exports = { validateAdventureTitle };
