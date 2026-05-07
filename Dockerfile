# Red Dental - Node.js
FROM node:20-alpine AS backend

WORKDIR /app/backend
COPY backend/package*.json ./
RUN npm ci
COPY backend/tsconfig.json ./
COPY backend/prisma/ ./prisma/
RUN npx prisma generate
COPY backend/src/ ./src/
RUN npx tsc

# Frontend
FROM node:20-alpine AS frontend
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# Final
FROM node:20-alpine
WORKDIR /app
COPY --from=backend /app/backend/dist ./backend/dist
COPY --from=backend /app/backend/node_modules ./backend/node_modules
COPY --from=backend /app/backend/prisma ./backend/prisma
COPY --from=frontend /app/frontend/dist ./frontend/dist

EXPOSE 5000
CMD cd backend && npx prisma db push && node dist/server.js
