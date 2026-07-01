import Transaction from '../models/Transaction.js';

/**
 * Transaction input (what frontend sends)
 */
export interface TransactionDTO {
  type: 'income' | 'expense';
  amount: number;
  category: string;
  date: string;
}

/**
 * Transaction output (what API returns)
 */
export interface TransactionEntity {
  _id: string;
  userId: string;
  type: 'income' | 'expense';
  amount: number;
  category: string;
  date: string;
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

  return {
    _id: plain._id?.toString(),
    userId: plain.userId,
    type: plain.type,
    amount: plain.amount,
    category: plain.category,
    date: plain.date,
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