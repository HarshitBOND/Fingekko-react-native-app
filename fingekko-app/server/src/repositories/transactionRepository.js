const crypto = require('crypto');
const { getDbStatus } = require('../db');
const Transaction = require('../models/Transaction');

const memoryTransactions = new Map();

function cloneTransaction(transaction) {
  if (!transaction) {
    return null;
  }

  return { ...transaction };
}

function serializeTransaction(transaction) {
  const plain = typeof transaction.toObject === 'function' ? transaction.toObject() : transaction;
  const id = plain.id ?? plain._id?.toString();

  return {
    id,
    type: plain.type,
    amount: plain.amount,
    category: plain.category,
    date: plain.date,
    createdAt: plain.createdAt ? new Date(plain.createdAt).getTime() : Date.now(),
  };
}

async function listTransactions(userId) {
  const { usingMemory } = getDbStatus();
  if (usingMemory) {
    const entries = memoryTransactions.get(userId) ?? [];
    return entries.map(serializeTransaction).sort((a, b) => b.createdAt - a.createdAt);
  }

  const transactions = await Transaction.find({ userId }).sort({ createdAt: -1 }).lean();
  return transactions.map(serializeTransaction);
}

async function createTransaction(userId, data) {
  const { usingMemory } = getDbStatus();
  if (usingMemory) {
    const transaction = {
      id: crypto.randomUUID(),
      userId,
      type: data.type,
      amount: data.amount,
      category: data.category,
      date: data.date,
      createdAt: Date.now(),
    };

    const current = memoryTransactions.get(userId) ?? [];
    memoryTransactions.set(userId, [transaction, ...current]);
    return serializeTransaction(transaction);
  }

  const created = await Transaction.create({ userId, ...data });
  return serializeTransaction(created);
}

module.exports = {
  listTransactions,
  createTransaction,
};
