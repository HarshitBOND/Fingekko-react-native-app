
import Goal from '../models/Goal.js';



/**
 * Serialized Goal type (API response shape)
 */
export interface SerializedGoal {
  id: string;
  title: string;
  targetAmount: number;
  currentAmount: number;
  deadline?: string;
  emoji?: string;
  createdAt: number;
}

/**
 * Input type for creating a goal
 */
export interface CreateGoalInput {
  title: string;
  targetAmount: number;
  currentAmount?: number;
  deadline?: string;
  emoji?: string;
}

/*function cloneGoal(goal) {
  if (!goal) {
    return null;
  }

  return { ...goal };
}*/

function serializeGoal(goal: any): SerializedGoal {
  const plain = typeof goal.toObject === 'function' ? goal.toObject() : goal;

  return {
    id: plain.id ?? plain._id?.toString(),
    title: plain.title,
    targetAmount: plain.targetAmount,
    currentAmount: plain.currentAmount ?? 0,
    deadline: plain.deadline,
    emoji: plain.emoji ?? '🎯',
    createdAt: plain.createdAt
      ? new Date(plain.createdAt).getTime()
      : Date.now(),
  };
}

export async function listGoals(userId: string): Promise<SerializedGoal[]> {
  try {
    const goals = await Goal.find({ userId })
      .sort({ createdAt: -1 })
      .lean();

    return goals.map(serializeGoal);
  } catch (err) {
    throw new Error('Failed to fetch goals');
  }
}

export async function getGoalById(userId: string, goalId: string): Promise<SerializedGoal | null> {
  const goal = await Goal.findOne({ _id: goalId, userId }).lean();
  return goal ? serializeGoal(goal) : null;
}

export async function createGoal(
  userId: string,
  data: CreateGoalInput
): Promise<SerializedGoal> {
  try {
    if (!data.title || !data.targetAmount) {
      throw new Error('title and targetAmount are required');
    }

    const created = await Goal.create({
      userId,
      title: data.title,
      targetAmount: data.targetAmount,
      currentAmount: data.currentAmount ?? 0,
      deadline: data.deadline,
      emoji: data.emoji ?? '🎯',
    });

    return serializeGoal(created);
  } catch (err: any) {
    throw new Error(err.message || 'Failed to create goal');
  }
}

export async function updateGoal(
  userId: string,
  goalId: string,
  updates: Partial<CreateGoalInput>
): Promise<SerializedGoal> {
  try {
    const goal = await Goal.findOneAndUpdate(
      { _id: goalId, userId },
      { $set: updates },
      { new: true }
    );

    if (!goal) {
      throw new Error('Goal not found');
    }

    return serializeGoal(goal);
  } catch (err: any) {
    throw new Error(err.message || 'Failed to update goal');
  }
}

export async function deleteGoal(
  userId: string,
  goalId: string
): Promise<{ success: boolean; id: string }> {
  try {
    const deleted = await Goal.findOneAndDelete({
      _id: goalId,
      userId,
    });

    if (!deleted) {
      throw new Error('Goal not found');
    }

    return {
      success: true,
      id: goalId,
    };
  } catch (err: any) {
    throw new Error(err.message || 'Failed to delete goal');
  }
}