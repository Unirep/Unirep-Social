import { SERVER } from '../config'
import * as snarkjs from 'snarkjs'
import { Circuit } from '@unirep/circuits'
import { SnarkPublicSignals, SnarkProof } from '@unirep/crypto'

export default {
    verifyProof: async (
        circuitName: string | Circuit,
        publicSignals: SnarkPublicSignals,
        proof: SnarkProof
    ) => {
        const url = new URL(`/build/${circuitName}.vkey.json`, SERVER)
        const vkey = await fetch(url.toString()).then((r) => r.json())
        return snarkjs.groth16.verify(vkey, publicSignals, proof)
    },
    genProofAndPublicSignals: async (
        circuitName: string | Circuit,
        inputs: any
    ) => {
        const wasmUrl = new URL(`/build/${circuitName}.wasm`, SERVER)
        const wasm = await fetch(wasmUrl.toString()).then((r) =>
            r.arrayBuffer()
        )
        const zkeyUrl = new URL(`/build/${circuitName}.zkey`, SERVER)
        const zkey = await fetch(zkeyUrl.toString()).then((r) =>
            r.arrayBuffer()
        )
        const { proof, publicSignals } = await snarkjs.groth16.fullProve(
            inputs,
            new Uint8Array(wasm),
            new Uint8Array(zkey)
        )
        return { proof, publicSignals }
    },
}
