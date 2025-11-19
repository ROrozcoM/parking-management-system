#!/bin/bash
"""
Configurar cron para backups automáticos
Ejecutar cada día a las 3:00 AM
"""

# Añadir entrada a crontab
echo "Configurando backups automáticos..."

# Crear entrada de cron (cada día a las 3 AM)
CRON_ENTRY="0 3 * * * cd /app && python3 backup_service.py >> /app/backups/backup.log 2>&1"

# Añadir al crontab del contenedor
(crontab -l 2>/dev/null; echo "$CRON_ENTRY") | crontab -

echo "✓ Cron configurado: Backups diarios a las 3:00 AM"
echo "✓ Log: /app/backups/backup.log"

# Iniciar cron
service cron start

echo "✓ Servicio cron iniciado"
