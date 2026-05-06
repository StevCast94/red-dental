# Use Node 20
FROM node:20-slim AS build

WORKDIR /app

# Install build deps
COPY package.json .nvmrc ./
COPY backend/package.json backend/package-lock.json ./backend/
COPY frontend/package.json frontend/package-lock.json ./frontend/

RUN cd backend && npm install
RUN cd frontend && npm install

# Copy source
COPY . .

# Build frontend
RUN cd frontend && npm run build

# Build backend
RUN cd backend && npm run build

# Production stage
FROM node:20-slim
WORKDIR /app

COPY --from=build /app/backend /app/backend
COPY --from=build /app/frontend/dist /app/frontend/dist
COPY --from=build /app/start.js /app/start.js
COPY --from=build /app/package.json /app/package.json

EXPOSE 5000

# Switch schema and start
CMD ["node", "start.js"]
