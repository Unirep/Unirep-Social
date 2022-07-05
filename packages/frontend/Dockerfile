FROM alpine:latest

RUN apk add --no-cache git nodejs npm && \
    npm install -g yarn

COPY . /src
WORKDIR /src

RUN yarn && yarn build --mode=production && cp -r public/build build && rm -rf node_modules

CMD ["node", "/src/server.js"]
