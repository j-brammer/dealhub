# Single image for this service. Build context must be the REPOSITORY ROOT (`.` or `/`),
# not `backend/` alone — paths below are `backend/...` from that root.
#
# Northflank: Advanced build → Build context `/` (or empty = repo root),
#             Dockerfile location `/backend/Dockerfile`.
#
# Local:     docker build -f backend/Dockerfile .
FROM node:20-alpine
WORKDIR /app

COPY backend/package.json backend/package-lock.json ./
RUN npm ci --omit=dev

COPY backend/src ./src

ENV NODE_ENV=production
EXPOSE 8080

CMD ["node", "src/server.js"]
