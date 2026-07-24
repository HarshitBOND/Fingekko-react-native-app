import Essential from '../models/Essential.js';

/** What the client sends when creating/editing a recurring essential. */
export interface EssentialDTO {
  name: string;
  amount: number;
  dueDay: number;
  category?: string;
}

/** API-safe shape, enriched with `paidThisMonth` for a given month key. */
export interface EssentialEntity {
  id: string;
  _id: string;
  userId: string;
  name: string;
  amount: number;
  dueDay: number;
  category: string;
  lastPaidMonth: string | null;
  /** Derived: true when `lastPaidMonth` equals the month key it was serialized for. */
  paidThisMonth: boolean;
  createdAt: number;
}

/** Calendar month key ("YYYY-MM") the paid-state is scoped to. */
export function monthKeyOf(date: Date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function serializeEssential(essential: any, monthKey: string): EssentialEntity {
  const plain = typeof essential.toObject === 'function' ? essential.toObject() : essential;
  const id = plain._id?.toString();
  const lastPaidMonth = plain.lastPaidMonth ?? null;

  return {
    id,
    _id: id,
    userId: plain.userId,
    name: plain.name,
    amount: plain.amount,
    dueDay: plain.dueDay,
    category: plain.category ?? 'other',
    lastPaidMonth,
    paidThisMonth: lastPaidMonth === monthKey,
    createdAt: plain.createdAt ? new Date(plain.createdAt).getTime() : Date.now(),
  };
}

export async function listEssentials(userId: string, monthKey = monthKeyOf()): Promise<EssentialEntity[]> {
  const essentials = await Essential.find({ userId }).sort({ dueDay: 1, createdAt: 1 }).lean();
  return essentials.map((e) => serializeEssential(e, monthKey));
}

export async function createEssential(
  userId: string,
  data: EssentialDTO,
  monthKey = monthKeyOf(),
): Promise<EssentialEntity> {
  const created = await Essential.create({
    userId,
    name: data.name,
    amount: data.amount,
    dueDay: data.dueDay,
    category: data.category ?? 'other',
  });
  return serializeEssential(created, monthKey);
}

export async function getEssentialById(
  userId: string,
  id: string,
  monthKey = monthKeyOf(),
): Promise<EssentialEntity | null> {
  const found = await Essential.findOne({ _id: id, userId }).lean();
  return found ? serializeEssential(found, monthKey) : null;
}

export async function updateEssential(
  userId: string,
  id: string,
  data: Partial<EssentialDTO>,
  monthKey = monthKeyOf(),
): Promise<EssentialEntity | null> {
  const $set: Record<string, unknown> = {};
  if (data.name !== undefined) $set.name = data.name;
  if (data.amount !== undefined) $set.amount = data.amount;
  if (data.dueDay !== undefined) $set.dueDay = data.dueDay;
  if (data.category !== undefined) $set.category = data.category;

  const updated = await Essential.findOneAndUpdate({ _id: id, userId }, { $set }, { new: true }).lean();
  return updated ? serializeEssential(updated, monthKey) : null;
}

export async function deleteEssential(userId: string, id: string, monthKey = monthKeyOf()): Promise<EssentialEntity | null> {
  const deleted = await Essential.findOneAndDelete({ _id: id, userId }).lean();
  return deleted ? serializeEssential(deleted, monthKey) : null;
}

/**
 * Mark a bill paid/unpaid for the given month. Paid stamps the month key;
 * unpaid clears it (so it can only ever clear the *current* month's paid mark,
 * never a past record we don't keep anyway).
 */
export async function setEssentialPaid(
  userId: string,
  id: string,
  paid: boolean,
  monthKey = monthKeyOf(),
): Promise<EssentialEntity | null> {
  const updated = await Essential.findOneAndUpdate(
    { _id: id, userId },
    { $set: { lastPaidMonth: paid ? monthKey : null } },
    { new: true },
  ).lean();
  return updated ? serializeEssential(updated, monthKey) : null;
}

export interface EssentialsSummary {
  /** Sum of every recurring essential's amount — the committed monthly load. */
  monthlyTotal: number;
  /** Sum of essentials not yet marked paid this month — money still to go out. */
  unpaidTotal: number;
  count: number;
}

/** Totals used to reserve money against bills across Home/Safe-to-Spend/Goals. */
export async function summarizeEssentials(userId: string, monthKey = monthKeyOf()): Promise<EssentialsSummary> {
  const essentials = await listEssentials(userId, monthKey);
  let monthlyTotal = 0;
  let unpaidTotal = 0;
  for (const e of essentials) {
    monthlyTotal += e.amount;
    if (!e.paidThisMonth) unpaidTotal += e.amount;
  }
  return { monthlyTotal, unpaidTotal, count: essentials.length };
}

/** The single unpaid bill to nudge the user about on Home (AUDIT item 11). */
export interface NextEssential {
  id: string;
  name: string;
  amount: number;
  dueDay: number;
  category: string;
  /** True when the due day has already passed this month. */
  overdue: boolean;
}

/**
 * The most urgent unpaid bill for the given date, or null if none.
 * An already-passed due day (overdue) always ranks ahead of an upcoming one;
 * within each group the earlier due day wins (longest overdue / soonest upcoming
 * first). Powers the Home "pay this before spending elsewhere" nudge (item 11).
 */
export async function nextUnpaidEssential(userId: string, date: Date = new Date()): Promise<NextEssential | null> {
  const monthKey = monthKeyOf(date);
  const essentials = await listEssentials(userId, monthKey);
  const today = date.getDate();

  let best: EssentialEntity | null = null;
  let bestRank = Infinity;
  for (const e of essentials) {
    if (e.paidThisMonth) continue;
    // Overdue bills rank by dueDay (0-31); upcoming bills are pushed after every
    // overdue one by a fixed offset, then sorted by dueDay. dueDay ≤ 31, so +100
    // cleanly separates the two groups.
    const rank = e.dueDay < today ? e.dueDay : e.dueDay + 100;
    if (rank < bestRank) {
      bestRank = rank;
      best = e;
    }
  }

  if (!best) return null;
  return {
    id: best.id,
    name: best.name,
    amount: best.amount,
    dueDay: best.dueDay,
    category: best.category,
    overdue: best.dueDay < today,
  };
}
