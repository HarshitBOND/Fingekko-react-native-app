import CommunityExpense from '../models/CommunityExpense.js';

/////this function can be used to create A NEW EXPENSE in the group ...................
async function createExpense(expenseData: {
  groupId?: string;
  createdBy: string;
  paidBy: { userId: string; amount: number }[];
  description: string;
  amount: number;
  currency: string;
  notes: string;
  expenseDate?: string;
  participants: { userId: string; amount: number; settled: boolean }[];
  history: { action: string; performedBy: string }[];
}) {
  return CommunityExpense.create({
    ...expenseData,
    groupId: expenseData.groupId || null,
  });
}

/////this function can be use to list all the expense for a particular use from all the groups he is part of ...................
async function listForUser(userId: string, groupId?: string | null) {
  const filter: Record<string, unknown> = {
    isDeleted: { $ne: true },
    $or: [{ 'paidBy.userId': userId }, { 'participants.userId': userId }],
  };

  if (groupId === null) {
    filter.groupId = null;
  } else if (groupId) {
    filter.groupId = groupId;
  }

  return CommunityExpense.find(filter)
    .populate('groupId', 'name')
    .populate('paidBy.userId', 'name email')
    .populate('participants.userId', 'name email')
    .sort({ createdAt: -1 });
}

/////this function returns every non-deleted expense that belongs to a group, used for balance calculation ...................
async function listForGroup(groupId: string) {
  return CommunityExpense.find({ groupId, isDeleted: { $ne: true } });
}

/////this function can be used to open a perticular expense and see the details of it ...................
async function findById(expenseId: string) {
  return CommunityExpense.findById(expenseId)
    .populate('groupId', 'name')
    .populate('createdBy', 'name email')
    .populate('paidBy.userId', 'name email')
    .populate('participants.userId', 'name email');
}

///// this funcytion can be used to update a perticular expense and also add the history of the action performed ...................
async function updateExpense(
  expenseId: string,
  updateData: Partial<{
    description: string;
    amount: number;
    paidBy: { userId: string; amount: number }[];
    currency: string;
    notes: string;
    expenseDate: string;
    participants: { userId: string; amount: number; settled: boolean }[];
  }>,
  historyData?: { action: string; performedBy: string }
) {
  const update: Record<string, unknown> = { $set: updateData };
  if (historyData) {
    update.$push = { history: historyData };
  }

  return CommunityExpense.findByIdAndUpdate(expenseId, update, { new: true })
    .populate('groupId', 'name')
    .populate('createdBy', 'name email ')
    .populate('paidBy.userId', 'name email')
    .populate('participants.userId', 'name email ');
}

///////// this function can be used to solft delete a perticular expense .......................
async function SoftdeleteExpense(expenseId: string, userId: string, historyData: { action: 'DELETE'; performedBy: string }) {
  return CommunityExpense.findByIdAndUpdate(
    expenseId,
    {
      $set: {
        isDeleted: true,
        deletedAt: new Date(),
        deletedBy: userId
      },
      $push: { history: historyData },
    },
    { new: true }
  )
    .populate('createdBy', 'name email ')
    .populate('paidBy.userId', 'name email')
    .populate('participants.userId', 'name email ');
}


export default {
  createExpense,
  SoftdeleteExpense,
  findById,
  listForUser,
  listForGroup,
  updateExpense,
};