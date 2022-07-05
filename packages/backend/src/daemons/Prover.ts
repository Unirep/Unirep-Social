import { Circuit } from '@unirep/circuits'
import * as snarkjs from 'snarkjs'
import path from 'path'

export class Prover {
    static async verifyProof(type: string | Circuit, signals: bigint[], proof) {
        // we'll handle loading here
        const basepath = path.join(__dirname, '../../keys/', type)
        // const zkeypath = `${basepath}.zkey`
        const vkeypath = `${basepath}.vkey.json`
        // const wasmpath = `${basepath}.wasm`
        const vkey = require(vkeypath)
        return snarkjs.groth16.verify(vkey, signals, proof)
    }
}
