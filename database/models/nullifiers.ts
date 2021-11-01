import * as mongoose from 'mongoose';
import { Schema, Document } from 'mongoose';
  
export interface INullifier extends Document {
  epoch: number
  nullifier: string
  // transactionHash: string
}

const NullifierSchema: Schema = new Schema({
    epoch: { type: Number },
    nullifier: { type: String },
    // transactionHash: { type: String },
}, { collection: 'Nullifiers' })

export default mongoose.model<INullifier>('Nullifier', NullifierSchema);