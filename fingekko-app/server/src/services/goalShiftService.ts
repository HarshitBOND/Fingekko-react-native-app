import Goal from '../models/Goal.js';
import User from '../models/User.js';

export interface ShiftedGoalInfo {
  goalId: string;
  title: string;
  emoji: string;
  oldDeadline: string;
  newDeadline: string;
  shiftDays: number;
}

/** Helper to shift a YYYY-MM-DD date string by N days. */
export function shiftDateIso(dateStr: string, days: number): string {
  const base = new Date(dateStr);
  const validDate = isNaN(base.getTime()) ? new Date() : base;
  validDate.setDate(validDate.getDate() + days);
  const y = validDate.getFullYear();
  const m = String(validDate.getMonth() + 1).padStart(2, '0');
  const d = String(validDate.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Calculates candidate goal deadline shifts when a user's monthly recurring bills change.
 * If applyNow is true, updates DB immediately; otherwise returns candidate shift for user confirmation.
 */
export async function processGoalShiftOnEssentialChange(
  userId: string,
  oldMonthlyEssentials: number,
  newMonthlyEssentials: number,
  billName: string,
  billAmount: number,
  isDelete: boolean = false,
  applyNow: boolean = false
): Promise<{ shiftedGoals: ShiftedGoalInfo[]; message: string; requiresConfirmation: boolean } | null> {
  const user = (await User.findOne({ _id: userId }).lean()) as any;
  if (!user || !user.monthlyIncome || user.monthlyIncome <= 0) {
    return null;
  }

  const income = Number(user.monthlyIncome);
  const oldDisposable = Math.max(0, income - oldMonthlyEssentials);
  const newDisposable = Math.max(0, income - newMonthlyEssentials);

  const activeGoals = await Goal.find({
    userId,
    $expr: { $lt: ['$currentAmount', '$targetAmount'] },
  });

  if (activeGoals.length === 0) {
    return null;
  }

  const shiftedGoals: ShiftedGoalInfo[] = [];

  for (const goal of activeGoals) {
    const remaining = Math.max(0, goal.targetAmount - (goal.currentAmount || 0));
    if (remaining <= 0) continue;

    const oldDaily = oldDisposable / 30;
    const newDaily = newDisposable / 30;

    let shiftDays = 0;
    if (newDaily <= 0 && oldDaily > 0) {
      shiftDays = 30;
    } else if (oldDaily > 0 && newDaily > 0) {
      const oldDays = Math.ceil(remaining / oldDaily);
      const newDays = Math.ceil(remaining / newDaily);
      shiftDays = newDays - oldDays;
    } else if (oldDaily <= 0 && newDaily > 0) {
      const newDays = Math.ceil(remaining / newDaily);
      shiftDays = -newDays;
    }

    if (shiftDays !== 0) {
      const oldDeadline = goal.deadline || new Date().toISOString().split('T')[0];
      const newDeadline = shiftDateIso(oldDeadline, shiftDays);

      if (applyNow) {
        await Goal.updateOne({ _id: goal._id }, { $set: { deadline: newDeadline } });
      }

      shiftedGoals.push({
        goalId: goal._id.toString(),
        title: goal.title,
        emoji: goal.emoji || '🎯',
        oldDeadline,
        newDeadline,
        shiftDays,
      });
    }
  }

  if (shiftedGoals.length === 0) return null;

  const maxShift = shiftedGoals[0].shiftDays;
  const absShift = Math.abs(maxShift);
  const message = isDelete
    ? `You removed "${billName}". Because your monthly expenses decreased by ₹${billAmount}, your goals can move ${absShift} day(s) earlier 🎉!`
    : `You added "${billName}" (₹${billAmount}/mo). Due to this recurring expense, would you like to shift your goal deadlines right by ${absShift} day(s) 📅?`;

  return {
    shiftedGoals,
    message,
    requiresConfirmation: !isDelete && !applyNow,
  };
}

/**
 * Calculates and updates goal deadlines automatically for expenses / quest fails.
 */
export async function processGoalShiftOnQuestFail(
  userId: string,
  questTitle: string,
  shiftDays: number = 1
): Promise<{ shiftedGoals: ShiftedGoalInfo[]; message: string } | null> {
  const activeGoals = await Goal.find({
    userId,
    $expr: { $lt: ['$currentAmount', '$targetAmount'] },
  });

  if (activeGoals.length === 0) {
    return null;
  }

  const shiftedGoals: ShiftedGoalInfo[] = [];

  for (const goal of activeGoals) {
    const oldDeadline = goal.deadline || new Date().toISOString().split('T')[0];
    const newDeadline = shiftDateIso(oldDeadline, shiftDays);

    await Goal.updateOne({ _id: goal._id }, { $set: { deadline: newDeadline } });

    shiftedGoals.push({
      goalId: goal._id.toString(),
      title: goal.title,
      emoji: goal.emoji || '🎯',
      oldDeadline,
      newDeadline,
      shiftDays,
    });
  }

  const message = `You did not complete your quest "${questTitle}" today. Missing your daily goal has shifted your target dates right by ${shiftDays} day(s) ⏳.`;

  return { shiftedGoals, message };
}
