import * as mongoose from 'mongoose';
import { Schema, Document } from 'mongoose';
import { IVote } from './vote';

export interface IPost extends Document {
    transactionHash: string
    content: string
    hashedContent: string
    epoch: number
    epochKey: string
    epkProof: [ string ]
    minRep: number
    comments: [ string ]
    votes: [ IVote ]
    status: number // 0: pending, 1: on-chain, 2: disabled
  }
  
  const PostSchema: Schema = new Schema({
    transactionHash: { type: String },
    content: { type: String },
    hashedContent: {type: String },
    epoch: { type: Number, required: true },
    epochKey: { type: String, required: true },
    epkProof:  { type: [], required: true},
    minRep: { type: Number },
    comments: { type: [ ]},
    votes: { type: [ ] },
    status: { type: Number, required: true },
  }, { 
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  });
  
  export default mongoose.model<IPost>('Post', PostSchema);