import User from "../models/User.js";

interface CreateUserData {
  clerkId?: string ;
  name: string;
  email: string;
}

type UpdateUserData = Partial<{
  clerkId: string;
  name: string;
  email: string;
  monthlyIncome: number;
  payday: number | null;
  currency: string;
}>

type UpdateUserClerkData = Partial<{
  clerkId: string;
  name: string;
  email: string;
}>

async function createUser(data: CreateUserData) {
  try {
    const created = await User.create({
      clerkId: data.clerkId,
      name: data.name,
      email: data.email,
      monthlyIncome: 0,
      currency: 'Rs. ',
      level: 1,
      xp: 0,
      points: 0,
      userGekko: "Planner Gekko",
      avatarKey: "planner",
      stats: {
        dayStreak: 0,
        questsDone: 0,
        questsTarget: 4,
        betterThanYesterday: 0,
      },
    });

    console.log("✅ USER SAVED TO MONGO:", created._id);

    return created.toObject();
  } catch (err: unknown) {
    console.error("❌ CREATE USER FAILED:", err instanceof Error ? err.message : "Unknown error");
    throw err;
  }
}

async function findByEmail(email: string) {
  const normalizedEmail = email.toLowerCase() ;
  return User.findOne({ email: normalizedEmail }).lean();
}

async function findByClerkId(clerkId: string): Promise<any | null> {
  if (!clerkId) {
    return null;
  }
  return User.findOne({ clerkId }).lean();
}

async function updateById(id: string, update: UpdateUserData) {
  return User.findByIdAndUpdate(id, update, { new: true }).lean();
}

type UpdateUserStatsData = Partial<{
  dayStreak: number;
  bestStreak: number;
  questsDone: number;
  questsTarget: number;
  betterThanYesterday: number;
  currentDate: string | null;
  lastCompletedDate: string | null;
  previousDayQuestsDone: number;
}>;

async function updateUserStats(userId: string, stats: UpdateUserStatsData) {
  const $set = Object.fromEntries(
    Object.entries(stats).map(([key, value]) => [`stats.${key}`, value])
  );
  return User.findByIdAndUpdate(userId, { $set }, { new: true }).lean();
}

async function updateByclerkId(
  clerkId: string,
  update: UpdateUserClerkData
) {
  return User.findOneAndUpdate({ clerkId }, update, { new: true }).lean();
}

// Keep in sync with utils/gamification.ts on the frontend (XP_PER_LEVEL).
const XP_PER_LEVEL = 500;

type AwardXpResult = {
  xp: number;
  level: number;
  leveledUp: boolean;
  xpDelta: number;
};

async function awardXp(userId: string, xpDelta: number): Promise<AwardXpResult> {
  if (!xpDelta) {
    const current = await User.findById(userId).select('xp level').lean<{ xp: number; level: number } | null>();
    return { xp: current?.xp ?? 0, level: current?.level ?? 1, leveledUp: false, xpDelta: 0 };
  }

  const previous = await User.findById(userId).select('level').lean<{ level: number } | null>();
  const previousLevel = previous?.level ?? 1;

  const updated = await User.findByIdAndUpdate(
    userId,
    { $inc: { xp: xpDelta } },
    { new: true }
  ).select('xp level').lean<{ xp: number; level: number } | null>();

  if (!updated) {
    throw new Error('User not found');
  }

  const nextLevel = Math.floor(Math.max(0, updated.xp ?? 0) / XP_PER_LEVEL) + 1;
  const leveledUp = nextLevel > previousLevel;

  if (leveledUp) {
    await User.findByIdAndUpdate(userId, { level: nextLevel });
  }

  return {
    xp: updated.xp ?? 0,
    level: nextLevel,
    leveledUp,
    xpDelta,
  };
}


async function searchUsers(query: string) {
  return User.find({
    $or: [
      { name: { $regex: query, $options: "i" } },
      { email: { $regex: query, $options: "i" } },
    ],
  }).lean();
}

export {
  createUser,
  findByEmail,
  findByClerkId,
  updateByclerkId,
  updateById,
  updateUserStats,
  awardXp,
  searchUsers,
};