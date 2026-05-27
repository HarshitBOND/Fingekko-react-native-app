const { mongoose } = require('../db');

const userSchema = new mongoose.Schema(
  {
    clerkId: { type: String, unique: true, sparse: true },
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String },
    monthlyIncome: { type: Number, default: 0 },
    currency: { type: String, default: 'Rs. ' },
    level: { type: Number, default: 1 },
    xp: { type: Number, default: 0 },
    points: { type: Number, default: 0 },
    userGekko: { type: String, default: 'Planner Gekko' },
    avatarKey: { type: String, default: 'planner' },
    stats: {
      dayStreak: { type: Number, default: 0 },
      questsDone: { type: Number, default: 0 },
      questsTarget: { type: Number, default: 4 },
      betterThanYesterday: { type: Number, default: 0 },
    },
  },
  { timestamps: true }
);

module.exports = mongoose.models.User || mongoose.model('User', userSchema);
