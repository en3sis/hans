# syntax=docker/dockerfile:1

# ---------- deps ----------
FROM node:22-alpine AS deps
WORKDIR /app

COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile --production=false

# ---------- builder ----------
FROM node:22-alpine AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN yarn build \
  && yarn install --frozen-lockfile --production=true \
  && yarn cache clean

# ---------- runner ----------
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

RUN apk add --no-cache tini

RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 hans \
  && chown -R hans:nodejs /app

COPY --from=builder --chown=hans:nodejs /app/build ./build
COPY --from=builder --chown=hans:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=hans:nodejs /app/package.json ./package.json
COPY --chown=hans:nodejs infrastructure/docker/entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

USER hans

ENTRYPOINT ["/sbin/tini", "--", "/usr/local/bin/docker-entrypoint.sh"]
CMD ["node", "build/index.js"]
