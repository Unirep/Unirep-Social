#!/bin/sh

mkdir build 2> /dev/null || true
cp -r node_modules/@unirep/circuits/zksnarkBuild ./keys
cp -r node_modules/@unirep/circuits/zksnarkBuild ./build/keys
