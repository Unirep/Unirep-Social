#!/bin/sh

set -e

snarkjs zkey export solidityverifier node_modules/@unirep-social/circuits/zksnarkBuild/proveNegativeReputation.zkey contracts/NegativeRepVerifier.sol
snarkjs zkey export solidityverifier node_modules/@unirep-social/circuits/zksnarkBuild/proveSubsidyKey.zkey contracts/SubsidyKeyVerifier.sol
