import mongoose from 'mongoose';

const participantSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    amount: {
      type: Number,
      required: true,
    },
    settled: {
      type: Boolean,
      default: false,
    },
  },
  { _id: false }
);

const communityExpenseSchema = new mongoose.Schema(
  {
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    paidBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    amount: {
      type: Number,
      required: true,
    },
    expenseDate: {
      type: String,
      required: true,
    },
    currency: {
      type: String,
      default: 'INR',
    },
    notes: {
      type: String,
      default: '',
    },
    participants: {
      type: [participantSchema],
      default: [],
    },
  },
  { timestamps: true }
);

const CommunityExpense =
  mongoose.models.CommunityExpense || mongoose.model('CommunityExpense', communityExpenseSchema);

export default CommunityExpense;