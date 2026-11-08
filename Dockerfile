# syntax=docker/dockerfile:1.7

############################
# Builder: bot and web page
############################
FROM node:24-trixie AS builder
WORKDIR /app

COPY package.json package-lock.json ./
COPY prisma ./prisma
COPY prisma.config.ts ./
RUN --mount=type=cache,id=npm,target=/root/.npm npm ci --no-audit --no-fund

COPY web/package.json web/package-lock.json ./web/
RUN --mount=type=cache,id=npm,target=/root/.npm cd web && npm ci --no-audit --no-fund

COPY . .
RUN npm run build && cd web && npm run build

# Runtime dependencies only (the Prisma CLI is one: it applies migrations).
RUN npm prune --omit=dev --no-audit --no-fund && mkdir -p /runtime-data

############################
# Minimal runtime image
############################
FROM gcr.io/distroless/nodejs24-debian13:nonroot AS runner
WORKDIR /app

ENV NODE_ENV=production \
  SOCKET_HOST=0.0.0.0 \
  SOCKET_PORT=3000 \
  DATABASE_URL=file:/data/data.db

# Same uid as the owner of the data folder on the server.
USER 1001:1001

COPY --from=builder --chown=1001:1001 /runtime-data /data
COPY --from=builder /app/package.json /app/prisma.config.ts ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/ops ./ops
COPY --from=builder /app/assets ./assets
COPY --from=builder /app/web/dist ./web/dist
COPY --from=builder /app/web/src/assets/emojis ./web/src/assets/emojis

EXPOSE 3000
CMD ["/app/ops/start.js"]
