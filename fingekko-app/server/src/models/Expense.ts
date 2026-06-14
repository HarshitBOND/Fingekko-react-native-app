import mongoose, { Types } from "mongoose";

interface IExpense {
    groupId: Types.ObjectId;
    description: string;
    amount: number;
    paidBy: Types.ObjectId;
    splitBetween: {
        userId: Types.ObjectId;
        amount: number;
        settled: boolean;
    }[];


};

const expenseSchema = new mongoose.Schema<IExpense>({
    groupId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Group",
        required: true
    },
    description: {
        type: String,
        required: true,
        trim: true
    },
    amount: {
        type: Number,
        required: true
    },
    paidBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    splitBetween: [
        {
            userId: {
                type: mongoose.Schema.Types.ObjectId,
                ref: "User",
                required: true
            },
            amount: {
                type: Number,
                required: true
            },
            settled: {
                type: Boolean,
                default: false
            }
        }],

}, { timestamps: true })

const Expense = mongoose.model<IExpense>("Expense", expenseSchema);

export default Expense; 