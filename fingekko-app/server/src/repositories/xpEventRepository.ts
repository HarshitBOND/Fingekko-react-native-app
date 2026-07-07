import XpEvent from '../models/XpEvent.js';

export interface SerializedXpEvent {
  id: string;
  type: string;
  amount: number;
  description: string;
  goalId: string | null;
  createdAt: number;
}

function serializeXpEvent(event: any): SerializedXpEvent {
  const plain = typeof event.toObject === 'function' ? event.toObject() : event;

  return {
    id: plain._id?.toString(),
    type: plain.type,
    amount: plain.amount,
    description: plain.description,
    goalId: plain.goalId ?? null,
    createdAt: plain.createdAt ? new Date(plain.createdAt).getTime() : Date.now(),
  };
}

export interface LogXpEventInput {
  type: string;
  amount: number;
  description: string;
  goalId?: string;
  metadata?: unknown;
}

export async function logXpEvent(userId: string, data: LogXpEventInput): Promise<SerializedXpEvent> {
  try {
    const created = await XpEvent.create({
      userId,
      type: data.type,
      amount: data.amount,
      description: data.description,
      goalId: data.goalId ?? null,
      metadata: data.metadata ?? null,
    });

    return serializeXpEvent(created);
  } catch (err: any) {
    throw new Error(err.message || 'Failed to log XP event');
  }
}

export async function listXpEvents(userId: string, limit = 50): Promise<SerializedXpEvent[]> {
  try {
    const events = await XpEvent.find({ userId })
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    return events.map(serializeXpEvent);
  } catch (err) {
    throw new Error('Failed to fetch XP history');
  }
}
