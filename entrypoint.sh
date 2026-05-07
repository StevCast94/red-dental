#!/bin/sh
# Entrypoint para Railway
set -e

echo "🚀 Cambiando a backend..."
cd backend

echo "🚀 Ejecutando prisma db push..."
npx prisma db push --accept-data-loss 2>&1

echo "🚀 Verificando Super Admin..."
node create-admin.js 2>&1

echo "🚀 Iniciando servidor..."
node dist/server.js
