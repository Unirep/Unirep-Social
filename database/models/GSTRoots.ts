import * as mongoose from 'mongoose';
import { Schema, Document } from 'mongoose';
  
export interface IGSTRoot extends Document {
  epoch: number
  GSTRoot: string
  currentLeafIdx: number // by inserting i leaves, the global state tree will have the GSTRoot
}

const GSTRootSchema: Schema = new Schema({
    epoch: { type: Number },
    GSTRoot: { type: String },
    currentLeafIdx: { type: Number },
}, { collection: 'GSTRoots' })

export default mongoose.model<IGSTRoot>('GSTRoot', GSTRootSchema);