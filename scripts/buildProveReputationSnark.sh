#!/bin/bash

set -e

cd "$(dirname "$0")"
cd ..
mkdir -p build

<<<<<<< HEAD
NODE_OPTIONS=--max-old-space-size=8192 npx ts-node scripts/buildSnarks.ts -i circuits/test/proveReputation_test.circom -j build/proveReputationCircuit.r1cs -w build/proveReputation.wasm -y build/proveReputation.sym -p build/proveReputationPk.json -v build/proveReputationVk.json -s build/ReputationVerifier.sol -vs ReputationVerifier -pr build/proveReputation.params -r
=======
NODE_OPTIONS=--max-old-space-size=8192 npx ts-node scripts/buildSnarks.ts -i circuits/test/proveReputation_test.circom -j build/proveReputationCircuit.r1cs -w build/proveReputation.wasm -y build/proveReputation.sym -s build/ReputationVerifier.sol -pt build/powersOfTau28_hez_final_17.ptau -zk build/proveReputation.zkey -vs ReputationVerifier
>>>>>>> 58e0402c34216380aade2635e0f8ff1a0271867f

echo 'Copying ReputationVerifier.sol to contracts/'
cp ./build/ReputationVerifier.sol ./contracts/