# syntax=docker.io/docker/dockerfile:1

# 1. Install Dependencies
FROM node:20-alpine AS deps
WORKDIR /app
RUN apk add --no-cache libc6-compat openssl
COPY package.json package-lock.json* ./
RUN npm ci

# 2. Build the App
FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# 3. Production Image
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV DATABASE_URL="file:/app/prisma/dev.db"

RUN apk add --no-cache openssl

# --- CHANGE: Don't create new users, use the existing 'node' user ---
# The 'node' user exists by default in this image with UID 1000.
# This aligns perfectly with the standard UID 1000 on your host machine.

# Copy assets
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/server.js ./server.js
COPY --from=builder /app/prisma ./prisma

# --- CHANGE: Correct Ownership ---
# We transfer ownership to 'node' (UID 1000)
RUN chown -R node:node /app

# Switch to the 'node' user
USER node

EXPOSE 3000
ENV PORT=3000

CMD ["sh", "-c", "npx prisma migrate deploy && node server.js"]