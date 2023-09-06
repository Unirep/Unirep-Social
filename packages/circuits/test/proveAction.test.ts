import { expect } from 'chai'
import * as utils from '@unirep/utils'
import { Circuit, CircuitConfig } from '@unirep/circuits'
import { Identity } from '@semaphore-protocol/identity'
import { poseidon4 } from 'poseidon-lite'
import { defaultProver } from '../provers/defaultProver'
import { ActionProof, REP_BUDGET } from '../src'

const {
    FIELD_COUNT,
    NUM_EPOCH_KEY_NONCE_PER_EPOCH,
    SUM_FIELD_COUNT,
    STATE_TREE_DEPTH,
    REPL_NONCE_BITS,
} = CircuitConfig.default

const circuit = 'actionProof'

const genCircuitInput = (config: {
    id: Identity
    epoch: number
    nonce: number
    attesterId: number | bigint
    sumField?: (bigint | number)[]
    replField?: (bigint | number)[]
    minRep?: number | bigint
    maxRep?: number | bigint
    proveMinRep?: number
    proveMaxRep?: number
    proveZeroRep?: number
    proveGraffiti?: boolean | number
    graffiti?: any
    revealNonce?: number
    notEpochKey?: bigint
    sigData?: bigint | string
    spentRep?: number
    repNonceStarter?: number
}) => {
    const {
        id,
        epoch,
        nonce,
        attesterId,
        sumField,
        replField,
        minRep,
        proveGraffiti,
        graffiti,
        maxRep,
        proveMinRep,
        proveMaxRep,
        proveZeroRep,
        revealNonce,
        notEpochKey,
        sigData,
        spentRep,
        repNonceStarter,
    } = Object.assign(
        {
            minRep: 0,
            maxRep: 0,
            graffiti: 0,
            sumField: [],
            replField: [],
        },
        config
    )

    const startBalance = [
        ...sumField,
        ...Array(SUM_FIELD_COUNT - sumField.length).fill(0),
        ...replField,
        ...Array(FIELD_COUNT - SUM_FIELD_COUNT - replField.length).fill(0),
    ]
    // Global state tree
    const stateTree = new utils.IncrementalMerkleTree(STATE_TREE_DEPTH)
    const hashedLeaf = utils.genStateTreeLeaf(
        id.secret,
        BigInt(attesterId),
        epoch,
        startBalance as any
    )
    stateTree.insert(hashedLeaf)
    const stateTreeProof = stateTree.createProof(0) // if there is only one GST leaf, the index is 0

    const circuitInputs = {
        identity_secret: id.secret,
        state_tree_indexes: stateTreeProof.pathIndices,
        state_tree_elements: stateTreeProof.siblings,
        data: startBalance,
        graffiti,
        epoch,
        nonce,
        attester_id: attesterId,
        prove_graffiti: proveGraffiti ? 1 : 0,
        min_rep: minRep,
        max_rep: maxRep,
        prove_max_rep: proveMaxRep ?? 0,
        prove_min_rep: proveMinRep ?? 0,
        prove_zero_rep: proveZeroRep ?? 0,
        reveal_nonce: revealNonce ?? 0,
        sig_data: sigData ?? 0,
        not_epoch_key: notEpochKey ?? 0,
        rep_nullifiers_amount: spentRep ?? 0,
        start_rep_nonce: repNonceStarter ?? 0,
    }
    return utils.stringifyBigInts(circuitInputs)
}

const genProofAndVerify = async (
    circuit: Circuit | string,
    circuitInputs: any
) => {
    const startTime = new Date().getTime()
    const { proof, publicSignals } =
        await defaultProver.genProofAndPublicSignals(circuit, circuitInputs)
    const endTime = new Date().getTime()
    console.log(
        `Gen Proof time: ${endTime - startTime} ms (${Math.floor(
            (endTime - startTime) / 1000
        )} s)`
    )
    const isValid = await defaultProver.verifyProof(
        circuit,
        publicSignals,
        proof
    )
    return { isValid, proof, publicSignals }
}

