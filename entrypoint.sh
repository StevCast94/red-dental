#!/bin/sh
# Entrypoint para Railway
set -e

cd backend

echo "📦 Generando Prisma Client..."
npx prisma generate 2>&1

echo "🚀 Aplicando migraciones..."
# En el primer deploy, db push crea todo.
# Cuando agreguemos migraciones nuevas, migrate deploy las aplicará.
npx prisma db push --accept-data-loss 2>&1

echo "🚀 Verificando Super Admin..."
node create-admin.js 2>&1

echo "🚀 Iniciando servidor..."
node dist/server.js
