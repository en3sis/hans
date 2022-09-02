# Install dependencies only when needed
FROM node:16.13.0-alpine AS deps
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm instal

# Rebuild the source code only when needed
FROM node:16.13.0-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN npm install
RUN npm run build

# Production image, copy all the files and run next
FROM node:16.13.0-alpine AS runner
WORKDIR /app

ENV NODE_ENV production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 NON_ROOT

COPY --from=builder --chown=NON_ROOT:nodejs /app/build ./build
COPY --from=builder --chown=NON_ROOT:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=NON_ROOT:nodejs /app/package.json ./package.json
COPY --from=builder --chown=NON_ROOT:nodejs /app/package-lock.json ./package-lock.json

USER NON_ROOT

CMD ["npm", "start"]
