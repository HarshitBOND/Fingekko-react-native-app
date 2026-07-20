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

const paidBySchema = new mongoose.Schema(
  {
    userId:{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    amount: {
      type: Number,
      required: true,
    }
  },
  { _id: false }
);

const historySchema = new mongoose.Schema(
  {
    action: {
      type: String,
      enum : ['UPDATED', 'DELETED', 'CREATED', 'SETTLED'] ,
      required: true,
    },
    performedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    // Human-readable context for the audit trail, e.g. "Amount ₹200 → ₹250".
    note: {
      type: String,
      default: '',
    },
    performedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);


const communityExpenseSchema = new mongoose.Schema(
  {
    groupId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Group',
      default: null,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    paidBy: {
      type: [paidBySchema],
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
      type: Date,
      default: Date.now,
    },
    currency: {
      type: String,
      default: 'INR',
    },
    notes: {
      type: String,
      default: '',
    },
    category: {
      type: String,
      default: '',
    },
    // Optional custom lucide icon name chosen for this expense.
    icon: {
      type: String,
      default: '',
    },
    participants: {
      type: [participantSchema],
      default: [],
    },
    history: {
      type: [historySchema],
      default: [],
    },
    isDeleted:{
      type: Boolean,
      default: false
    },
    deletedBy:{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    deletedAt:{
      type: Date,
    }
  },
  { timestamps: true }
);

// Soft-deleted expenses linger 30 days as a greyed record, then MongoDB removes
// them automatically. The TTL is keyed on deletedAt, which is only set when an
// expense is soft-deleted — live expenses have no deletedAt and never expire.
communityExpenseSchema.index(
  { deletedAt: 1 },
  { expireAfterSeconds: 30 * 24 * 60 * 60 }
);

const CommunityExpense =
  mongoose.models.CommunityExpense || mongoose.model('CommunityExpense', communityExpenseSchema);

export default CommunityExpense;