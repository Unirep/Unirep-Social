#!/bin/bash

set -e

cd "$(dirname "$0")"
cd ..
mkdir -p build

<<<<<<< HEAD
NODE_OPTIONS=--max-old-space-size=8192 npx ts-node scripts/buildSnarks.ts -i circuits/test/userStateTransition_test.circom -j build/userStateTransitionCircuit.r1cs -w build/userStateTransition.wasm -y build/userStateTransition.sym -p build/userStateTransitionPk.json -v build/userStateTransitionVk.json -s build/UserStateTransitionVerifier.sol -vs UserStateTransitionVerifier -pr build/userStateTransition.params -r
=======
NODE_OPTIONS=--max-old-space-size=8192 npx ts-node scripts/buildSnarks.ts -i circuits/test/userStateTransition_test.circom -j build/userStateTransitionCircuit.r1cs -w build/userStateTransition.wasm -y build/userStateTransition.sym -s build/UserStateTransitionVerifier.sol -pt build/powersOfTau28_hez_final_17.ptau -zk build/userStateTransition.zkey -vs UserStateTransitionVerifier
>>>>>>> 58e0402c34216380aade2635e0f8ff1a0271867f

echo 'Copying UserStateTransitionVerifier.sol to contracts/'
cp ./build/UserStateTransitionVerifier.sol ./contracts/