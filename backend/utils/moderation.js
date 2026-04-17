const HF_API_KEY = process.env.HF_API_KEY;
const HF_MODERATION_MODEL =
  process.env.HF_MODERATION_MODEL || "unitary/unbiased-toxic-roberta";

function hfModelUrl(model) {
  return `https://router.huggingface.co/hf-inference/models/${encodeURIComponent(model)}`;
}

async function moderateText(text) {
  const input = String(text || "").trim();
  if (!input) return { ok: true, provider: "hf", labels: [] };

  if (!HF_API_KEY) {
    return { ok: true, provider: "hf", labels: [], skipped: "no_hf_key" };
  }

  const url = hfModelUrl(HF_MODERATION_MODEL);

  const resp = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${HF_API_KEY}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      inputs: input,
      options: { wait_for_model: true },
    }),
  });

  if (!resp.ok) {
    const txt = await resp.text().catch(() => "");
    console.error("HF moderation error:", resp.status, txt);

    return { ok: true, provider: "hf", labels: [], error: { status: resp.status, body: txt } };
  }

  const data = await resp.json();

  const list = Array.isArray(data) ? data : [];
  const labels = Array.isArray(list[0]) ? list[0] : list;

  return { ok: true, provider: "hf", labels };
}

function decideModeration(hfResult, { isAdult }) {
  const labels = hfResult?.labels || [];
  const scoreOf = (name) =>
    labels.find((x) => String(x.label).toLowerCase() === name)?.score ?? 0;

  const toxicity = Math.max(
    scoreOf("toxic"),
    scoreOf("toxicity"),
    scoreOf("severe_toxic"),
    scoreOf("insult"),
    scoreOf("threat"),
    scoreOf("identity_hate"),
    scoreOf("hate")
  );

  const sexual = Math.max(
    scoreOf("sexual_explicit"),
    scoreOf("sexual"),
    scoreOf("pornography")
  );

  if (toxicity >= 0.75) return { allowed: false, reason: "toxic_content" };
  if (!isAdult && sexual >= 0.8) return { allowed: false, reason: "sexual_content_minor" };

  return { allowed: true };
}

module.exports = { moderateText, decideModeration };
