#!/bin/bash
set -e

echo "========================================"
echo "🚀 INICIALIZACIÓN DE BASE DE DATOS"
echo "========================================"

# Esperar a que PostgreSQL esté listo
echo "⏳ Esperando a PostgreSQL..."
max_attempts=30
attempt=0

while ! pg_isready -h ${POSTGRES_HOST:-db} -p ${POSTGRES_PORT:-5432} -U ${POSTGRES_USER:-postgres} > /dev/null 2>&1; do
    attempt=$((attempt + 1))
    if [ $attempt -ge $max_attempts ]; then
        echo "❌ PostgreSQL no está disponible después de ${max_attempts} intentos"
        exit 1
    fi
    echo "   Intento ${attempt}/${max_attempts}..."
    sleep 2
done

echo "✅ PostgreSQL está listo"
echo ""

# Ejecutar script de creación de usuarios (buscar en ambas ubicaciones)
echo "👥 Inicializando usuarios del sistema..."
if [ -f /app/create_users.py ]; then
    python3 /app/create_users.py
elif [ -f /app/app/create_users.py ]; then
    python3 /app/app/create_users.py
else
    echo "⚠️  create_users.py no encontrado (esto puede ser normal si ya existen usuarios)"
fi

echo ""

# Ejecutar script de creación de plazas (buscar en ambas ubicaciones)
echo "🅿️  Inicializando plazas de parking..."
if [ -f /app/create_parking_spots.py ]; then
    python3 /app/create_parking_spots.py
elif [ -f /app/app/create_parking_spots.py ]; then
    python3 /app/app/create_parking_spots.py
else
    echo "⚠️  create_parking_spots.py no encontrado (esto puede ser normal si ya existen plazas)"
fi

echo ""
echo "========================================"
echo "✅ BASE DE DATOS INICIALIZADA"
echo "========================================"