import {mongoose} from '../db.js';

const goalSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true, index: true },
    title: { type: String, required: true, trim: true },
    targetAmount: { type: Number, required: true },
    currentAmount: { type: Number, default: 0 },
    deadline: { type: String, required: true },
    emoji: { type: String, default: 'goal' },
  },
  { timestamps: true }
);

export default mongoose.models.Goal || mongoose.model('Goal', goalSchema);
