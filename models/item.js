import mongoose from "mongoose";

const itemSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String ,required:true},
  contact:{type: String, required: true},
  category: {
    type: String,
    enum: ['Electronics', 'ID Card', 'Clothing', 'Books', 'Accessories', 'Others'],
    required: true
  },
  imageUrl: { type: String , required: true},
  status: {
    type: String,
    enum: ['found', 'claimed'],
    default: 'found'
  },
  location: { type: String, required: true },
  dateFound: { type: Date, required: true },
  postedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  claimedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' ,required: false},
  claimedWhen: {type: Date, required: false,default: null},
  claimToken: { 
    token: { type: String },
    expiresAt: { type: Date },
    issuedAt: { type: Date }
  },
}, { timestamps: true });

export const Item = mongoose.model('Item', itemSchema,'items');