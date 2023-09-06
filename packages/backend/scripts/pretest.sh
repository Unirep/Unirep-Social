#!/bin/sh

rm testdb.sqlite

HARDHAT_NAME=unirep_hardhat_test
TEST_ACCOUNT_1_KEY=0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80

docker stop $HARDHAT_NAME 2> /dev/null
docker rm $HARDHAT_NAME 2> /dev/null

set -e

docker run -d --name $HARDHAT_NAME -p 18545:8545 vivi432/hardhat:latest
