function extractJsonArray(text){
if (!text) return [];
const start = text.indexOf('[');
const end = text.lastIndexOf(']');
if (start === -1 || end === -1) return [];
const jsonText = text.slice(start, end+1);
try {
return JSON.parse(jsonText);
} catch (err){
let cleaned = jsonText.replace(/\'/g, '"');
cleaned = cleaned.replace(/,\s*\]/g, ']');
try { return JSON.parse(cleaned); } catch (err2) { return []; }
}
}


module.exports = { extractJsonArray };