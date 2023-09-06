FROM node:16-buster

COPY . /src

WORKDIR /src

RUN rm -rf packages/frontend && yarn && yarn build

RUN rm -rf /src/node_modules/@unirep/circuits/zksnarkBuild
RUN rm -rf /src/node_modules/@unirep/circuits/*.ptau

FROM node:16-buster

COPY --from=0 /src /src
WORKDIR /src/packages/backend

CMD ["npm", "start"]


