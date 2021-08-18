#!/bin/bash

set -e

cd "$(dirname "$0")"
cd ..
mkdir -p build

<<<<<<< HEAD
NODE_OPTIONS=--max-old-space-size=8192 npx ts-node scripts/buildSnarks.ts -i circuits/test/verifyEpochKey_test.circom -j build/verifyEpochKeyCircuit.r1cs -w build/verifyEpochKey.wasm -y build/verifyEpochKey.sym -p build/verifyEpochKeyPk.json -v build/verifyEpochKeyVk.json -s build/EpochKeyValidityVerifier.sol -vs EpochKeyValidityVerifier -pr build/verifyEpochKey.params
=======
NODE_OPTIONS=--max-old-space-size=8192 npx ts-node scripts/buildSnarks.ts -i circuits/test/verifyEpochKey_test.circom -j build/verifyEpochKeyCircuit.r1cs -w build/verifyEpochKey.wasm -y build/verifyEpochKey.sym -s build/EpochKeyValidityVerifier.sol -pt build/powersOfTau28_hez_final_17.ptau -zk build/verifyEpochKey.zkey -vs EpochKeyValidityVerifier
>>>>>>> 58e0402c34216380aade2635e0f8ff1a0271867f

echo 'Copying EpochKeyValidityVerifier.sol to contracts/'
cp ./build/EpochKeyValidityVerifier.sol ./contracts/