import Expense from '../models/Expense.js';
import { Types } from 'mongoose';

interface ExpenseDTO {
    groupId: Types.ObjectId,
    description: string,
    amount: number,
    paidBy: Types.ObjectId,
    splitBetween: {
        userId: Types.ObjectId,
        amount: number,
        settled: boolean,
    }[],
}



class ExpenseRepository {
    //...................................... crud operations for expense
    async createExpense(expenseData: ExpenseDTO) {
        return Expense.create(expenseData);
    }

    async getExpensesByGroupId(groupId: Types.ObjectId) {
        return Expense.find({ groupId }).sort({ createdAt: -1 });
    }

    async getExpenseById(expenseId: Types.ObjectId) {
        return Expense.findById(expenseId);
    }

    async deleteExpense(expenseId: Types.ObjectId) {
        return Expense.findByIdAndDelete(expenseId);
    }

    async updateExpense(expenseId: Types.ObjectId, updateData: Partial<ExpenseDTO>) {
        return Expense.findByIdAndUpdate(expenseId, updateData, { new: true });
    }

    //.................................... Group based expense retrival ,
    async getExpensesByGroupIdWithPagination(groupId: Types.ObjectId, page: number, limit: number) {
        const skip = (page - 1) * limit;
        return Expense.find({ groupId }).sort({ createdAt: -1 }).skip(skip).limit(limit);
    }

    async getTotalExpensesByGroupId(groupId: Types.ObjectId) {
        const result = await Expense.aggregate(
            [
                {
                    $match: {
                        groupId: groupId
                    }
                },
                {
                    $group: {
                        _id: null,
                        totalAmount: { $sum: "$amount" }
                    }
                }
            ]
        )

        return result[0]?.totalAmount || 0;
    }

    async getExpenseFilteredByDateRange(groupId: Types.ObjectId, startDate: Date, endDate: Date) {
        return Expense.find(
            {
                groupId: groupId,
                createdAt: {
                    $gte: startDate,
                    $lte: endDate
                }
            }
        ).sort({ createdAt: -1 });
    }

    //.................................... User based expense queries,
    async getExpensesByUserId(userId: Types.ObjectId) {
        return Expense.find({
            $or: [{ paidBy: userId }, { "splitBetween.userId": userId }]
        })
    }

    async getTotalAmountPaidByUserinGroup(userId: Types.ObjectId, groupId: Types.ObjectId) {
        const paidByUser = await Expense.aggregate([
            {
                $match: {
                    $and: [
                        { groupId: groupId },
                        { paidBy: userId }
                    ]
                }
            },
            {
                $group: {
                    _id: null,
                    totalAmountPaid: { $sum: "$amount" }
                }
            }
        ])
        return paidByUser[0]?.totalAmountPaid || 0;
    }

    async getTotalAmountOwedByUserInGroup(
        userId: Types.ObjectId,
        groupId: Types.ObjectId
    ) {
        const result = await Expense.aggregate([
            {
                $match: {
                    groupId: groupId
                }
            },
            {
                $unwind: "$splitBetween"
            },
            {
                $match: {
                    "splitBetween.userId": userId
                }
            },
            {
                $group: {
                    _id: null,
                    totalAmountOwed: {
                        $sum: "$splitBetween.amount"
                    }
                }
            }
        ]);

        return result[0]?.totalAmountOwed || 0;
    }
    //.......................................Splitwise expense retrival 

    async getGroupExpenseSummary(groupId: Types.ObjectId) {
        return Expense.aggregate([
            {
                $match: {
                    groupId
                }
            },

            {
                $facet: {

                    paid: [
                        {
                            $group: {
                                _id: "$paidBy",
                                totalPaid: {
                                    $sum: "$amount"
                                }
                            }
                        }
                    ],

                    owed: [
                        {
                            $unwind: "$splitBetween"
                        },
                        {
                            $group: {
                                _id: "$splitBetween.userId",
                                totalOwed: {
                                    $sum: "$splitBetween.amount"
                                }
                            }
                        }
                    ]

                }
            }
        ]);
    }

    //......................................settlement of expenses 

    async settleExpense(expenseId: Types.ObjectId) {
        return Expense.findByIdAndUpdate(expenseId, {
            $set: {
                "splitBetween.$[].settled": true
            }
        }, { new: true });
    }

    //......................................add participant to an existing expense
    async addParticipantToExpense(
        expenseId: Types.ObjectId,
        participant: { userId: Types.ObjectId; amount: number }
    ) {
        return Expense.findOneAndUpdate(
            {
                _id: expenseId,
                "splitBetween.userId": { $ne: participant.userId }
            },
            {
                $push: {
                    splitBetween: {
                        userId: participant.userId,
                        amount: participant.amount,
                        settled: false
                    }
                }
            },
            { new: true }
        );
    }

}

export default new ExpenseRepository();


