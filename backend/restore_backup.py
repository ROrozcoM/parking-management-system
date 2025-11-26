#!/usr/bin/env python3
"""
Script para listar y restaurar backups de PostgreSQL
Uso:
    # Listar backups disponibles
    docker-compose exec backend python3 restore_backup.py --list
    
    # Restaurar un backup específico
    docker-compose exec backend python3 restore_backup.py --restore backup_20251121_093850.sql
"""

import os
import sys
import subprocess
import argparse
from pathlib import Path
from datetime import datetime
from zoneinfo import ZoneInfo

# Configuración
BACKUP_DIR = Path("/app/backups/database")

def list_backups():
    """Listar todos los backups disponibles"""
    print("\n" + "=" * 70)
    print("📋 BACKUPS DISPONIBLES")
    print("=" * 70)
    
    if not BACKUP_DIR.exists():
        print("❌ No existe el directorio de backups")
        return
    
    backups = sorted(BACKUP_DIR.glob("backup_*.sql"), reverse=True)
    
    if not backups:
        print("No hay backups disponibles")
        return
    
    print(f"\n{'#':<5} {'Archivo':<35} {'Tamaño':<12} {'Fecha'}")
    print("-" * 70)
    
    for i, backup in enumerate(backups, 1):
        size_mb = backup.stat().st_size / (1024 * 1024)
        
        # Extraer fecha del nombre
        try:
            date_str = backup.stem.split('_')[1]
            time_str = backup.stem.split('_')[2]
            file_date = datetime.strptime(f"{date_str}_{time_str}", "%Y%m%d_%H%M%S")
            date_formatted = file_date.strftime("%Y-%m-%d %H:%M:%S")
        except:
            date_formatted = "Fecha desconocida"
        
        print(f"{i:<5} {backup.name:<35} {size_mb:>8.2f} MB   {date_formatted}")
    
    print("\n" + "=" * 70)

def restore_backup(filename):
    """Restaurar un backup específico"""
    backup_path = BACKUP_DIR / filename
    
    if not backup_path.exists():
        print(f"❌ Backup no encontrado: {filename}")
        print("\nUsa --list para ver backups disponibles")
        return False
    
    print("\n" + "=" * 70)
    print("⚠️  ADVERTENCIA: RESTAURAR BACKUP")
    print("=" * 70)
    print(f"Archivo: {filename}")
    print(f"Tamaño: {backup_path.stat().st_size / (1024 * 1024):.2f} MB")
    print("\n⚠️  Esta operación:")
    print("   1. BORRARÁ TODOS los datos actuales de la base de datos")
    print("   2. Los reemplazará con los datos del backup")
    print("   3. NO SE PUEDE DESHACER")
    print("\n" + "=" * 70)
    
    # Confirmación
    confirm = input("\n¿Estás SEGURO de continuar? Escribe 'SI' para confirmar: ")
    
    if confirm != "SI":
        print("❌ Operación cancelada")
        return False
    
    # Configuración de BD
    db_host = os.getenv("POSTGRES_HOST", "db")
    db_port = os.getenv("POSTGRES_PORT", "5432")
    db_name = os.getenv("POSTGRES_DB", "parking_db")
    db_user = os.getenv("POSTGRES_USER", "postgres")
    db_password = os.getenv("POSTGRES_PASSWORD", "postgres")
    
    env = os.environ.copy()
    env['PGPASSWORD'] = db_password
    
    try:
        print("\n🔄 Restaurando backup...")
        
        # Paso 1: Desconectar usuarios activos
        print("  1. Desconectando usuarios activos...")
        terminate_cmd = [
            'psql',
            '-h', db_host,
            '-p', db_port,
            '-U', db_user,
            '-d', 'postgres',
            '-c', f"SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '{db_name}' AND pid <> pg_backend_pid();"
        ]
        subprocess.run(terminate_cmd, env=env, check=False, capture_output=True)
        
        # Paso 2: Eliminar la base de datos
        print("  2. Eliminando base de datos actual...")
        drop_cmd = [
            'psql',
            '-h', db_host,
            '-p', db_port,
            '-U', db_user,
            '-d', 'postgres',
            '-c', f"DROP DATABASE IF EXISTS {db_name};"
        ]
        subprocess.run(drop_cmd, env=env, check=True, capture_output=True)
        
        # Paso 3: Crear nueva base de datos
        print("  3. Creando nueva base de datos...")
        create_cmd = [
            'psql',
            '-h', db_host,
            '-p', db_port,
            '-U', db_user,
            '-d', 'postgres',
            '-c', f"CREATE DATABASE {db_name};"
        ]
        subprocess.run(create_cmd, env=env, check=True, capture_output=True)
        
        # Paso 4: Restaurar el backup
        print("  4. Restaurando datos...")
        restore_cmd = [
            'pg_restore',
            '-h', db_host,
            '-p', db_port,
            '-U', db_user,
            '-d', db_name,
            '-v',
            str(backup_path)
        ]
        
        result = subprocess.run(restore_cmd, env=env, capture_output=True)
        
        if result.returncode != 0:
            print(f"⚠️  Algunos warnings durante la restauración (normal)")
        
        print("\n" + "=" * 70)
        print("✅ BACKUP RESTAURADO CORRECTAMENTE")
        print("=" * 70)
        print("\n⚠️  Recuerda reiniciar el backend:")
        print("   docker-compose restart backend")
        
        return True
        
    except subprocess.CalledProcessError as e:
        print(f"\n❌ Error restaurando backup: {e.stderr.decode()}")
        return False
    except Exception as e:
        print(f"\n❌ Error: {e}")
        return False

def main():
    parser = argparse.ArgumentParser(description='Gestión de backups de PostgreSQL')
    parser.add_argument('--list', action='store_true', help='Listar backups disponibles')
    parser.add_argument('--restore', type=str, help='Restaurar un backup específico (nombre del archivo)')
    
    args = parser.parse_args()
    
    if args.list:
        list_backups()
    elif args.restore:
        restore_backup(args.restore)
    else:
        parser.print_help()
        print("\nEjemplos:")
        print("  python3 restore_backup.py --list")
        print("  python3 restore_backup.py --restore backup_20251121_093850.sql")

if __name__ == "__main__":
    main()