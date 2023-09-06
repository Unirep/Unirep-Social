#!/bin/sh

rm -rf ./dist/zksnarkBuild

cp -r ../../node_modules/@unirep/circuits/zksnarkBuild/. ./zksnarkBuild
cp -rf ./zksnarkBuild ./dist/zksnarkBuild