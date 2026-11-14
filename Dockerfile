FROM node:24-bookworm-slim AS web
WORKDIR /web
COPY frontend/web/package.json frontend/web/package-lock.json ./
RUN npm ci --ignore-scripts
COPY frontend/web/ ./
ENV VITE_API_BASE_URL=/api
RUN npm run build

FROM node:24-bookworm-slim AS backend
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends openssl && rm -rf /var/lib/apt/lists/*
COPY backend/package.json backend/package-lock.json ./
RUN npm ci --ignore-scripts
COPY backend/ ./
ENV CHECKPOINT_DISABLE=1
RUN DATABASE_URL='sqlserver://localhost:1433;database=build;user=build;password=BuildOnly_123;encrypt=true;trustServerCertificate=true' node node_modules/prisma/build/index.js generate && npm run build

FROM node:24-bookworm-slim
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends openssl && rm -rf /var/lib/apt/lists/*
COPY --from=backend --chown=node:node /app/node_modules ./node_modules
COPY --from=backend --chown=node:node /app/dist ./dist
COPY --from=backend --chown=node:node /app/prisma ./prisma
COPY --from=backend --chown=node:node /app/prisma.config.ts ./prisma.config.ts
COPY --from=backend --chown=node:node /app/scripts ./scripts
COPY --from=backend --chown=node:node /app/public ./public
COPY --from=web --chown=node:node /web/dist ./public/web
ENV NODE_ENV=production CHECKPOINT_DISABLE=1 WEB_DIST_DIR=/app/public/web HOST=0.0.0.0
USER node
EXPOSE 3000
CMD ["node", "scripts/start-release.cjs"]
