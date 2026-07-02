import Friendship from '../models/Friendship.js';

function pairKey(firstId: string, secondId: string) {
  return [firstId, secondId].sort().join(':');
}

async function findById(friendshipId: string) {
  return Friendship.findById(friendshipId)
    .populate('requester', 'name email avatarKey')
    .populate('addressee', 'name email avatarKey');
}

async function findByPair(firstId: string, secondId: string) {
  return Friendship.findOne({
    $or: [
      { requester: firstId, addressee: secondId },
      { requester: secondId, addressee: firstId },
    ],
  })
    .populate('requester', 'name email avatarKey')
    .populate('addressee', 'name email avatarKey');
}

async function listForUser(userId: string) {
  return Friendship.find({
    $or: [{ requester: userId }, { addressee: userId }],
  })
    .populate('requester', 'name email avatarKey')
    .populate('addressee', 'name email avatarKey')
    .sort({ createdAt: -1 });
}

async function listAcceptedForUser(userId: string) {
  return Friendship.find({
    status: 'accepted',
    $or: [{ requester: userId }, { addressee: userId }],
  })
    .populate('requester', 'name email avatarKey')
    .populate('addressee', 'name email avatarKey')
    .sort({ createdAt: -1 });
}

async function listAcceptedFriendIds(userId: string) {
  const friendships = await Friendship.find({
    status: 'accepted',
    $or: [{ requester: userId }, { addressee: userId }],
  }).lean();

  return friendships.map((friendship) =>
    friendship.requester.toString() === userId
      ? friendship.addressee.toString()
      : friendship.requester.toString()
  );
}

async function findAcceptedFriendship(firstId: string, secondId: string) {
  return Friendship.findOne({
    status: 'accepted',
    $or: [
      { requester: firstId, addressee: secondId },
      { requester: secondId, addressee: firstId },
    ],
  });
}

async function createFriendRequest(requesterId: string, addresseeId: string) {
  return Friendship.create({
    requester: requesterId,
    addressee: addresseeId,
    status: 'pending',
    pairKey: pairKey(requesterId, addresseeId),
  });
}

async function updateStatus(friendshipId: string, status: 'pending' | 'accepted' | 'declined') {
  return Friendship.findByIdAndUpdate(friendshipId, { status }, { new: true })
    .populate('requester', 'name email avatarKey')
    .populate('addressee', 'name email avatarKey');
}

async function removeFriendship(friendshipId: string) {
  return Friendship.findByIdAndDelete(friendshipId);
}

export default {
  createFriendRequest,
  findAcceptedFriendship,
  findById,
  findByPair,
  listAcceptedForUser,
  listAcceptedFriendIds,
  listForUser,
  pairKey,
  removeFriendship,
  updateStatus,
};