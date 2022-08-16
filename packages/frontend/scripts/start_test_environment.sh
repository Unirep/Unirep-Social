#!/bin/sh

yarn build:e2e

IMAGE=$(docker build . -q)

NAME=unirep-social-e2e-server

docker kill $NAME

set -e

docker run --rm -d -p 3000:3000 --name=$NAME $IMAGE

while ! nc -z localhost 3000; do
  sleep 0.1
done
