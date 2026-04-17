function normalize(s) {
  return String(s || "")
    .trim()
    .replace(/\s+/g, " ");
}

function hasLink(s) {
  return /(https?:\/\/|www\.)/i.test(s);
}

function isGibberish(s) {
  const cleaned = s.replace(/[^\p{L}\p{N} ]/gu, "").trim();
  if (cleaned.length < 3) return true;
  if (/^(.)\1{5,}$/u.test(s.replace(/\s+/g, ""))) return true;
  const letters = (s.match(/\p{L}/gu) || []).length;
  const total = s.length;
  if (total >= 8 && letters / total < 0.35) return true;

  return false;
}

function looksNsfw(s) {
  const t = s.toLowerCase();
  const nsfwWords = [
    
  ];

  return nsfwWords.some(w => t.includes(w));
}

function looksHateOrHarassment(s) {
  const t = s.toLowerCase();

  return false;
}

function validateAdventureTitle(title, { isAdult }) {
  const t = normalize(title);

  if (!t) {
    return { ok: false, code: "TITLE_REQUIRED", message: "Unesite naziv avanture." };
  }

  if (t.length < 3) {
    return { ok: false, code: "TITLE_TOO_SHORT", message: "Naziv je prekratak (min 3 znaka)." };
  }

  if (t.length > 80) {
    return { ok: false, code: "TITLE_TOO_LONG", message: "Naziv je predugačak (max 80 znakova)." };
  }

  if (hasLink(t)) {
    return { ok: false, code: "TITLE_LINK", message: "Naziv ne smije sadržavati linkove." };
  }

  if (isGibberish(t)) {
    return { ok: false, code: "TITLE_GIBBERISH", message: "Naziv izgleda nevažeće. Probajte jasniji opis." };
  }

  if (looksHateOrHarassment(t)) {
    return { ok: false, code: "TITLE_HATE", message: "Naziv krši pravila (govor mržnje / uznemiravanje)." };
  }

  if (looksNsfw(t) && !isAdult) {
    return { ok: false, code: "TITLE_NSFW_UNDERAGE", message: "18+ sadržaj nije dopušten na ovom računu." };
  }

  return { ok: true };
}

module.exports = { validateAdventureTitle };
