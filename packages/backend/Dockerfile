FROM alpine:3.15

RUN apk add --no-cache git nodejs npm && \
    npm install -g yarn

COPY . /src
WORKDIR /src

RUN yarn && yarn keys

CMD ["yarn", "start:daemon"]
