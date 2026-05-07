#!/bin/sh
# Script de migración inteligente para Railway
set -e

cd backend

echo "📦 Generando Prisma Client..."
npx prisma generate 2>&1

echo "🔍 Verificando estado de base de datos..."
# Si no existe la tabla _prisma_migrations, usamos db push para crear todo
# y marcamos la migración como aplicada manualmente
DB_EXISTS=$(npx prisma db execute --stdin <<< "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = '_prisma_migrations');" 2>&1 | grep -c "t" || true)

if [ "$DB_EXISTS" -gt "0" ]; then
  echo "📋 Tabla de migraciones existe, intentando migrate deploy..."
  if npx prisma migrate deploy 2>&1; then
    echo "✅ Migraciones aplicadas correctamente"
  else
    echo "⚠️ migrate deploy falló, usando db push..."
    npx prisma db push --accept-data-loss 2>&1
  fi
else
  echo "🆕 Primera vez - creando tablas con db push..."
  npx prisma db push --accept-data-loss 2>&1
fi
