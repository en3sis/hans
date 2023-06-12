# Install dependencies only when needed
FROM node:18-alpine AS deps
WORKDIR /app

ARG M1=false

# Install python3, g++ and make for building native dependencies if you're running on MacOS with M1 chip, run the command as docker build --build-arg M1=true -t hans:test .
RUN if [ "$M1" = "true" ] ; then \
  apk add --no-cache python3 g++ make \
; fi

COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile

# Rebuild the source code only when needed
FROM node:18-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN yarn build

# Production image, copy all the files and run next
FROM node:18-alpine AS runner
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
