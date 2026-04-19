# Build with repository root as context (Northflank: build context `/`, Dockerfile `/Dockerfile`).
# For context `backend/` only, use Dockerfile path `/backend/Dockerfile` instead.
FROM node:20-alpine
WORKDIR /app

COPY backend/package.json backend/package-lock.json ./
RUN npm ci --omit=dev

COPY backend/src ./src

ENV NODE_ENV=production
EXPOSE 8080

CMD ["node", "src/server.js"]
