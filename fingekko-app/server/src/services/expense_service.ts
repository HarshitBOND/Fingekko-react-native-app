import { Types } from "mongoose";
import ExpenseRepository from "../repositories/expenseRepository.js";
import groupRepository from "../repositories/groupRepository.js";

type CreateExpenseInput = {
  groupId: string;
  description: string;
  amount: number;
  paidBy: string;
  splitBetween: {
    userId: string;
    amount: number;
  }[];
};

export const createExpense = async (data: CreateExpenseInput) => {
  const group = await groupRepository.find(data.groupId);
  // Validate group existence
  if (!group) throw new Error("Group not found");

  const memberSet = new Set(group.members.map(m => m.toString()));
  // Validate paidBy
  if (!memberSet.has(data.paidBy)) {
    throw new Error("PaidBy is not a group member");
  }
  // Validate splitBetween User is in group or not 
  for (const split of data.splitBetween) {
    if (!memberSet.has(split.userId)) {
      throw new Error(`User ${split.userId} is not in group`);
    }
  }
  // calculate if the total splitBetween amount matches the expense amount
  let total = 0;

  for (const split of data.splitBetween) {
    total += split.amount;
  }

  if (total !== data.amount) {
    throw new Error("Split total does not match expense amount");
  }

  const expenseDTO = {
    groupId: new Types.ObjectId(data.groupId),
    description: data.description,
    amount: data.amount,
    paidBy: new Types.ObjectId(data.paidBy),
    splitBetween: data.splitBetween.map(split => ({
      userId: new Types.ObjectId(split.userId),
      amount: split.amount,
      settled: false ,
    })),
  };

  const expense =await ExpenseRepository.createExpense(expenseDTO);

  return expense;
};