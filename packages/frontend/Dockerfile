FROM alpine:latest

RUN apk add --no-cache git nodejs npm && \
    npm install -g yarn

COPY . /src
WORKDIR /src

RUN rm package.json && npm i express

CMD ["node", "/src/server.js"]
