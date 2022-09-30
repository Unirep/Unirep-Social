import * as path from 'path'
import { expect } from 'chai'
import { genRandomSalt, ZkIdentity } from '@unirep/crypto'
import { genEpochKey, Reputation } from '@unirep/core'
import * as crypto from '@unirep/crypto'
import * as snarkjs from 'snarkjs'
import {
    USER_STATE_TREE_DEPTH,
    GLOBAL_STATE_TREE_DEPTH,
} from '@unirep/circuits'

const circuitName = 'proveNegativeReputation'

const genCircuitInput = (
    id: crypto.ZkIdentity,
    epoch: number,
    reputationRecords,
    attesterId,
    _maxRep?
) => {
    const maxRep = _maxRep ?? 0
    if (reputationRecords[attesterId] === undefined) {
        reputationRecords[attesterId] = new Reputation(
            BigInt(0),
            BigInt(0),
            BigInt(0),
            BigInt(0)
        )
    }

    // User state tree
    const userStateTree = new crypto.SparseMerkleTree(
        USER_STATE_TREE_DEPTH,
        crypto.hash5([BigInt(0), BigInt(0), BigInt(0), BigInt(0), BigInt(0)])
    )
    for (const attester of Object.keys(reputationRecords)) {
        userStateTree.update(
            BigInt(attester),
            reputationRecords[attester].hash()
        )
    }
    const userStateRoot = userStateTree.root
    const USTPathElements = userStateTree.createProof(BigInt(attesterId))

    // Global state tree
    const GSTree = new crypto.IncrementalMerkleTree(GLOBAL_STATE_TREE_DEPTH)
    const commitment = id.genIdentityCommitment()
    const hashedLeaf = crypto.hashLeftRight(commitment, userStateRoot)
    GSTree.insert(hashedLeaf)
    const GSTreeProof = GSTree.createProof(0) // if there is only one GST leaf, the index is 0
    const GSTreeRoot = GSTree.root

    const circuitInputs = {
        epoch,
        identity_nullifier: id.identityNullifier,
        identity_trapdoor: id.trapdoor,
        user_tree_root: userStateRoot,
        GST_path_index: GSTreeProof.pathIndices,
        GST_path_elements: GSTreeProof.siblings,
        attester_id: attesterId,
        pos_rep: reputationRecords[attesterId].posRep,
        neg_rep: reputationRecords[attesterId].negRep,
        graffiti: reputationRecords[attesterId].graffiti,
        sign_up: reputationRecords[attesterId].signUp,
        UST_path_elements: USTPathElements,
        maxRep,
    }
    return crypto.stringifyBigInts(circuitInputs)
}

const genProofAndPublicSignals = async (inputs: any): Promise<any> => {
    const circuitWasmPath = path.join(
        __dirname,
        `../zksnarkBuild/${circuitName}.wasm`
    )
    const zkeyPath = path.join(__dirname, `../zksnarkBuild/${circuitName}.zkey`)
    const { proof, publicSignals } = await snarkjs.groth16.fullProve(
        inputs,
        circuitWasmPath,
        zkeyPath
    )
    return { proof, publicSignals }
}

const verifyProof = async (publicSignals, proof): Promise<boolean> => {
    const vkey = require(path.join(
        __dirname,
        `../zksnarkBuild/${circuitName}.vkey.json`
    ))
    return snarkjs.groth16.verify(vkey, publicSignals, proof)
}

describe('Prove reputation from attester circuit', function () {
    this.timeout(300000)

    const epoch = 1
    const nonce = 1

    it('successfully prove maximum reputation', async () => {
        const attesterId = 1
        const reputationRecords = {
            [attesterId]: new Reputation(
                BigInt(10),
                BigInt(20),
                BigInt(0),
                BigInt(1)
            ),
        }
        const circuitInputs = genCircuitInput(
            new ZkIdentity(),
            epoch,
            reputationRecords,
            attesterId,
            5
        )

        const { proof, publicSignals } = await genProofAndPublicSignals(
            circuitInputs
        )
        const isValid = await verifyProof(publicSignals, proof)
        expect(isValid).to.be.true
    })

    it('should output epoch key', async () => {
        const attesterId = 1
        const reputationRecords = {
            [attesterId]: new Reputation(
                BigInt(10),
                BigInt(20),
                BigInt(0),
                BigInt(1)
            ),
        }
        const id = new ZkIdentity()
        const circuitInputs = genCircuitInput(
            id,
            epoch,
            reputationRecords,
            attesterId,
            5
        )

        const { proof, publicSignals } = await genProofAndPublicSignals(
            circuitInputs
        )
        const isValid = await verifyProof(publicSignals, proof)
        expect(isValid).to.be.true

        const epk = genEpochKey(id.identityNullifier, epoch, 0)
        expect(publicSignals[1]).to.equal(epk.toString())
    })

    it('successfully fail to prove negative reputation with equal positive and negative repuataion', async () => {
        const attesterId = 1
        const reputationRecords = {
            [attesterId]: new Reputation(
                BigInt(20),
                BigInt(20),
                BigInt(0),
                BigInt(1)
            ),
        }
        const circuitInputs = genCircuitInput(
            new ZkIdentity(),
            epoch,
            reputationRecords,
            attesterId,
            0
        )

        const { proof, publicSignals } = await genProofAndPublicSignals(
            circuitInputs
        )
        const isValid = await verifyProof(publicSignals, proof)
        expect(isValid).to.be.false
    })

    it('successfully fail to prove maximum reputation', async () => {
        const attesterId = 1
        const reputationRecords = {
            [attesterId]: new Reputation(
                BigInt(10),
                BigInt(20),
                BigInt(0),
                BigInt(1)
            ),
        }
        const circuitInputs = genCircuitInput(
            new ZkIdentity(),
            epoch,
            reputationRecords,
            attesterId,
            11
        )

        const { proof, publicSignals } = await genProofAndPublicSignals(
            circuitInputs
        )
        const isValid = await verifyProof(publicSignals, proof)
        expect(isValid).to.be.false
    })

    it('prove reputation with wrong attester Id should fail', async () => {
        const attesterId = 1
        const reputationRecords = {
            [attesterId]: new Reputation(
                BigInt(10),
                BigInt(20),
                BigInt(0),
                BigInt(1)
            ),
        }

        const circuitInputs = genCircuitInput(
            new ZkIdentity(),
            epoch,
            reputationRecords,
            attesterId
        )
        const wrongAttesterId = attesterId + 1
        circuitInputs.attester_id = wrongAttesterId

        const { proof, publicSignals } = await genProofAndPublicSignals(
            circuitInputs
        )
        const isValid = await verifyProof(publicSignals, proof)
        expect(isValid).to.be.false
    })

    it('prove reputation with not exist user state should fail', async () => {
        const attesterId = 1
        const reputationRecords = {
            [attesterId]: new Reputation(
                BigInt(10),
                BigInt(20),
                BigInt(0),
                BigInt(1)
            ),
        }

        const wrongUserStateRoot = genRandomSalt().toString()
        const circuitInputs = genCircuitInput(
            new ZkIdentity(),
            epoch,
            reputationRecords,
            attesterId
        )
        circuitInputs.user_tree_root = wrongUserStateRoot

        const { proof, publicSignals } = await genProofAndPublicSignals(
            circuitInputs
        )
        const isValid = await verifyProof(publicSignals, proof)
        expect(isValid).to.be.false
    })
})
