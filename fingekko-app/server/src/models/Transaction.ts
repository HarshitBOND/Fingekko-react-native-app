import { mongoose } from '../db.js';

const transactionSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true, index: true },
    type: { type: String, enum: ['income', 'expense'], required: true },
    amount: { type: Number, required: true },
    category: { type: String, required: true },
    date: { type: String, required: true },
    // True when this row mirrors the user's share of a shared expense. Splits
    // are already mirrored here so Home/Insights include them, which means the
    // personality engine must be able to tell them apart rather than counting
    // the community expense a second time. Defaults false, so existing rows
    // stay valid without a migration.
    isSplit: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export default mongoose.models.Transaction || mongoose.model('Transaction', transactionSchema);
