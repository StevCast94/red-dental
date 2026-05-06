# Use Node 20
FROM node:20-slim AS build

WORKDIR /app

# Copy dependency files
COPY package.json .nvmrc ./
COPY backend/package.json backend/package-lock.json ./backend/
COPY frontend/package.json frontend/package-lock.json ./frontend/

# Install dependencies
RUN npm ci --prefix backend
RUN npm ci --prefix frontend

# Copy source code
COPY . .

# Build frontend
RUN npm run build --prefix frontend

# Build backend
RUN npm run build --prefix backend

# Production stage
FROM node:20-slim

WORKDIR /app

# Copy built artifacts
COPY --from=build /app/backend /app/backend
COPY --from=build /app/frontend/dist /app/frontend/dist
COPY --from=build /app/start.js /app/start.js
COPY --from=build /app/package.json /app/package.json
COPY --from=build /app/railway.json /app/railway.json

EXPOSE 5000

CMD ["node", "start.js"]