describe('Prove action in Unirep Social', function () {
    this.timeout(300000)

    it('should prove an epoch key', async () => {
        const id = new Identity()
        const epoch = 20
        const nonce = 2
        const attesterId = BigInt(219090124810)
        const epochKey = utils.genEpochKey(id.secret, attesterId, epoch, nonce)
        const circuitInputs = genCircuitInput({
            id,
            epoch,
            nonce,
            attesterId,
        })
        const { isValid, publicSignals, proof } = await genProofAndVerify(
            circuit,
            circuitInputs
        )
        expect(isValid).to.be.true

        const data = new ActionProof(publicSignals, proof)
        expect(data.epochKey.toString()).to.equal(epochKey.toString())
        expect(data.epoch.toString()).to.equal(epoch.toString())
        expect(data.nonce.toString()).to.equal('0')
        expect(data.revealNonce.toString()).to.equal('0')
        expect(data.attesterId.toString()).to.equal(attesterId.toString())
    })

    it('should prove an not epoch key', async () => {
        const id = new Identity()
        const epoch = 20
        const nonce = 2
        const attesterId = BigInt(219090124810)
        const epochKey = utils.genEpochKey(id.secret, attesterId, epoch, nonce)
        const id2 = new Identity()
        const notEpochKey = utils.genEpochKey(
            id2.secret,
            attesterId,
            epoch,
            nonce
        )
        const circuitInputs = genCircuitInput({
            id,
            epoch,
            nonce,
            attesterId,
            notEpochKey,
        })
        const { isValid, publicSignals, proof } = await genProofAndVerify(
            circuit,
            circuitInputs
        )
        expect(isValid).to.be.true

        const data = new ActionProof(publicSignals, proof)
        expect(data.epochKey.toString()).to.equal(epochKey.toString())
        expect(data.epoch.toString()).to.equal(epoch.toString())
        expect(data.nonce.toString()).to.equal('0')
        expect(data.revealNonce.toString()).to.equal('0')
        expect(data.attesterId.toString()).to.equal(attesterId.toString())
        expect(data.notEpochKey.toString()).to.equal(notEpochKey.toString())
    })

    it('should prove an epoch key nonce', async () => {
        const id = new Identity()
        const epoch = 20
        const attesterId = BigInt(219090124810)
        const revealNonce = 1
        for (let nonce = 0; nonce < NUM_EPOCH_KEY_NONCE_PER_EPOCH; nonce++) {
            const epochKey = utils.genEpochKey(
                id.secret,
                attesterId,
                epoch,
                nonce
            )
            const circuitInputs = genCircuitInput({
                id,
                epoch,
                nonce,
                attesterId,
                revealNonce,
            })
            const { isValid, publicSignals, proof } = await genProofAndVerify(
                circuit,
                circuitInputs
            )
            expect(isValid).to.be.true

            const data = new ActionProof(publicSignals, proof)
            expect(data.epochKey.toString()).to.equal(epochKey.toString())
            expect(data.epoch.toString()).to.equal(epoch.toString())
            expect(data.nonce.toString()).to.equal(nonce.toString())
            expect(data.revealNonce.toString()).to.equal(revealNonce.toString())
            expect(data.attesterId.toString()).to.equal(attesterId.toString())
        }
    })
    it('should prove minRep', async () => {
        const id = new Identity()
        const epoch = 20
        const nonce = 2
        const attesterId = BigInt(219090124810)
        const proveMinRep = 1
        const minRep = 10
        const circuitInputs = genCircuitInput({
            id,
            epoch,
            nonce,
            attesterId,
            sumField: [20, 9],
            proveMinRep,
            minRep,
        })
        const { isValid, publicSignals, proof } = await genProofAndVerify(
            circuit,
            circuitInputs
        )
        expect(isValid).to.be.true

        const data = new ActionProof(publicSignals, proof)
        expect(data.proveMinRep.toString()).to.equal(proveMinRep.toString())
        expect(data.minRep.toString()).to.equal(minRep.toString())
    })

    it('should fail to prove minRep if not qualified', async () => {
        const id = new Identity()
        const epoch = 20
        const nonce = 2
        const attesterId = BigInt(219090124810)
        const proveMinRep = 1
        const minRep = 10
        const circuitInputs = genCircuitInput({
            id,
            epoch,
            nonce,
            attesterId,
            sumField: [9, 20],
            proveMinRep,
            minRep,
        })
        await new Promise<void>((rs, rj) => {
            genProofAndVerify(circuit, circuitInputs)
                .then(() => rj())
                .catch(() => rs())
        })
    })

    it('should prove maxRep', async () => {
        const id = new Identity()
        const epoch = 20
        const nonce = 2
        const attesterId = BigInt(219090124810)
        const proveMaxRep = 1
        const maxRep = 10
        const circuitInputs = genCircuitInput({
            id,
            epoch,
            nonce,
            attesterId,
            sumField: [9, 20],
            proveMaxRep,
            maxRep,
        })
        const { isValid, publicSignals, proof } = await genProofAndVerify(
            circuit,
            circuitInputs
        )
        expect(isValid).to.be.true

        const data = new ActionProof(publicSignals, proof)
        expect(data.proveMaxRep.toString()).to.equal(proveMaxRep.toString())
        expect(data.maxRep.toString()).to.equal(maxRep.toString())
    })

    it('should fail to prove maxRep if not qualified', async () => {
        const id = new Identity()
        const epoch = 20
        const nonce = 2
        const attesterId = BigInt(219090124810)
        const proveMaxRep = 1
        const maxRep = 10
        const circuitInputs = genCircuitInput({
            id,
            epoch,
            nonce,
            attesterId,
            sumField: [20, 9],
            proveMaxRep,
            maxRep,
        })
        await new Promise<void>((rs, rj) => {
            genProofAndVerify(circuit, circuitInputs)
                .then(() => rj())
                .catch(() => rs())
        })
    })

    it('should prove zeroRep if not qualified', async () => {
        const id = new Identity()
        const epoch = 20
        const nonce = 2
        const attesterId = BigInt(219090124810)
        const proveZeroRep = 1
        const circuitInputs = genCircuitInput({
            id,
            epoch,
            nonce,
            attesterId,
            proveZeroRep,
        })
        const { isValid, publicSignals, proof } = await genProofAndVerify(
            circuit,
            circuitInputs
        )
        expect(isValid).to.be.true

        const data = new ActionProof(publicSignals, proof)
        expect(data.proveZeroRep.toString()).to.equal(proveZeroRep.toString())
    })

    it('should prove graffiti', async () => {
        const id = new Identity()
        const epoch = 20
        const nonce = 2
        const attesterId = BigInt(219090124810)
        const proveGraffiti = 1
        const graffiti = 123
        const circuitInputs = genCircuitInput({
            id,
            epoch,
            nonce,
            attesterId,
            replField: [graffiti],
            graffiti,
            proveGraffiti,
        })
        const { isValid, publicSignals, proof } = await genProofAndVerify(
            circuit,
            circuitInputs
        )
        expect(isValid).to.be.true

        const data = new ActionProof(publicSignals, proof)
        expect(data.proveGraffiti.toString()).to.equal(proveGraffiti.toString())
        expect(data.graffiti.toString()).to.equal(graffiti.toString())
    })

    it('should fail to prove graffiti', async () => {
        const id = new Identity()
        const epoch = 20
        const nonce = 2
        const attesterId = BigInt(219090124810)
        const proveGraffiti = 1
        const graffiti = 123
        const wrongGraffiti = BigInt(456) << BigInt(REPL_NONCE_BITS)
        const circuitInputs = genCircuitInput({
            id,
            epoch,
            nonce,
            attesterId,
            sumField: [9, 20],
            replField: [graffiti],
            graffiti: wrongGraffiti,
            proveGraffiti,
        })
        await new Promise<void>((rs, rj) => {
            genProofAndVerify(circuit, circuitInputs)
                .then(() => rj())
                .catch(() => rs())
        })
    })

    it('should spend reputation', async () => {
        const id = new Identity()
        const epoch = 20
        const nonce = 2
        const attesterId = BigInt(219090124810)
        const spentRep = 3
        const repNonceStarter = 1
        const circuitInputs = genCircuitInput({
            id,
            epoch,
            nonce,
            attesterId,
            sumField: [20, 9],
            spentRep,
            repNonceStarter,
        })
        const { isValid, publicSignals, proof } = await genProofAndVerify(
            circuit,
            circuitInputs
        )
        expect(isValid).to.be.true

        const data = new ActionProof(publicSignals, proof)
        for (let i = 0; i < spentRep; i++) {
            const repNonce = i + repNonceStarter
            const repNullifier = poseidon4([
                id.secret,
                epoch,
                repNonce,
                attesterId,
            ])
            expect(data.repNullifiers[i]).to.equal(repNullifier.toString())
        }
        for (let i = spentRep; i < REP_BUDGET; i++) {
            expect(data.repNullifiers[i]).to.equal('0')
        }
    })

    it('should fail to spend reputation if exceed limit', async () => {
        const id = new Identity()
        const epoch = 20
        const nonce = 2
        const attesterId = BigInt(219090124810)
        const spentRep = REP_BUDGET + 1
        const circuitInputs = genCircuitInput({
            id,
            epoch,
            nonce,
            attesterId,
            sumField: [20, 9],
            spentRep,
        })

        await new Promise<void>((rs, rj) => {
            genProofAndVerify(circuit, circuitInputs)
                .then(() => rj())
                .catch(() => rs())
        })
    })

    it('should fail to spend reputation if not enough rep', async () => {
        const id = new Identity()
        const epoch = 20
        const nonce = 2
        const attesterId = BigInt(219090124810)
        const spentRep = 5
        const circuitInputs = genCircuitInput({
            id,
            epoch,
            nonce,
            attesterId,
            sumField: [10, 9],
            spentRep,
        })

        await new Promise<void>((rs, rj) => {
            genProofAndVerify(circuit, circuitInputs)
                .then(() => rj())
                .catch(() => rs())
        })
    })

    it('should fail to spend reputation if rep is less than 0', async () => {
        const id = new Identity()
        const epoch = 20
        const nonce = 2
        const attesterId = BigInt(219090124810)
        const spentRep = 3
        const circuitInputs = genCircuitInput({
            id,
            epoch,
            nonce,
            attesterId,
            sumField: [9, 20],
            spentRep,
        })

        await new Promise<void>((rs, rj) => {
            genProofAndVerify(circuit, circuitInputs)
                .then(() => rj())
                .catch(() => rs())
        })
    })

    it('should fail to prove max rep if input is negative', async () => {
        const id = new Identity()
        const epoch = 20
        const nonce = 2
        const attesterId = BigInt(219090124810)
        const proveMaxRep = 1
        const maxRep = -20
        const circuitInputs = genCircuitInput({
            id,
            epoch,
            nonce,
            attesterId,
            sumField: [9, 20],
            maxRep,
            proveMaxRep,
        })

        await new Promise<void>((rs, rj) => {
            genProofAndVerify(circuit, circuitInputs)
                .then(() => rj())
                .catch(() => rs())
        })
    })

    it('should prove not_epoch_key', async () => {
        const id = new Identity()
        const epoch = 20
        const nonce = 2
        const attesterId = BigInt(219090124810)
        for (let i = 0; i < NUM_EPOCH_KEY_NONCE_PER_EPOCH; i++) {
            const notEpochKey = utils.genEpochKey(
                id.secret,
                attesterId,
                epoch,
                i
            )
            const circuitInputs = genCircuitInput({
                id,
                epoch,
                nonce,
                attesterId,
                sumField: [9, 20],
                notEpochKey,
            })

            await new Promise<void>((rs, rj) => {
                genProofAndVerify(circuit, circuitInputs)
                    .then(() => rj())
                    .catch(() => rs())
            })
        }
    })
})
