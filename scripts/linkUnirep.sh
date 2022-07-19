#!/bin/sh

set -e

# Pass an argument to this script that is the unirep monorepo directory
# this argument must be absolute
# e.g. yarn linkUnirep $(pwd)/../unirep

rm -rf packages/backend/node_modules/@unirep/core
rm -rf packages/backend/node_modules/@unirep/contracts
rm -rf packages/backend/node_modules/@unirep/crypto
rm -rf packages/backend/node_modules/@unirep/circuits
ln -s $1/packages/core/build $(pwd)/packages/backend/node_modules/@unirep/core
ln -s $1/packages/contracts/build $(pwd)/packages/backend/node_modules/@unirep/contracts
ln -s $1/packages/crypto/build $(pwd)/packages/backend/node_modules/@unirep/crypto
ln -s $1/packages/circuits/dist $(pwd)/packages/backend/node_modules/@unirep/circuits

rm -rf packages/frontend/node_modules/@unirep/core
rm -rf packages/frontend/node_modules/@unirep/contracts
rm -rf packages/frontend/node_modules/@unirep/crypto
rm -rf packages/frontend/node_modules/@unirep/circuits
ln -s $1/packages/core/build $(pwd)/packages/frontend/node_modules/@unirep/core
ln -s $1/packages/contracts/build $(pwd)/packages/frontend/node_modules/@unirep/contracts
ln -s $1/packages/crypto/build $(pwd)/packages/frontend/node_modules/@unirep/crypto
ln -s $1/packages/circuits/dist $(pwd)/packages/frontend/node_modules/@unirep/circuits

rm -rf packages/core/node_modules/@unirep/core
rm -rf packages/core/node_modules/@unirep/contracts
rm -rf packages/core/node_modules/@unirep/crypto
rm -rf packages/core/node_modules/@unirep/circuits
ln -s $1/packages/core/build $(pwd)/packages/core/node_modules/@unirep/core
ln -s $1/packages/contracts/build $(pwd)/packages/core/node_modules/@unirep/contracts
ln -s $1/packages/crypto/build $(pwd)/packages/core/node_modules/@unirep/crypto
ln -s $1/packages/circuits/dist $(pwd)/packages/core/node_modules/@unirep/circuits

rm -rf packages/circuits/node_modules/@unirep/crypto
rm -rf packages/circuits/node_modules/@unirep/circuits
ln -s $1/packages/crypto/build $(pwd)/packages/circuits/node_modules/@unirep/crypto
ln -s $1/packages/circuits/dist $(pwd)/packages/circuits/node_modules/@unirep/circuits
