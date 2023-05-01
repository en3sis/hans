# Install dependencies only when needed
FROM node:16.13.0-alpine AS deps
WORKDIR /app

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

# Copy the .env file to the working directory
COPY .env .

# Set build-time arguments for the environment file
ARG ENV_FILE
ENV ENV_FILE=${ENV_FILE:-.env}

# Load environment variables from the .env file
RUN set -o allexport; source $ENV_FILE; set +o allexport

USER NON_ROOT

CMD ["yarn", "start"]
