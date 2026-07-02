import { Request, Response, Router } from 'express';
import authMiddleware from '../middleware/auth.js';
import friendRepository from '../repositories/friendRepository.js';
import { findByEmail } from '../repositories/userRepository.js';
import { getAuth } from '@clerk/express';
import {  findByClerkId} from '../repositories/userRepository.js';

const router = Router();

router.use(authMiddleware);


async function getCurrentUserId(req: Request) {
  const { userId } = getAuth(req);
  try{
    if (!userId) {
      throw new Error('User not authenticated');
    }
    const user= await findByClerkId(userId);
    if(!user){
      throw new Error('User not found');
    }
    return user._id.toString();
  } catch (error) {
    console.error(error);
    throw new Error('Failed to get current user ID');
  }
}

function serializeUser(user: any) {
  if (!user) {
    return null;
  }

  return {
    id: user._id?.toString?.() || user.id?.toString?.() || '',
    name: user.name,
    email: user.email,
    avatarKey: user.avatarKey,
  };
}

function serializeFriendship(friendship: any, currentUserId: string) {
  const requesterId = friendship.requester?._id?.toString?.() || friendship.requester?.toString?.();
  const isOutgoing = requesterId === currentUserId;
  const friend = isOutgoing ? friendship.addressee : friendship.requester;

  return {
    id: friendship._id.toString(),
    status: friendship.status,
    direction: friendship.status === 'accepted' ? 'accepted' : isOutgoing ? 'outgoing' : 'incoming',
    friend: serializeUser(friend),
    createdAt: friendship.createdAt?.toISOString?.() || new Date(friendship.createdAt).toISOString(),
    updatedAt: friendship.updatedAt?.toISOString?.() || new Date(friendship.updatedAt).toISOString(),
  };
}

router.get('/', async (req: Request, res: Response) => {
  try {
    const currentUserId = await getCurrentUserId(req);

    const friendships = await friendRepository.listForUser(currentUserId);
    const serialized = friendships.map((friendship) => serializeFriendship(friendship, currentUserId));

    return res.json({
      friends: serialized.filter((item) => item.status === 'accepted'),
      incomingRequests: serialized.filter((item) => item.status === 'pending' && item.direction === 'incoming'),
      outgoingRequests: serialized.filter((item) => item.status === 'pending' && item.direction === 'outgoing'),
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Failed to load friends' });
  }
});

router.get('/search', async (req: Request, res: Response) => {
  try {
    const currentUserId = await getCurrentUserId(req);
    const email = String(req.query.email ?? '').trim().toLowerCase();

    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }

    const user = (await findByEmail(email)) as any;

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (user._id.toString() === currentUserId) {
      return res.status(400).json({ message: 'You cannot add yourself' });
    }

    const relationship = await friendRepository.findByPair(currentUserId, String(user._id));

    return res.json({
      user: serializeUser(user),
      relationship: relationship ? serializeFriendship(relationship, currentUserId) : null,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Failed to search user' });
  }
});

router.post('/request', async (req: Request, res: Response) => {
  try {
    const currentUserId = await getCurrentUserId(req);
    const email = String(req.body?.email ?? '').trim().toLowerCase();

    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }

    const targetUser = (await findByEmail(email)) as any;

    if (!targetUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (String(targetUser._id) === currentUserId) {
      return res.status(400).json({ message: 'You cannot add yourself' });
    }

    const existing = await friendRepository.findByPair(currentUserId, String(targetUser._id));

    if (existing?.status === 'accepted') {
      return res.status(200).json({ message: 'Already friends' });
    }

    if (existing?.status === 'pending') {
      const requesterId = existing.requester?._id?.toString?.() || existing.requester?.toString?.();
      if (requesterId === currentUserId) {
        return res.status(200).json({ message: 'Friend request already sent' });
      }

      const accepted = await friendRepository.updateStatus(existing._id.toString(), 'accepted');
      return res.status(200).json({ message: 'Friend request accepted', friendship: serializeFriendship(accepted, currentUserId) });
    }

    const friendship = await friendRepository.createFriendRequest(currentUserId, String(targetUser._id));
    const populated = await friendRepository.findById(friendship._id.toString());

    return res.status(201).json({ message: 'Friend request sent', friendship: serializeFriendship(populated || friendship, currentUserId) });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Failed to send friend request' });
  }
});

router.put('/:friendshipId/accept', async (req: Request, res: Response) => {
  try {
    const currentUserId = await getCurrentUserId(req);
    const friendship = await friendRepository.findById(String(req.params.friendshipId));

    if (!friendship) {
      return res.status(404).json({ message: 'Friend request not found' });
    }

    if (friendship.addressee.toString() !== currentUserId) {
      return res.status(403).json({ message: 'Only the recipient can accept' });
    }

    const updated = await friendRepository.updateStatus(friendship._id.toString(), 'accepted');
    return res.json({ message: 'Friend request accepted', friendship: serializeFriendship(updated, currentUserId) });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Failed to accept request' });
  }
});

router.put('/:friendshipId/decline', async (req: Request, res: Response) => {
  try {
    const currentUserId = await getCurrentUserId(req);
    const friendship = await friendRepository.findById(String(req.params.friendshipId));

    if (!friendship) {
      return res.status(404).json({ message: 'Friend request not found' });
    }

    if (friendship.addressee.toString() !== currentUserId) {
      return res.status(403).json({ message: 'Only the recipient can decline' });
    }

    const updated = await friendRepository.updateStatus(friendship._id.toString(), 'declined');
    return res.json({ message: 'Friend request declined', friendship: serializeFriendship(updated, currentUserId) });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Failed to decline request' });
  }
});

router.delete('/:friendshipId', async (req: Request, res: Response) => {
  try {
    const currentUserId = await getCurrentUserId(req);
    const friendship = await friendRepository.findById(String(req.params.friendshipId));

    if (!friendship) {
      return res.status(404).json({ message: 'Friendship not found' });
    }

    const requesterId = friendship.requester.toString();
    const addresseeId = friendship.addressee.toString();

    if (requesterId !== currentUserId && addresseeId !== currentUserId) {
      return res.status(403).json({ message: 'You cannot remove this friendship' });
    }

    await friendRepository.removeFriendship(friendship._id.toString());
    return res.json({ message: 'Friend removed' });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Failed to remove friend' });
  }
});

export default router;