#!/bin/sh

yarn build:e2e

IMAGE=$(docker build . -q)

NAME=unirep-social-e2e-server
GANACHE_NAME=unirep-ganache-e2e-test

docker kill $NAME

docker stop $GANACHE_NAME 2> /dev/null
docker rm $GANACHE_NAME 2> /dev/null

TEST_ACCOUNT_1_KEY=0x0000000000000000000000000000000000000000000000000000000000000001

set -e

docker run --rm -d -p 3000:3000 --name=$NAME $IMAGE
docker run -d --name $GANACHE_NAME -p 18545:8545 trufflesuite/ganache-cli:v6.12.2 \
  --account $TEST_ACCOUNT_1_KEY,10000000000000000000000000000 \
  --gasLimit 10000000

while ! nc -z localhost 3000; do
  sleep 0.1
done
while ! nc -z localhost 18545; do
  sleep 0.1
done