import { mongoose } from '../db.js';

const userSchema = new mongoose.Schema(
  {
    clerkId: { type: String, unique: true, sparse: true },
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    monthlyIncome: { type: Number, default: 0 },
    // Day of month (1-31) the user is usually paid. Lets us anchor the
    // "current pay cycle" to the user's real payday instead of assuming
    // income lands on the 1st, since salaries often land mid-month.
    payday: { type: Number, default: null, min: 1, max: 31 },
    currency: { type: String, default: 'INR' },
    // Untracked cash the user has told us they hold (declared via the overspend
    // prompt). A persistent buffer that survives payday and is drawn down by any
    // cycle's overspend, so "remaining balance" reflects real money on hand
    // (AUDIT items 12/20). `cashInHandCycleStart` anchors the value to a pay
    // cycle so settlement can subtract elapsed cycles' overspend exactly once.
    cashInHand: { type: Number, default: 0, min: 0 },
    cashInHandCycleStart: { type: String, default: null },
    // Whether the user has completed the essentials/recurring-bills onboarding
    // form (AUDIT item 10). Completing it with zero bills is valid — the flag,
    // not the bill count, tells us to stop gating them into the form.
    essentialsOnboarded: { type: Boolean, default: false },
    level: { type: Number, default: 1 },
    xp: { type: Number, default: 0, min: 0 },
    points: { type: Number, default: 0 , min: 0},
    userGekko: { type: String, default: 'Planner Gekko' },
    avatarKey: { type: String, default: 'planner' },
    stats: {
      dayStreak: { type: Number, default: 0 },
      bestStreak: { type: Number, default: 0 },
      questsDone: { type: Number, default: 0 },
      questsTarget: { type: Number, default: 4 },
      betterThanYesterday: { type: Number, default: 0 },
      currentDate: { type: String, default: null },
      lastCompletedDate: { type: String, default: null },
      previousDayQuestsDone: { type: Number, default: 0 },
    },
    // Separate from `stats` above (which is exclusively the Home daily-quest
    // streak) — this tracks the Goals-page weekly contribution streak, a
    // distinct cadence/concept that shouldn't collide with quest fields.
    goalStats: {
      contributionStreak: { type: Number, default: 0 },
      bestContributionStreak: { type: Number, default: 0 },
      lastContributionPeriod: { type: String, default: null },
    },
    badges: {
      type: [
        new mongoose.Schema(
          {
            id: { type: String, required: true },
            earnedAt: { type: Date, default: Date.now },
          },
          { _id: false }
        ),
      ],
      default: [],
    },
  },
  { timestamps: true }
);

export default mongoose.models.User || mongoose.model('User', userSchema);
