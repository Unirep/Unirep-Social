#!/bin/bash

set -e

cd "$(dirname "$0")"
cd ..
mkdir -p build

NODE_OPTIONS=--max-old-space-size=8192 npx ts-node scripts/buildSnarks.ts -i circuits/test/proveReputationFromAttester_test.circom -j build/proveReputationFromAttesterCircuit.r1cs -w build/proveReputationFromAttester.wasm -y build/proveReputationFromAttester.sym -s build/ReputationFromAttesterVerifier.sol -pt build/powersOfTau28_hez_final_17.ptau -zk build/proveReputationFromAttester.zkey -vs ReputationFromAttesterVerifier

echo 'Copying ReputationVerifier.sol to contracts/'
cp ./build/ReputationFromAttesterVerifier.sol ./contracts/