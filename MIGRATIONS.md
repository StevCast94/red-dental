# Guía de Migraciones - Red Dental
#
# Cómo agregar cambios a la base de datos en producción
# =====================================================

## PARA DESARROLLO LOCAL (SQLite)

1. Edita `backend/prisma/schema.prisma` con los cambios
2. Ejecuta: `npx prisma db push` (aplica cambios directo a SQLite)
   O:  `npx prisma generate` (regenera el cliente)

## PARA PRODUCCIÓN (PostgreSQL en Railway)

### Opción A: db push (rápido, para cambios pequeños)
Editas schema.prisma, subes a GitHub, Railway ejecuta `db push` automáticamente.

⚠️ db push es destructivo: si renombras o borras una columna, puede perder datos.

### Opción B: migraciones (seguro, recomendado)

#### Paso 1: Generar migración local
```bash
cd backend
# Cambiar DATABASE_URL temporalmente a PostgreSQL de Railway para generar migración
# O usar npx prisma migrate dev --create-only (genera SQL sin aplicarlo)
npx prisma migrate dev --name descripcion_del_cambio --create-only
```

#### Paso 2: Revisar el SQL generado
Abrir `backend/prisma/migrations/XXXXXX_descripcion/migration.sql` y verificar

#### Paso 3: Commit y push
```bash
git add backend/prisma/migrations/
git commit -m "feat(db): descripcion del cambio"
git push origin main
```

#### Paso 4: Railway aplica la migración
El entrypoint ejecuta `prisma db push` que es compatible con migraciones existentes.

---

### Comandos útiles

```bash
# Ver estado de migraciones
npx prisma migrate status

# Ver schema actual de la DB
npx prisma db pull

# Resetear DB local (borra datos)
npx prisma migrate reset
```

## REGLA DE ORO
- **db push** = para cambios simples y desarrollo local
- **migrate dev** = para generación de migraciones oficiales
- **Siempre revisar el SQL antes de subir a producción**
