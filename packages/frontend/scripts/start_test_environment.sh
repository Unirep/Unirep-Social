#!/bin/sh

yarn build:e2e

IMAGE=$(docker build . -q)

NAME=unirep-social-e2e-server
HARDHAT_NAME=unirep-hardhat-e2e-test

docker kill $NAME

docker stop $HARDHAT_NAME 2> /dev/null
docker rm $HARDHAT_NAME 2> /dev/null

TEST_ACCOUNT_1_KEY=0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80

set -e

docker run --rm -d -p 3000:3000 --name=$NAME $IMAGE
docker run -d --name $HARDHAT_NAME -p 18545:8545 vivi432/hardhat:latest

while ! nc -z 127.0.0.1 3000; do
  sleep 0.1
done
while ! nc -z 127.0.0.1 18545; do
  sleep 0.1
done