#!/bin/sh
# Entrypoint para Railway
set -e

cd backend

echo "=== Generando Prisma Client ==="
npx prisma generate 2>&1

echo "=== Aplicando migraciones ==="
npx prisma migrate deploy 2>&1 || {
  echo "WARN: migrate deploy fallo. Usando db push como fallback..."
  npx prisma db push --accept-data-loss 2>&1
}

echo "=== Verificando Super Admin ==="
node create-admin.js 2>&1

echo "=== Iniciando servidor ==="
node dist/server.js
