# Install dependencies only when needed
FROM node:22-alpine AS deps
WORKDIR /app

COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile

# Rebuild the source code only when needed
FROM node:22-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN yarn build

# Production image, copy all the files and run
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

RUN addgroup -S nodejs && adduser -S -G nodejs nonroot

COPY --from=builder --chown=nonroot:nodejs /app/build ./build
COPY --from=builder --chown=nonroot:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nonroot:nodejs /app/package.json ./package.json
COPY --from=builder --chown=nonroot:nodejs /app/src/db/migrations ./build/db/migrations
COPY --from=deps /app/yarn.lock ./

USER nonroot

CMD ["yarn", "start"]
