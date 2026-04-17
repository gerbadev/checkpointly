console.log("[AI BOOT] hasKey:", Boolean(process.env.OPENAI_API_KEY), "model:", process.env.OPENAI_MODEL);

const { OpenAI } = require('openai');
const { extractJsonArray } = require('../utils/jsonParser');


const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini';
const habitMapCache = new Map();


async function generateHabitMap({ title, category, daily_minutes, experience_level, single_step, theme, difficulty_level, is_premium, user_performance }){
  const cacheKey = JSON.stringify({
    title,
    category,
    daily_minutes,
    experience_level,
    single_step,
    theme,
    difficulty_level,
    is_premium,
    user_performance
  });
 if (!single_step && habitMapCache.has(cacheKey)) {
    return habitMapCache.get(cacheKey);
  }

  const basePrompt = `
You are Checkpointly's AI Habit Mentor. Your task is to turn the user's goal into an adventure with structured, gamified checkpoints.
The primary language for the checkpoints and notes MUST be Croatian.

USER CONTEXT:
- Goal/Habit: "${title}"
- Theme: ${theme || 'mountain'} 
- Is Premium User: ${is_premium ? 'Yes' : 'No'}
- Current Difficulty Level (1-10): ${difficulty_level || 5}
- User Performance Profile: ${user_performance || 'average - proceeding normally'}

RULES FOR ADAPTIVE DIFFICULTY:
- If difficulty is High (8-10) or user is 'accelerating', generate challenging, multi-step checkpoints.
- If difficulty is Low (1-3) or user is 'struggling', break down tasks into extremely simple, 2-minute actionable steps to rebuild motivation.

RULES FOR THEMES & PREMIUM:
- Embed the aesthetic of the chosen theme in the titles and notes. Use analogies related to the theme.
- If Is Premium User is Yes, use advanced metaphors natively tied to the theme and provide deeper, highly personalized advice in the 'notes'. If No, keep notes generic but encouraging.
- Do NOT include emojis. Do NOT include numbering. Output ONLY valid JSON array with keys "title" and "notes" and "expected_duration_minutes".
`;

  const prompt = single_step
  ? basePrompt + `
Create ONE replacement habit checkpoint.
Rules:
- Return an array with EXACTLY ONE object containing "title", "notes", and "expected_duration_minutes".
- Do NOT repeat earlier or generic steps
- Do NOT use the same name as the original habit checkpoint
`
  : basePrompt + `
Create a structured habit roadmap.
User details:
- Experience level: ${experience_level || 'beginner'}
- Daily time available: ${daily_minutes || 10} minutes

Rules:
- Return an array of 6–10 checkpoints
- Each checkpoint MUST be an object with "title", "notes", and "expected_duration_minutes" (Int).
`;




const response = await client.chat.completions.create({
model: MODEL,
messages: [
{ role: 'system', content: 'You are Checkpointly assistant. Output JSON array only.' },
{ role: 'user', content: prompt }
],
max_tokens: 800,
temperature: 0.7,
});


const raw = response.choices?.[0]?.message?.content || '';
const arr = extractJsonArray(raw);
if (!single_step) {
  habitMapCache.set(cacheKey, arr);
  setTimeout(() => habitMapCache.delete(cacheKey), 10 * 60 * 1000);
}

return arr;

}
module.exports = {
  generateHabitMap,
};
