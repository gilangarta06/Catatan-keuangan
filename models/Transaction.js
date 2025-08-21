import mongoose from 'mongoose';

const TransactionSchema = new mongoose.Schema(
{
inputBy: { type: String, required: true },
type: { type: String, enum: ['masuk', 'keluar'], required: true },
itemType: { type: String, required: true },
price: { type: Number, required: true, min: 0 },
date: { type: Date, required: true }
},
{ timestamps: true }
);

export default mongoose.model('Transaction', TransactionSchema);