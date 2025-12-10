# Install dependencies only when needed
FROM oven/bun:1 AS deps
WORKDIR /app

COPY package.json bun.lockb* yarn.lock* ./
RUN bun install --frozen-lockfile

# Rebuild the source code only when needed
FROM oven/bun:1 AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN bun run build

# Production image, copy all the files and run
FROM oven/bun:1 AS runner
WORKDIR /app

ENV NODE_ENV=production

RUN addgroup --system nodejs && adduser --system --ingroup nodejs nonroot

COPY --from=builder --chown=nonroot:nodejs /app/build ./build
COPY --from=builder --chown=nonroot:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nonroot:nodejs /app/package.json ./package.json
COPY --from=builder --chown=nonroot:nodejs /app/src/db/migrations ./build/db/migrations

USER nonroot

# Expose both Discord bot (no port) and API server
EXPOSE 3009

CMD ["bun", "run", "start"]
