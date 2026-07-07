import { mongoose } from '../db.js';

const xpEventSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true, index: true },
    // 'goal_created' | 'goal_contribution' | 'milestone' | 'goal_completed' | 'badge_unlocked'
    type: { type: String, required: true },
    amount: { type: Number, required: true },
    description: { type: String, required: true },
    goalId: { type: String, default: null },
    metadata: { type: mongoose.Schema.Types.Mixed, default: null },
  },
  { timestamps: true }
);

export default mongoose.models.XpEvent || mongoose.model('XpEvent', xpEventSchema);
