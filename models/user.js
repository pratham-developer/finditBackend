import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  regNo: { type: String , required: true, unique: true},
  registeredItems: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Item' }],
  claimedItems: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Item' }],
}, { timestamps: true });

export const User = mongoose.model('User', userSchema,'users');