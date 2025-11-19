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

# Ejecutar script de creación de usuarios
echo "👥 Inicializando usuarios del sistema..."
python3 /app/create_users.py

echo ""

# Ejecutar script de creación de plazas
echo "🅿️  Inicializando plazas de parking..."
python3 /app/create_parking_spots.py

echo ""
echo "========================================"
echo "✅ BASE DE DATOS INICIALIZADA"
echo "========================================"
