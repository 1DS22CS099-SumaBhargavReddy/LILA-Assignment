FROM node:18-alpine AS builder

# Install git for GitHub dependencies
RUN apk add --no-cache git

WORKDIR /backend

COPY package.json .
RUN npm install

COPY tsconfig.json .
COPY src/ src/
RUN npx tsc

FROM registry.heroiclabs.com/heroiclabs/nakama:3.22.0

COPY --from=builder /backend/build/*.js /nakama/data/modules/
COPY local.yml /nakama/data/local.yml
