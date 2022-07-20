#!/bin/sh

set -e

# Pass an argument to this script that is the unirep monorepo directory
# this argument must be absolute
# e.g. yarn linkUnirep $(pwd)/../unirep

rm -rf packages/backend/node_modules/@unirep/core
rm -rf packages/backend/node_modules/@unirep/contracts
rm -rf packages/backend/node_modules/@unirep/crypto
rm -rf packages/backend/node_modules/@unirep/circuits
ln -s $1/packages/core $(pwd)/packages/backend/node_modules/@unirep/core
ln -s $1/packages/contracts $(pwd)/packages/backend/node_modules/@unirep/contracts
ln -s $1/packages/crypto $(pwd)/packages/backend/node_modules/@unirep/crypto
ln -s $1/packages/circuits $(pwd)/packages/backend/node_modules/@unirep/circuits

rm -rf packages/frontend/node_modules/@unirep/core
rm -rf packages/frontend/node_modules/@unirep/contracts
rm -rf packages/frontend/node_modules/@unirep/crypto
rm -rf packages/frontend/node_modules/@unirep/circuits
ln -s $1/packages/core $(pwd)/packages/frontend/node_modules/@unirep/core
ln -s $1/packages/contracts $(pwd)/packages/frontend/node_modules/@unirep/contracts
ln -s $1/packages/crypto $(pwd)/packages/frontend/node_modules/@unirep/crypto
ln -s $1/packages/circuits $(pwd)/packages/frontend/node_modules/@unirep/circuits

rm -rf packages/core/node_modules/@unirep/core
rm -rf packages/core/node_modules/@unirep/contracts
rm -rf packages/core/node_modules/@unirep/crypto
rm -rf packages/core/node_modules/@unirep/circuits
ln -s $1/packages/core $(pwd)/packages/core/node_modules/@unirep/core
ln -s $1/packages/contracts $(pwd)/packages/core/node_modules/@unirep/contracts
ln -s $1/packages/crypto $(pwd)/packages/core/node_modules/@unirep/crypto
ln -s $1/packages/circuits $(pwd)/packages/core/node_modules/@unirep/circuits
