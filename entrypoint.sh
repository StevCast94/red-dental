#!/bin/sh
# Entrypoint para Railway: migra DB y arranca servidor
set -e

echo "🚀 Ejecutando prisma db push..."
cd backend
npx prisma db push --accept-data-loss 2>&1 || echo "⚠️ prisma db push falló, continuando..."
cd ..

echo "🚀 Iniciando servidor..."
node backend/dist/server.js
