import {
    UserState as _UserState,
    UnirepState as _UnirepState,
    IEpochTreeLeaf,
    IAttestation,
    Attestation,
    IUserStateLeaf,
    Reputation,
    genEpochKey,
} from '@unirep/unirep'
import {
    stringifyBigInts,
    unstringifyBigInts,
    unSerialiseIdentity,
    serialiseIdentity,
} from '@unirep/crypto'

// TODO: merge this into the unirep package
// more info here: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/JSON/stringify#tojson_behavior

export class UnirepState extends _UnirepState {
    toJSON = (space = 0): string => {
        const epochKeys = this.getEpochKeys(this.currentEpoch)
        const attestationsMapToString: { [key: string]: string[] } = {}
        for (const key of epochKeys) {
            attestationsMapToString[key] = (
                this as any
            ).epochKeyToAttestationsMap[key].map((n: any) => n.toJSON())
        }
        const epochTreeLeavesToString = {} as any
        for (let index in (this as any).epochTreeLeaves) {
            epochTreeLeavesToString[index] = (this as any).epochTreeLeaves[
                index
            ].map(
                (l: any) =>
                    `${l.epochKey.toString()}: ${l.hashchainResult.toString()}`
            )
        }
        return {
            settings: {
                globalStateTreeDepth: this.setting.globalStateTreeDepth,
                userStateTreeDepth: this.setting.userStateTreeDepth,
                epochTreeDepth: this.setting.epochTreeDepth,
                attestingFee: this.setting.attestingFee.toString(),
                epochLength: this.setting.epochLength,
                numEpochKeyNoncePerEpoch: this.setting.numEpochKeyNoncePerEpoch,
                maxReputationBudget: this.setting.maxReputationBudget,
                defaultGSTLeaf: (this as any).defaultGSTLeaf.toString(),
            },
            currentEpoch: this.currentEpoch,
            latestProcessedBlock: this.latestProcessedBlock,
            GSTLeaves: stringifyBigInts((this as any).GSTLeaves),
            epochTreeLeaves: Object(epochTreeLeavesToString),
            latestEpochKeyToAttestationsMap: attestationsMapToString,
            nullifiers: Object.keys((this as any).nullifiers),
        } as unknown as string
    }
    static fromJSON(data: string) {
        const _unirepState = typeof data === 'string' ? JSON.parse(data) : data
        const parsedGSTLeaves = {} as any
        const parsedEpochTreeLeaves = {} as any
        const parsedNullifiers = {} as any
        const parsedAttestationsMap = {} as any

        for (let key in _unirepState.GSTLeaves) {
            parsedGSTLeaves[key] = unstringifyBigInts(
                _unirepState.GSTLeaves[key]
            )
        }

        for (let key in _unirepState.epochTreeLeaves) {
            const leaves: IEpochTreeLeaf[] = []
            _unirepState.epochTreeLeaves[key].map((n: any) => {
                const splitStr = n.split(': ')
                const epochTreeLeaf: IEpochTreeLeaf = {
                    epochKey: BigInt(splitStr[0]),
                    hashchainResult: BigInt(splitStr[1]),
                }
                leaves.push(epochTreeLeaf)
            })
            parsedEpochTreeLeaves[key] = leaves
        }

        for (let n of _unirepState.nullifiers) {
            parsedNullifiers[n] = true
        }

        for (let key in _unirepState.latestEpochKeyToAttestationsMap) {
            const parsedAttestations: IAttestation[] = []
            for (const attestation of _unirepState
                .latestEpochKeyToAttestationsMap[key]) {
                const jsonAttestation = JSON.parse(attestation)
                const attestClass = new Attestation(
                    BigInt(jsonAttestation.attesterId),
                    BigInt(jsonAttestation.posRep),
                    BigInt(jsonAttestation.negRep),
                    BigInt(jsonAttestation.graffiti),
                    BigInt(jsonAttestation.signUp)
                )
                parsedAttestations.push(attestClass)
            }
            parsedAttestationsMap[key] = parsedAttestations
        }
        const unirepState = new this(
            _unirepState.settings,
            _unirepState.currentEpoch,
            _unirepState.latestProcessedBlock,
            parsedGSTLeaves,
            parsedEpochTreeLeaves,
            parsedAttestationsMap,
            parsedNullifiers
        )

        return unirepState
    }
}

export class UserState extends _UserState {
    toJSON = (space: any): string => {
        const userStateLeavesMapToString: { [key: string]: string } = {}
        for (const l of (this as any).latestUserStateLeaves) {
            userStateLeavesMapToString[l.attesterId.toString()] =
                l.reputation.toJSON()
        }
        const transitionedFromAttestationsToString: {
            [key: string]: string[]
        } = {}
        const epoch = this.latestTransitionedEpoch
        for (
            let nonce = 0;
            nonce < (this as any).unirepState.setting.numEpochKeyNoncePerEpoch;
            nonce++
        ) {
            const epk = genEpochKey(
                this.id.identityNullifier,
                epoch,
                nonce
            ).toString()
            const attestations = (this as any).transitionedFromAttestations[epk]
            if (attestations !== undefined)
                transitionedFromAttestationsToString[epk] = attestations.map(
                    (a: any) => a.toJSON()
                )
        }
        return {
            idNullifier: this.id.identityNullifier.toString(),
            idCommitment: this.commitment.toString(),
            hasSignedUp: (this as any).hasSignedUp,
            latestTransitionedEpoch: this.latestTransitionedEpoch,
            latestGSTLeafIndex: this.latestGSTLeafIndex,
            latestUserStateLeaves: userStateLeavesMapToString,
            transitionedFromAttestations: transitionedFromAttestationsToString,
            unirepState: (this as any).unirepState,
        } as unknown as string
    }
    static fromJSON(identity: string, data: string | any) {
        const _userState = typeof data === 'string' ? JSON.parse(data) : data
        const unirepState = UnirepState.fromJSON(_userState.unirepState)
        const userStateLeaves: IUserStateLeaf[] = []
        const transitionedFromAttestations: { [key: string]: IAttestation[] } =
            {}
        for (const key in _userState.latestUserStateLeaves) {
            const parsedLeaf = JSON.parse(_userState.latestUserStateLeaves[key])
            const leaf: IUserStateLeaf = {
                attesterId: BigInt(key),
                reputation: new Reputation(
                    BigInt(parsedLeaf.posRep),
                    BigInt(parsedLeaf.negRep),
                    BigInt(parsedLeaf.graffiti),
                    BigInt(parsedLeaf.signUp)
                ),
            }
            userStateLeaves.push(leaf)
        }
        for (const key in _userState.transitionedFromAttestations) {
            transitionedFromAttestations[key] = []
            for (const attest of _userState.transitionedFromAttestations[key]) {
                const parsedAttest = JSON.parse(attest)
                const attestation: IAttestation = new Attestation(
                    BigInt(parsedAttest.attesterId),
                    BigInt(parsedAttest.posRep),
                    BigInt(parsedAttest.negRep),
                    BigInt(parsedAttest.graffiti),
                    BigInt(parsedAttest.signUp)
                )
                transitionedFromAttestations[key].push(attestation)
            }
        }
        const userState = new this(
            unirepState,
            unSerialiseIdentity(identity),
            _userState.hasSignedUp,
            _userState.latestTransitionedEpoch,
            _userState.latestGSTLeafIndex,
            userStateLeaves,
            transitionedFromAttestations
        )
        return userState
    }
}
