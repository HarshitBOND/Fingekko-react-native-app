// Keep in sync with server/src/repositories/userRepository.ts (XP_PER_LEVEL).
export const XP_PER_LEVEL = 500;

export type LevelProgress = {
  level: number;
  xpIntoLevel: number;
  xpForNextLevel: number;
  progress: number;
};

/** Works out level + progress-within-level from a raw total XP number. */
export function getLevelProgress(xp: number): LevelProgress {
  const safeXp = Math.max(0, xp);
  const level = Math.floor(safeXp / XP_PER_LEVEL) + 1;
  const xpIntoLevel = safeXp % XP_PER_LEVEL;
  return {
    level,
    xpIntoLevel,
    xpForNextLevel: XP_PER_LEVEL,
    progress: xpIntoLevel / XP_PER_LEVEL,
  };
}

// Keep in sync with server/src/routes/goal.routes.ts (MILESTONE_THRESHOLDS).
export const MILESTONE_LABELS: Record<number, string> = {
  0.25: '25%',
  0.5: '50%',
  0.75: '75%',
};
