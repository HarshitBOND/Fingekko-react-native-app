import { Request, Response, Router } from 'express';
import authMiddleware from '../middleware/auth.js';
import User from '../models/User.js';
import friendRepository from '../repositories/friendRepository.js';
import { findByEmail, searchUsers } from '../repositories/userRepository.js';


const router = Router();

router.use(authMiddleware);


async function getCurrentUserId(req: any) {
  if (!req.user) {
    throw new Error("User not authenticated");
  }

  return req.user.id ?? req.user._id?.toString();
}

function serializeUser(user: any) {
  if (!user) {
    return null;
  }

  return {
    id: user._id?.toString?.() || user.id?.toString?.() || '',
    clerkId: user.clerkId,
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

    const query = String(req.query.q ?? "").trim();

    if (!query) {
      return res.json([]);
    }

    const users = await searchUsers(query);

    const results = await Promise.all(
      users
        .filter((user: any) => user._id.toString() !== currentUserId)
        .map(async (user: any) => {
          const relationship = await friendRepository.findByPair(
            currentUserId,
            user._id.toString()
          );

          return {
            user: serializeUser(user),
            relationship: relationship
              ? serializeFriendship(relationship, currentUserId)
              : null,
          };
        })
    );

    return res.json(results);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Failed to search users" });
  }
});

// People you might know: recent users you have no relationship with yet.
// Same response shape as /search so clients can reuse the same rendering.
router.get('/discover', async (req: Request, res: Response) => {
  try {
    const currentUserId = await getCurrentUserId(req);

    const relationships = await friendRepository.listForUser(currentUserId);
    const connectedIds = new Set<string>([currentUserId]);
    relationships.forEach((friendship: any) => {
      const requesterId = friendship.requester?._id?.toString?.() || friendship.requester?.toString?.();
      const addresseeId = friendship.addressee?._id?.toString?.() || friendship.addressee?.toString?.();
      if (requesterId) connectedIds.add(requesterId);
      if (addresseeId) connectedIds.add(addresseeId);
    });

    const users = await User.find({ _id: { $nin: Array.from(connectedIds) } })
      .sort({ createdAt: -1 })
      .limit(20)
      .lean();

    const results = users.map((user: any) => ({
      user: serializeUser(user),
      relationship: null,
    }));

    return res.json(results);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Failed to load suggestions' });
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

    const addresseeId =
      friendship.addressee?._id?.toString?.() ||
      friendship.addressee?.toString?.();

    if (addresseeId !== currentUserId) {
      return res
        .status(403)
        .json({ message: 'Only the recipient can accept' });
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

    const addresseeId =
      friendship.addressee?._id?.toString?.() ||
      friendship.addressee?.toString?.();

    if (addresseeId !== currentUserId) {
      return res
        .status(403)
        .json({ message: 'Only the recipient can decline' });
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
    const requesterId =
      friendship.requester?._id?.toString?.() ||
      friendship.requester?.toString?.();

    const addresseeId =
      friendship.addressee?._id?.toString?.() ||
      friendship.addressee?.toString?.();

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