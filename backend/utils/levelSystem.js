const BASE_XP = 100;   
const XP_STEP = 50;     

function xpForLevel(level) {
  return BASE_XP + (level - 1) * XP_STEP;
}

function computeLevelInfo(totalXp) {
  let level = 1;
  let remainingXp = totalXp;

  while (true) {
    const needed = xpForLevel(level);

    if (remainingXp < needed) break;

    remainingXp -= needed;
    level++;
  }

  const nextLevelXp = xpForLevel(level);

  return {
    level,
    currentXp: remainingXp,
    nextLevelXp,
    progress: remainingXp / nextLevelXp,
  };
}

module.exports = {
  computeLevelInfo,
};
