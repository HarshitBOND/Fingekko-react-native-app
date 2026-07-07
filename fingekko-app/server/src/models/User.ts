import { mongoose } from '../db.js';

const userSchema = new mongoose.Schema(
  {
    clerkId: { type: String, unique: true, sparse: true },
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    monthlyIncome: { type: Number, default: 0 },
    currency: { type: String, default: 'INR' },
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
  },
  { timestamps: true }
);

export default mongoose.models.User || mongoose.model('User', userSchema);
