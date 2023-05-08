# Install dependencies only when needed
FROM node:16.13.0-alpine AS deps
WORKDIR /app

# It needs this while runing locally. M1 Chip
RUN apk add --no-cache python3 g++ make

COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile

# Rebuild the source code only when needed
FROM node:16.13.0-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN yarn build

# Production image, copy all the files and run next
FROM node:16.13.0-alpine AS runner
WORKDIR /app

ENV NODE_ENV production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 NON_ROOT

COPY --from=builder --chown=NON_ROOT:nodejs /app/build ./build
COPY --from=builder --chown=NON_ROOT:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=NON_ROOT:nodejs /app/package.json ./package.json
COPY --from=deps /app/yarn.lock ./

USER NON_ROOT

CMD ["yarn", "start"]
