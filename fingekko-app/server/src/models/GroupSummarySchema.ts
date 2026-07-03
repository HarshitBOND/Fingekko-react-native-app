import mongoose from "mongoose";

const groupSummarySchema = new mongoose.Schema(
{
    groupId:{
        type: mongoose.Schema.Types.ObjectId,
        ref: "Group",
        required:true,
        unique:true
    },

    settlements:[
        {
            fromUserId:{
                type: mongoose.Schema.Types.ObjectId,
                ref:"User",
                required:true
            },

            toUserId:{
                type: mongoose.Schema.Types.ObjectId,
                ref:"User",
                required:true
            },

            amount:{
                type:Number,
                required:true
            }
        }
    ]
},
{timestamps:true}
);