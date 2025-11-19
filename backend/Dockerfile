FROM python:3.11-slim

WORKDIR /app

# Instalar dependencias del sistema
RUN apt-get update && apt-get install -y \
    postgresql-client \
    cron \
    && rm -rf /var/lib/apt/lists/*

# Instalar dependencias de Python
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copiar código de la aplicación
COPY . .

# Dar permisos de ejecución a los scripts
RUN chmod +x /app/init_db.sh \
    /app/backup_service.py \
    /app/setup_cron.sh \
    /app/create_users.py \
    /app/create_parking_spots.py \
    2>/dev/null || true

# Crear directorio de backups
RUN mkdir -p /app/backups

# El CMD ejecuta init_db.sh, setup_cron.sh y luego uvicorn
CMD bash -c "/app/init_db.sh && bash /app/setup_cron.sh && uvicorn app.main:app --host 0.0.0.0 --port 8000"