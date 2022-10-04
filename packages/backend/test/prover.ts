import path from 'path'
import fs from 'fs'
import * as snarkjs from 'snarkjs'
import { SnarkProof, SnarkPublicSignals } from '@unirep/crypto'
import { defaultProver } from '@unirep/circuits/provers/defaultProver'

const buildPath = '../keys'

/**
 * The default prover that uses the circuits in default built folder `zksnarkBuild/`
 */
const _defaultProver = {
    /**
     * Generate proof and public signals with `snarkjs.groth16.fullProve`
     * @param circuitName Name of the circuit, which can be chosen from `Circuit`
     * @param inputs The user inputs of the circuit
     * @returns snark proof and public signals
     */
    genProofAndPublicSignals: async (
        circuitName: string,
        inputs: any
    ): Promise<any> => {
        const circuitWasmPath = path.join(
            __dirname,
            buildPath,
            `${circuitName}.wasm`
        )
        if (!fs.existsSync(circuitWasmPath)) {
            return defaultProver.genProofAndPublicSignals(circuitName, inputs)
        }
        const zkeyPath = path.join(__dirname, buildPath, `${circuitName}.zkey`)
        const { proof, publicSignals } = await snarkjs.groth16.fullProve(
            inputs,
            circuitWasmPath,
            zkeyPath
        )

        return { proof, publicSignals }
    },

    /**
     * Verify the snark proof and public signals with `snarkjs.groth16.verify`
     * @param circuitName Name of the circuit, which can be chosen from `Circuit`
     * @param publicSignals The snark public signals that is generated from `genProofAndPublicSignals`
     * @param proof The snark proof that is generated from `genProofAndPublicSignals`
     * @returns True if the proof is valid, false otherwise
     */
    verifyProof: async (
        circuitName: string,
        publicSignals: SnarkPublicSignals,
        proof: SnarkProof
    ): Promise<boolean> => {
        const vkeyPath = path.join(
            __dirname,
            buildPath,
            `${circuitName}.vkey.json`
        )
        if (!fs.existsSync(vkeyPath)) {
            return defaultProver.verifyProof(circuitName, publicSignals, proof)
        }
        const vkey = require(vkeyPath)
        return snarkjs.groth16.verify(vkey, publicSignals, proof)
    },
}

export { _defaultProver as defaultProver }
