# syntax=docker/dockerfile:1

FROM node:22-alpine

RUN apk add --no-cache git

WORKDIR /app

COPY package.json ./

RUN corepack enable && npm install

COPY tsconfig.json ./
COPY src ./src

RUN npx tsc -p tsconfig.json

ENV NODE_ENV=production

EXPOSE 8787

CMD ["node", "--enable-source-maps", "dist/server.js"]
