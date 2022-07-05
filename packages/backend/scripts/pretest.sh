#!/bin/sh

rm testdb.sqlite

GANACHE_NAME=unirep_ganache_test
TEST_ACCOUNT_1_KEY=0x0000000000000000000000000000000000000000000000000000000000000001

docker stop $GANACHE_NAME 2> /dev/null
docker rm $GANACHE_NAME 2> /dev/null

set -e

docker run -d --name $GANACHE_NAME -p 18545:8545 trufflesuite/ganache-cli:v6.12.2 \
  --account $TEST_ACCOUNT_1_KEY,10000000000000000000000000000 \
  --gasLimit 10000000
