import CommunityExpense from '../models/CommunityExpense.js';

async function createExpense(expenseData: {
  createdBy: string;
  paidBy: string;
  description: string;
  amount: number;
  expenseDate: string;
  currency: string;
  notes: string;
  participants: { userId: string; amount: number; settled: boolean }[];
}) {
  return CommunityExpense.create(expenseData);
}

async function listForUser(userId: string) {
  return CommunityExpense.find({
    $or: [{ createdBy: userId }, { paidBy: userId }, { 'participants.userId': userId }],
  })
    .populate('createdBy', 'name email avatarKey')
    .populate('paidBy', 'name email avatarKey')
    .populate('participants.userId', 'name email avatarKey')
    .sort({ createdAt: -1 });
}

async function findById(expenseId: string) {
  return CommunityExpense.findById(expenseId)
    .populate('createdBy', 'name email avatarKey')
    .populate('paidBy', 'name email avatarKey')
    .populate('participants.userId', 'name email avatarKey');
}

async function updateExpense(
  expenseId: string,
  updateData: Partial<{
    description: string;
    amount: number;
    expenseDate: string;
    currency: string;
    notes: string;
    participants: { userId: string; amount: number; settled: boolean }[];
  }>
) {
  return CommunityExpense.findByIdAndUpdate(expenseId, updateData, { new: true })
    .populate('createdBy', 'name email avatarKey')
    .populate('paidBy', 'name email avatarKey')
    .populate('participants.userId', 'name email avatarKey');
}

async function deleteExpense(expenseId: string) {
  return CommunityExpense.findByIdAndDelete(expenseId);
}

export default {
  createExpense,
  deleteExpense,
  findById,
  listForUser,
  updateExpense,
};