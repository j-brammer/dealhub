# Use when Docker build context is `backend/` (e.g. Northflank: context `/backend/`, Dockerfile `/backend/Dockerfile`).
FROM node:20-alpine
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY src ./src

ENV NODE_ENV=production
EXPOSE 8080

CMD ["node", "src/server.js"]
