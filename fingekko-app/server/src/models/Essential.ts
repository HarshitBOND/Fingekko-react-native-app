import { mongoose } from '../db.js';

/**
 * A recurring essential / bill the user must pay every month (rent, groceries,
 * phone recharge, utilities, EMIs, subscriptions). AUDIT item 10.
 *
 * Paid-state is monthly and resets on its own: instead of a boolean we store the
 * calendar month the bill was last marked paid (`lastPaidMonth`, "YYYY-MM").
 * "Paid this month" is then simply `lastPaidMonth === <current month key>`, so a
 * new month automatically reads as unpaid with no reset job to run.
 */
const essentialSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true, index: true },
    name: { type: String, required: true, trim: true },
    amount: { type: Number, required: true, min: 0 },
    // Day of month the bill is due (1-31); clamped to real dates when displayed.
    dueDay: { type: Number, required: true, min: 1, max: 31 },
    // One of the onboarding categories: rent, groceries, phone, utilities, emi,
    // subscription, other. Free-form so we can add categories without a migration.
    category: { type: String, default: 'other', trim: true },
    // Calendar month ("YYYY-MM") this bill was last marked paid, or null.
    lastPaidMonth: { type: String, default: null },
  },
  { timestamps: true }
);

export default mongoose.models.Essential || mongoose.model('Essential', essentialSchema);
