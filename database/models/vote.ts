import * as mongoose from 'mongoose';
import { Schema, Document } from 'mongoose';

export interface IVote {
  transactionHash: string
  epoch: number
  attester: string
  posRep: number
  negRep: number
  graffiti: string
  overwriteGraffiti: boolean
}

export interface IVotes extends Document {
  epochKey: string
  attestations: Array<IVote>
}
  
const AttestationsSchema: Schema = new Schema({
  epochKey: { type: String },
  attestations: { type: Array },
}, {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});


export default mongoose.model<IVotes>('Votes', AttestationsSchema);