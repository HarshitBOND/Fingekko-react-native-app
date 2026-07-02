import mongoose from 'mongoose';

const friendshipSchema = new mongoose.Schema(
  {
    requester: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    addressee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ['pending', 'accepted', 'declined'],
      default: 'pending',
    },
    // Order-independent key ("<lowerId>:<higherId>") so a friendship between
    // two users can only ever exist once, regardless of who requested whom.
    pairKey: {
      type: String,
      required: true,
      unique: true,
    },
  },
  { timestamps: true }
);

const Friendship = mongoose.models.Friendship || mongoose.model('Friendship', friendshipSchema);

export default Friendship;