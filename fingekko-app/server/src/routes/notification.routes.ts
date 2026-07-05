import { Request, Response, Router } from 'express';
import authMiddleware from '../middleware/auth.js';
import friendRepository from '../repositories/friendRepository.js';
import communityExpenseRepository from '../repositories/communityExpenseRepository.js';

const router = Router();

router.use(authMiddleware);

async function getCurrentUserId(req: any) {
  if (!req.user) {
    throw new Error("User not authenticated");
  }
  return req.user.id ?? req.user._id?.toString();
}

router.get('/', async (req: Request, res: Response) => {
  try {
    const currentUserId = await getCurrentUserId(req);

    // 1. Fetch incoming pending friend requests
    let friendships: any[] = [];
    try {
      friendships = await friendRepository.listForUser(currentUserId) || [];
    } catch (err) {
      console.error('Error loading friendships for notifications:', err);
    }

    const incomingRequests = friendships.filter(
      (f: any) =>
        f &&
        f.status === 'pending' &&
        (f.addressee?._id?.toString() || f.addressee?.toString()) === currentUserId
    );

    // 2. Fetch all expenses for this user
    let expenses: any[] = [];
    try {
      expenses = await communityExpenseRepository.listForUser(currentUserId) || [];
    } catch (err) {
      console.error('Error loading expenses for notifications:', err);
    }

    const unsettledSplits = expenses.filter((exp: any) => {
      if (!exp) return false;
      const creatorId = exp.createdBy?._id?.toString() || exp.createdBy?.toString() || '';
      if (creatorId !== currentUserId) {
        const userParticipant = exp.participants?.find(
          (p: any) => (p.userId?._id?.toString() || p.userId?.toString()) === currentUserId
        );
        return userParticipant && !userParticipant.settled;
      }
      return false;
    });

    // 3. Map into notification items
    const list: any[] = [];

    incomingRequests.forEach((reqFriend: any) => {
      try {
        const sender = reqFriend.requester;
        list.push({
          id: reqFriend._id.toString(),
          type: 'friend_request',
          title: 'Friend Request Received',
          subtitle: `${sender?.name || sender?.email || 'Someone'} sent you a friend request.`,
          dateLabel: 'Pending',
          rawData: {
            id: reqFriend._id.toString(),
            senderId: {
              id: sender?._id?.toString() || '',
              name: sender?.name || '',
              email: sender?.email || '',
            },
          },
        });
      } catch (err) {
        console.error('Error processing friend request item:', err);
      }
    });

    unsettledSplits.forEach((exp: any) => {
      try {
        const creator = exp.createdBy;
        const userParticipant = exp.participants?.find(
          (p: any) => (p.userId?._id?.toString() || p.userId?.toString()) === currentUserId
        );

        if (userParticipant) {
          const amt = typeof userParticipant.amount === 'number' ? userParticipant.amount : 0;
          list.push({
            id: exp._id.toString(),
            type: 'expense_split',
            title: `${creator?.name || 'A friend'} added a split`,
            subtitle: `Owe ₹${amt.toFixed(2)} for "${exp.description || ''}"`,
            dateLabel: exp.expenseDate
              ? new Date(exp.expenseDate).toLocaleDateString('en-IN', {
                  day: 'numeric',
                  month: 'short',
                })
              : 'Recent',
            rawData: {
              id: exp._id.toString(),
              groupId: exp.groupId?._id?.toString() || exp.groupId?.toString() || null,
              description: exp.description || '',
              amount: exp.amount || 0,
              participants: exp.participants?.map((p: any) => ({
                userId: {
                  name: p.userId?.name || '',
                },
                amount: p.amount || 0,
                settled: !!p.settled,
              })),
            },
          });
        }
      } catch (err) {
        console.error('Error processing expense item for notification:', err);
      }
    });

    return res.json({ notifications: list, count: list.length });
  } catch (error) {
    console.error('General error serving notifications:', error);
    return res.status(500).json({ message: 'Failed to fetch notifications' });
  }
});

export default router;
