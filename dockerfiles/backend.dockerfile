FROM alpine:3.15

RUN apk add --no-cache git nodejs npm python3 make && \
    npm install -g yarn

COPY . /src
WORKDIR /src

RUN yarn && yarn build
RUN rm /src/packages/circuits/zksnarkBuild/powersOfTau28_hez_final_18.ptau
RUN rm -rf /src/packages/frontend
WORKDIR /src/packages/backend

CMD ["yarn", "start"]


