# syntax=docker/dockerfile:1

# ---------- deps ----------
FROM oven/bun:1.3-alpine AS deps
WORKDIR /app

COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

# ---------- runner ----------
FROM oven/bun:1.3-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

RUN apk add --no-cache tini

RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 hans \
  && chown -R hans:nodejs /app

COPY --from=deps --chown=hans:nodejs /app/node_modules ./node_modules
COPY --chown=hans:nodejs package.json ./
COPY --chown=hans:nodejs src ./src
COPY --chown=hans:nodejs tsconfig.json ./
COPY --chown=hans:nodejs infrastructure/docker/entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

USER hans

ENTRYPOINT ["/sbin/tini", "--", "/usr/local/bin/docker-entrypoint.sh"]
CMD ["bun", "run", "src/index.ts"]
