import Transaction from '../models/Transaction.js';

/**
 * Transaction input (what frontend sends)
 */
export interface TransactionDTO {
  type: 'income' | 'expense';
  amount: number;
  category: string;
  date: string;
  /** Set when this row mirrors the user's share of a shared expense. */
  isSplit?: boolean;
}

/**
 * Transaction output (what API returns)
 */
export interface TransactionEntity {
  /** Same value as `_id`. The client API type declares `id`, and code that
   *  keyed lists off it was silently getting `undefined` before this existed. */
  id: string;
  _id: string;
  userId: string;
  type: 'income' | 'expense';
  amount: number;
  category: string;
  date: string;
  isSplit: boolean;
  createdAt: number;
}

/**
 * Serialize Mongo → API-safe object
 */
function serializeTransaction(transaction: any): TransactionEntity {
  const plain =
    typeof transaction.toObject === 'function'
      ? transaction.toObject()
      : transaction;

  const id = plain._id?.toString();

  return {
    id,
    // Kept alongside `id` so any existing consumer of `_id` keeps working.
    _id: id,
    userId: plain.userId,
    type: plain.type,
    amount: plain.amount,
    category: plain.category,
    date: plain.date,
    isSplit: Boolean(plain.isSplit),
    createdAt: plain.createdAt
      ? new Date(plain.createdAt).getTime()
      : Date.now(),
  };
}

/**
 * GET all transactions for a user
 */
export async function listTransactions(
  userId: string
): Promise<TransactionEntity[]> {
  const transactions = await Transaction.find({ userId })
    .sort({ createdAt: -1 })
    .lean();

  return transactions.map(serializeTransaction);
}

/**
 * CREATE a new transaction
 */
export async function createTransaction(
  userId: string,
  data: TransactionDTO
): Promise<TransactionEntity> {
  if (!data.type || !data.amount || !data.category || !data.date) {
    throw new Error('Missing required transaction fields');
  }

  const created = await Transaction.create({
    userId,
    ...data,
  });

  return serializeTransaction(created);
}

/**
 * GET a single transaction, scoped to its owner. Returns null if it doesn't
 * exist or belongs to someone else — callers must treat both the same (404) so
 * ownership can't be probed by ID.
 */
export async function getTransactionById(
  userId: string,
  id: string
): Promise<TransactionEntity | null> {
  const found = await Transaction.findOne({ _id: id, userId }).lean();
  return found ? serializeTransaction(found) : null;
}

/**
 * UPDATE a transaction the user owns. Only the editable fields are touched;
 * `userId`/`isSplit`/`createdAt` are never reassigned here. Returns null when
 * the row doesn't exist or isn't the caller's.
 */
export async function updateTransaction(
  userId: string,
  id: string,
  data: Partial<Pick<TransactionDTO, 'type' | 'amount' | 'category' | 'date'>>
): Promise<TransactionEntity | null> {
  const $set: Record<string, unknown> = {};
  if (data.type !== undefined) $set.type = data.type;
  if (data.amount !== undefined) $set.amount = data.amount;
  if (data.category !== undefined) $set.category = data.category;
  if (data.date !== undefined) $set.date = data.date;

  const updated = await Transaction.findOneAndUpdate(
    { _id: id, userId },
    { $set },
    { new: true }
  ).lean();

  return updated ? serializeTransaction(updated) : null;
}

/**
 * DELETE a transaction the user owns. Returns the deleted row (so the caller can
 * reverse its XP), or null if there was nothing to delete for this user.
 */
export async function deleteTransaction(
  userId: string,
  id: string
): Promise<TransactionEntity | null> {
  const deleted = await Transaction.findOneAndDelete({ _id: id, userId }).lean();
  return deleted ? serializeTransaction(deleted) : null;
}