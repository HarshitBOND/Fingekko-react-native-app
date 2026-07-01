import { mongoose } from '../db.js';

const transactionSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true, index: true },
    type: { type: String, enum: ['income', 'expense'], required: true },
    amount: { type: Number, required: true },
    category: { type: String, required: true },
    date: { type: String, required: true },
  },
  { timestamps: true }
);

export default mongoose.models.Transaction || mongoose.model('Transaction', transactionSchema);
