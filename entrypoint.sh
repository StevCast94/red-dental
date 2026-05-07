#!/bin/sh
# Entrypoint para Railway: migra DB, crea admin si no existe, arranca servidor
set -e

echo "🚀 Ejecutando prisma db push..."
npx prisma db push --schema=backend/prisma/schema.prisma --accept-data-loss 2>&1

echo "🚀 Verificando Super Admin..."
node backend/create-admin.js 2>&1 || echo "⚠️ create-admin falló (puede que ya exista)"

echo "🚀 Iniciando servidor..."
node backend/dist/server.js
