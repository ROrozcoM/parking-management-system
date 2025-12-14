# 🚐 Camper Park Medina Azahara - Sistema de Gestión

Sistema integral de gestión para parking de autocaravanas en Córdoba, España. Incluye detección automática mediante cámaras ANPR, sistema de caja registradora completo, analytics avanzados y backups automáticos a Google Drive.

---

## 📋 Tabla de Contenidos

- [Características Principales](#-características-principales)
- [Stack Tecnológico](#-stack-tecnológico)
- [Arquitectura del Sistema](#-arquitectura-del-sistema)
- [Instalación y Configuración](#-instalación-y-configuración)
- [Comandos Docker Útiles](#-comandos-docker-útiles)
- [Gestión de Base de Datos](#-gestión-de-base-de-datos)
- [Funcionalidades Principales](#-funcionalidades-principales)
- [API Endpoints](#-api-endpoints)
- [Sistema de Backups](#-sistema-de-backups)
- [Usuarios y Permisos](#-usuarios-y-permisos)
- [Troubleshooting](#-troubleshooting)

---

## ✨ Características Principales

### 🎯 Gestión de Estancias
- **Detección Automática**: Integración con cámaras ANPR para detección de matrículas
- **Check-in Manual**: Entrada manual de vehículos no detectados
- **Gestión de Plazas**: 66 plazas clasificadas por tipo (A, B, C, Special)
- **Prepagos**: Sistema de pagos adelantados durante la estancia
- **Vehículos de Alquiler**: Distinción entre vehículos propios y de alquiler

### 💰 Sistema de Caja
- **Sesiones de Caja**: Apertura y cierre con fondo inicial
- **Múltiples Métodos de Pago**: Efectivo, tarjeta, transferencia
- **Desglose de Efectivo**: Conteo detallado de billetes y monedas
- **Detección de Descuadres**: Comparación automática entre esperado vs real
- **Retiro Inteligente**: Sugerencia de retiro manteniendo fondo de caja

### 🚫 Lista Negra (SINPA)
- **Registro de Morosos**: Clientes que no pagaron
- **Bloqueo Automático**: Prevención de futuras entradas
- **Resolución**: Marcado como resuelto cuando se recibe el pago

### 📊 Analytics (Solo Admin)
- **KPIs en Tiempo Real**: Ingresos, ocupación, pernoctas
- **Distribución Geográfica**: Análisis por países
- **Análisis Temporal**: Horas pico, días de semana, comparación mensual
- **Tipos de Vehículos**: Distribución y preferencias
- **Métodos de Pago**: Estadísticas de uso
- **Vehículos Propios vs Alquiler**: Análisis de la clientela

### 🔄 Backups Automáticos
- **Backup Diario**: PostgreSQL dump a las 3:00 AM
- **Google Drive**: Sincronización automática en la nube
- **Export Excel**: Reportes mensuales automáticos
- **Retención**: 7 días local, 30 días en Drive

### 📜 Auditoría Completa
- **Historial de Acciones**: Registro de todas las operaciones
- **Trazabilidad**: Usuario, fecha, detalles de cada acción
- **Exportación**: Descarga de históricos en Excel

---

## 🛠 Stack Tecnológico

### Backend
- **FastAPI** - Framework Python async para API REST
- **SQLAlchemy** - ORM para PostgreSQL
- **Pydantic** - Validación de datos y schemas
- **JWT** - Autenticación con tokens
- **bcrypt** - Hashing de contraseñas

### Frontend
- **React** 18+ con Hooks
- **Bootstrap** 5.3 - UI responsive
- **Recharts** - Gráficos y visualizaciones
- **Axios** - Cliente HTTP

### Base de Datos
- **PostgreSQL** 15 - Base de datos principal
- **Timezone**: Europe/Madrid

### DevOps
- **Docker** - Containerización
- **Docker Compose** - Orquestación multi-contenedor
- **Cron** - Tareas programadas
- **Google Drive API** - Backups en la nube

---

## 🏗 Arquitectura del Sistema

```
┌─────────────────────────────────────────────────────────────┐
│                    Sistemas Externos                        │
│  📷 Cámaras ANPR  │  ☁️ Google Drive  │  🖨️ Impresora      │
└─────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────┐
│                     Docker Compose                          │
│                                                             │
│  ┌──────────────┐  ┌──────────────┐  ┌─────────────────┐  │
│  │   Frontend   │  │   Backend    │  │   PostgreSQL    │  │
│  │   React      │  │   FastAPI    │  │   Database      │  │
│  │   Port 3000  │  │   Port 8000  │  │   Port 5432     │  │
│  └──────────────┘  └──────────────┘  └─────────────────┘  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────┐
│                   Almacenamiento                            │
│  📦 postgres_data  │  💾 backup-data  │  ☁️ Google Drive   │
└─────────────────────────────────────────────────────────────┘
```

---

## 🚀 Instalación y Configuración

### Prerrequisitos
- Docker y Docker Compose instalados
- Git instalado
- Cuenta de Google Drive (para backups)

### 1. Clonar el Repositorio
```bash
git clone <repository-url>
cd camper-park-management
```

### 2. Configurar Variables de Entorno

Crea un archivo `.env` en la raíz del proyecto:

```bash
# ===========================
# DATABASE CONFIGURATION
# ===========================
POSTGRES_DB=parking_db
POSTGRES_USER=autocaravanascordoba
POSTGRES_PASSWORD=TU_PASSWORD_SEGURO_AQUI
POSTGRES_HOST=db
POSTGRES_PORT=5432

# ===========================
# BACKEND CONFIGURATION
# ===========================
DATABASE_URL=postgresql://autocaravanascordoba:TU_PASSWORD_SEGURO_AQUI@db:5432/parking_db
SECRET_KEY=GENERA_UNA_CLAVE_SEGURA_DE_256_BITS

# ===========================
# FRONTEND CONFIGURATION
# ===========================
# Para desarrollo local:
REACT_APP_API_URL=http://localhost:8000

# Para acceso desde red local (móvil/tablet):
# REACT_APP_API_URL=http://TU_IP_LOCAL:8000

# ===========================
# CORS (Desarrollo Local)
# ===========================
ALLOWED_ORIGINS=http://localhost:3000

# Para red local añade:
# ALLOWED_ORIGINS=http://TU_IP_LOCAL:3000,http://localhost:3000

# ===========================
# EMAIL CONFIGURATION
# ===========================
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=tu_email@gmail.com
SMTP_PASSWORD=tu_app_password_de_gmail
NOTIFICATION_EMAILS=email1@gmail.com,email2@gmail.com

# ===========================
# GOOGLE DRIVE (Opcional)
# ===========================
GOOGLE_DRIVE_FOLDER_ID=tu_folder_id_aqui

# ===========================
# DEVELOPMENT ONLY
# ===========================
CHOKIDAR_USEPOLLING=true
```

### 3. Configurar Google Drive (Opcional pero Recomendado)

Para backups automáticos en la nube:

1. **Crear proyecto en Google Cloud Console**
   - Ve a: https://console.cloud.google.com/
   - Crea proyecto: "Parking Backups"
   - Habilita Google Drive API

2. **Crear cuenta de servicio**
   - "APIs y Servicios" → "Credenciales"
   - "Crear credenciales" → "Cuenta de servicio"
   - Descarga el JSON con las credenciales

3. **Crear carpeta en Drive y compartir**
   - Crea carpeta "Parking-Backups" en tu Drive
   - Comparte con el email de la cuenta de servicio (del JSON)
   - Copia el ID de la carpeta (de la URL)
   - Añádelo a `.env` como `GOOGLE_DRIVE_FOLDER_ID`

4. **Configurar credenciales en el backend**
   ```bash
   # Copia el JSON de Google al backend
   cp credentials.json backend/credentials.json
   
   # Autenticar (solo una vez)
   docker-compose up -d
   docker-compose exec backend python3 authenticate_oauth.py
   ```

### 4. Iniciar el Sistema

```bash
# Construcción e inicio de todos los contenedores
docker-compose up --build -d

# Ver logs en tiempo real
docker-compose logs -f
```

### 5. Acceso al Sistema

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8000
- **API Docs (Swagger)**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

**Credenciales por defecto:**
- Admin: `javi` / `extremoduro5800`
- Admin: `fito` / `extremoduro5800`

⚠️ **IMPORTANTE**: Cambia las contraseñas en producción

---

## 🐳 Comandos Docker Útiles

### Gestión de Contenedores

```bash
# Iniciar todos los servicios
docker-compose up -d

# Ver estado de los contenedores
docker-compose ps

# Ver logs de todos los servicios
docker-compose logs -f

# Ver logs de un servicio específico
docker-compose logs -f backend
docker-compose logs -f frontend
docker-compose logs -f db

# Reiniciar un servicio
docker-compose restart backend
docker-compose restart frontend
docker-compose restart db

# Reiniciar todo
docker-compose restart

# Detener todos los servicios
docker-compose down

# Detener y eliminar volúmenes (⚠️ CUIDADO: borra la BD)
docker-compose down -v

# Reconstruir un servicio específico
docker-compose up -d --build backend

# Ver uso de recursos
docker stats
```

### Acceso a Contenedores

```bash
# Acceder a shell del backend
docker-compose exec backend bash

# Acceder a shell del frontend
docker-compose exec frontend sh

# Acceder a PostgreSQL
docker-compose exec db psql -U autocaravanascordoba -d parking_db

# Ejecutar comando en backend sin entrar
docker-compose exec backend python3 script.py
```

---

## 🗄 Gestión de Base de Datos

### Acceso a PostgreSQL

```bash
# Conectar a PostgreSQL
docker-compose exec db psql -U autocaravanascordoba -d parking_db

# Una vez dentro de psql:
\dt              # Listar tablas
\d+ stays        # Describir tabla stays
\q               # Salir
```

### Consultas SQL Útiles

```bash
# Ejecutar consulta desde fuera de psql
docker-compose exec db psql -U autocaravanascordoba -d parking_db -c "SELECT * FROM stays LIMIT 5;"
```

**Ejemplos de consultas comunes:**

```sql
-- Ver estancias activas
SELECT s.id, v.license_plate, v.vehicle_type, ps.spot_number, s.check_in_time
FROM stays s
JOIN vehicles v ON s.vehicle_id = v.id
JOIN parking_spots ps ON s.parking_spot_id = ps.id
WHERE s.status = 'active';

-- Ver vehículos en blacklist
SELECT v.license_plate, v.country, b.amount_owed, b.incident_date, b.resolved
FROM blacklist b
JOIN vehicles v ON b.vehicle_id = v.id
WHERE b.resolved = false;

-- Ingresos del mes actual
SELECT SUM(final_price) as total_revenue
FROM stays
WHERE status = 'completed'
AND EXTRACT(MONTH FROM check_out_time) = EXTRACT(MONTH FROM CURRENT_DATE)
AND EXTRACT(YEAR FROM check_out_time) = EXTRACT(YEAR FROM CURRENT_DATE);

-- Sesión de caja activa
SELECT * FROM cash_sessions WHERE status = 'open';

-- Transacciones de una sesión
SELECT ct.*, s.id as stay_id, v.license_plate
FROM cash_transactions ct
LEFT JOIN stays s ON ct.stay_id = s.id
LEFT JOIN vehicles v ON s.vehicle_id = v.id
WHERE ct.cash_session_id = 1;

-- Plazas ocupadas
SELECT spot_number, spot_type
FROM parking_spots
WHERE is_occupied = true;

-- Vehículos de alquiler
SELECT license_plate, vehicle_type, country
FROM vehicles
WHERE is_rental = true;
```

### Backups y Restauración

```bash
# Crear backup manual
docker-compose exec backend python3 backup_service.py

# Backup manual de PostgreSQL
docker-compose exec db pg_dump -U autocaravanascordoba parking_db > backup_manual.sql

# Restaurar desde backup
docker-compose exec -T db psql -U autocaravanascordoba parking_db < backup_manual.sql

# Ver backups de base de datos
docker-compose exec backend ls -lh /app/backups/database/

# Ver backups Excel mensuales
docker-compose exec backend ls -lh /app/backups/excel/

# Restaurar backup específico desde el contenedor
docker-compose exec backend python3 restore_backup.py /app/backups/database/backup_20251203_100256.sql
```

---

## 📋 Scripts del Backend

### Ejecutar Scripts

```bash
# Script de backup (también se ejecuta automáticamente vía cron)
docker-compose exec backend python3 backup_service.py

# Autenticación OAuth de Google Drive (solo una vez)
docker-compose exec backend python3 authenticate_oauth.py

# Crear usuarios iniciales
docker-compose exec backend python3 create_users.py

# Crear plazas de parking
docker-compose exec backend python3 create_parking_spots.py

# Verificar estado de la base de datos
docker-compose exec backend python3 check_db.py

# Restaurar desde backup
docker-compose exec backend python3 restore_backup.py backup_20241127.sql

# Exportar datos a CSV
docker-compose exec backend python3 export_db_to_csv.py
```

### Verificar Cron (Backups Automáticos)

```bash
# Ver tareas programadas
docker-compose exec backend crontab -l

# Ver logs de cron
docker-compose exec backend cat /var/log/cron.log

# Reiniciar cron
docker-compose exec backend service cron restart
```

---

## 🎯 Funcionalidades Principales

### Flujo de Trabajo Típico

#### 1. Detección de Vehículo
```
📷 Cámara ANPR detecta matrícula
     ↓
💾 Escribe en BD (status: PENDING)
     ↓
👀 Staff revisa en "Vehículos Pendientes"
```

#### 2. Check-in
```
✅ Staff valida vehículo
     ↓
🚫 Verifica blacklist
     ↓
🅿️ Asigna plaza (A/B/C/Special)
     ↓
✅ Status: ACTIVE
     ↓
💰 (Opcional) Registra prepago
```

#### 3. Durante la Estancia
```
💵 Cliente puede hacer prepagos
📝 Se registran en sistema de caja
🔄 Puede extender estancia
```

#### 4. Check-out
```
🧮 Calcular precio final
     ↓
💰 Deducir prepagos si hay
     ↓
💳 Registrar método de pago
     ↓
📝 Crear transacción de caja
     ↓
✅ Status: COMPLETED
     ↓
🅿️ Liberar plaza
```

#### 5. Sesión de Caja
```
🔓 Apertura (fondo inicial)
     ↓
💰 Transacciones del día
     ↓
🔒 Cierre (conteo físico)
     ↓
📊 Comparación esperado vs real
     ↓
💵 Retiro sugerido
```

---

## 🔌 API Endpoints

### Autenticación
- `POST /api/auth/token` - Login y obtención de JWT
- `GET /api/auth/users/me` - Info del usuario actual

### Estancias
- `GET /api/stays/pending` - Vehículos pendientes de check-in
- `GET /api/stays/active` - Estancias activas
- `POST /api/stays/{id}/check-in` - Realizar check-in
- `POST /api/stays/{id}/check-out` - Realizar check-out
- `POST /api/stays/{id}/prepay` - Registrar prepago
- `POST /api/stays/{id}/discard` - Descartar vehículo
- `POST /api/stays/manual` - Entrada manual
- `POST /api/stays/{id}/extend-stay` - Extender estancia
- `GET /api/stays/history/{plate}` - Historial por matrícula
- `GET /api/stays/recent-checkouts` - Últimos checkouts

### Sistema de Caja
- `GET /api/cash/active-session` - Sesión activa
- `GET /api/cash/pre-close-info` - Info pre-cierre
- `POST /api/cash/open-session` - Abrir sesión
- `POST /api/cash/close-session/{id}` - Cerrar sesión
- `GET /api/cash/pending-transactions` - Transacciones pendientes
- `POST /api/cash/register-pending/{stay_id}` - Registrar en caja
- `POST /api/cash/withdrawal` - Registrar retiro
- `GET /api/cash/transactions/{session_id}` - Transacciones de sesión
- `DELETE /api/cash/transaction/{id}` - Eliminar transacción

### Blacklist (SINPA)
- `GET /api/blacklist/check/{plate}` - Verificar matrícula
- `POST /api/stays/{id}/mark-sinpa` - Marcar como moroso
- `GET /api/blacklist/` - Listar blacklist
- `POST /api/blacklist/{id}/resolve` - Resolver entrada

### Analytics (Solo Admin)
- `GET /api/analytics/overview` - KPIs principales
- `GET /api/analytics/revenue-timeline` - Ingresos por día
- `GET /api/analytics/country-distribution` - Por países
- `GET /api/analytics/peak-hours` - Horas pico
- `GET /api/analytics/vehicle-types` - Tipos de vehículos
- `GET /api/analytics/payment-methods` - Métodos de pago
- `GET /api/analytics/stay-duration-by-country` - Duración por país
- `GET /api/analytics/monthly-comparison` - Comparación mensual
- `GET /api/analytics/weekday-distribution` - Por día de semana
- `GET /api/analytics/total-nights` - Total pernoctas
- `GET /api/analytics/nights-timeline` - Pernoctas por día
- `GET /api/analytics/stay-length-distribution` - Duración estancias
- `GET /api/analytics/rental-vs-owned` - Propios vs alquiler

### Historial
- `GET /api/history/` - Listar historial (con filtros)
- `GET /api/history/stats/` - Estadísticas del período

### Dashboard
- `GET /api/dashboard/data` - Datos para dashboard

**Documentación interactiva completa:** http://localhost:8000/docs

---

## 💾 Sistema de Backups

### Backup Automático

El sistema ejecuta backups automáticos diariamente a las **3:00 AM**:

1. **Backup PostgreSQL**: Dump completo de la base de datos
2. **Compresión**: .sql.gz para ahorrar espacio
3. **Upload a Google Drive**: Sincronización automática
4. **Export Excel**: Primer día de cada mes
5. **Limpieza**: Elimina backups locales > 7 días

### Verificar Backups

```bash
# Ver backups de base de datos (últimos 7 días)
docker-compose exec backend ls -lh /app/backups/database/

# Ver backups Excel (mensuales)
docker-compose exec backend ls -lh /app/backups/excel/

# Ver estructura completa
docker-compose exec backend ls -lha /app/backups/

# Ver configuración de cron
docker-compose exec backend crontab -l

# Ejecutar backup manual
docker-compose exec backend python3 backup_service.py
```

### Restaurar desde Backup

```bash
# Listar backups disponibles
docker-compose exec backend ls -lh /app/backups/database/

# Restaurar backup específico
docker-compose exec backend python3 restore_backup.py /app/backups/database/backup_YYYYMMDD_HHMMSS.sql

# O directamente con psql (si no está comprimido)
cat backup.sql | docker-compose exec -T db psql -U autocaravanascordoba parking_db

# Si está comprimido (.gz)
gunzip -c backup.sql.gz | docker-compose exec -T db psql -U autocaravanascordoba parking_db
```

### Configuración de Retención

- **Backups locales**: 7 días (configurable en `backup_service.py`)
- **Backups Drive**: 30 días (configurable)
- **Excel mensuales**: Permanentes

---

## 👥 Usuarios y Permisos

### Roles del Sistema

| Role | Permisos | Usuarios |
|------|----------|----------|
| **admin** | Acceso completo + Analytics | javi, fito |
| **worker** | Operaciones diarias (sin analytics) | operadores |

### Gestión de Usuarios

```bash
# Acceder a la base de datos
docker-compose exec db psql -U autocaravanascordoba -d parking_db

# Ver usuarios existentes
SELECT id, username, role, is_active FROM users;

# Crear nuevo usuario (el password debe hashearse con bcrypt)
# Es más fácil usar el script:
docker-compose exec backend python3 create_users.py

# Desactivar usuario
UPDATE users SET is_active = false WHERE username = 'nombre_usuario';

# Cambiar rol
UPDATE users SET role = 'admin' WHERE username = 'nombre_usuario';
```

### Cambiar Contraseñas

```python
# En el contenedor backend
docker-compose exec backend python3

>>> from passlib.context import CryptContext
>>> pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
>>> hashed = pwd_context.hash("nueva_contraseña")
>>> print(hashed)
# Copia el hash y actualiza en la BD
```

```sql
UPDATE users SET hashed_password = 'HASH_GENERADO' WHERE username = 'javi';
```

---

## 🔧 Troubleshooting

### Problemas Comunes

#### 1. Error de Conexión a Base de Datos

```bash
# Verificar que PostgreSQL está corriendo
docker-compose ps db

# Ver logs de PostgreSQL
docker-compose logs db

# Reiniciar base de datos
docker-compose restart db

# Verificar conexión
docker-compose exec db pg_isready -U autocaravanascordoba
```

#### 2. Frontend No Conecta con Backend

```bash
# Verificar que backend está corriendo
docker-compose ps backend

# Ver logs del backend
docker-compose logs backend

# Verificar variables de entorno
docker-compose exec frontend env | grep REACT_APP_API_URL

# Verificar CORS en backend
docker-compose exec backend env | grep ALLOWED_ORIGINS
```

#### 3. Errores de Autenticación JWT

```bash
# Verificar SECRET_KEY
docker-compose exec backend env | grep SECRET_KEY

# Limpiar tokens en el navegador
# En DevTools → Application → Local Storage → Clear
```

#### 4. Cron No Ejecuta Backups

```bash
# Verificar que cron está corriendo
docker-compose exec backend ps aux | grep cron

# Ver configuración de cron
docker-compose exec backend crontab -l

# Ver últimos backups creados
docker-compose exec backend ls -lth /app/backups/database/ | head -5

# Ejecutar backup manual para verificar
docker-compose exec backend python3 backup_service.py

# Reiniciar backend si es necesario
docker-compose restart backend
```

#### 5. Google Drive No Sincroniza

```bash
# Verificar credenciales
docker-compose exec backend ls -la credentials.json
docker-compose exec backend ls -la token.json

# Re-autenticar
docker-compose exec backend python3 authenticate_oauth.py

# Probar backup manual
docker-compose exec backend python3 backup_service.py
```

#### 6. Plazas No Se Liberan

```sql
-- Ver plazas ocupadas
SELECT ps.spot_number, ps.spot_type, s.id as stay_id, v.license_plate
FROM parking_spots ps
JOIN stays s ON ps.id = s.parking_spot_id
JOIN vehicles v ON s.vehicle_id = v.id
WHERE ps.is_occupied = true AND s.status != 'active';

-- Liberar plaza manualmente (si está "stuck")
UPDATE parking_spots SET is_occupied = false WHERE spot_number = 'A-05';
```

#### 7. Ver Estado General

```bash
# Script de diagnóstico rápido
docker-compose exec backend python3 check_db.py

# O manualmente:
docker-compose ps                          # Estado contenedores
docker-compose logs --tail=50 backend      # Últimos logs
docker stats                               # Uso de recursos
docker-compose exec db psql -U autocaravanascordoba -d parking_db -c "\dt"  # Tablas
```

### Logs Importantes

```bash
# Ver todos los logs
docker-compose logs -f

# Logs específicos con timestamp
docker-compose logs -f --timestamps backend

# Guardar logs a archivo
docker-compose logs backend > backend_logs.txt

# Logs de backup
docker-compose exec backend cat /app/backups/backup.log

# Logs de aplicación (si los tienes configurados)
docker-compose exec backend cat /app/logs/app.log
```

### Resetear Sistema (⚠️ CUIDADO)

```bash
# Detener todo
docker-compose down

# Eliminar volúmenes (BORRA LA BASE DE DATOS)
docker-compose down -v

# Reconstruir desde cero
docker-compose up --build -d

# Esperar a que la BD inicialice
docker-compose logs -f db

# Crear usuarios y plazas
docker-compose exec backend python3 create_users.py
docker-compose exec backend python3 create_parking_spots.py
```

---

## 📚 Documentación Adicional

- **Documentación API completa**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc
- **Documentación técnica**: Ver carpeta `/docs` en el repositorio

---

# 📦 Tutorial: Backups y Restauración de Base de Datos

## 1️⃣ Ver Backups Disponibles

### Ver backups locales:
```bash
docker-compose exec backend ls -lh /app/backups/database/
```

### Ver el más reciente:
```bash
docker-compose exec backend ls -lt /app/backups/database/ | head -2
```

---

## 2️⃣ Restaurar Backup en el Mismo PC

### Paso 1: Para el backend (opcional, por seguridad)
```bash
docker-compose stop backend
```

### Paso 2: Restaurar el backup más reciente
```bash
# Reemplaza YYYYMMDD_HHMMSS con la fecha del backup
docker-compose exec db pg_restore \
  -U autocaravanascordoba \
  -d parking_db \
  --clean \
  --if-exists \
  /app/backups/database/backup_YYYYMMDD_HHMMSS.sql
```

**Ejemplo:**
```bash
docker-compose exec db pg_restore \
  -U autocaravanascordoba \
  -d parking_db \
  --clean \
  --if-exists \
  /app/backups/database/backup_20251208_133750.sql
```

### Paso 3: Reinicia el backend
```bash
docker-compose start backend
```

## 🔧 Corrección de Precios con Decimales

Guía rápida para detectar y corregir precios que contienen decimales incorrectos (generados por error al usar el scroll del ratón en los campos de precio).

---

## 1️⃣ Detectar Precios con Decimales

Ejecuta esta query para encontrar todos los checkouts con precios que tienen decimales (distintos de .0 o .00):

```bash
docker-compose exec db psql -U autocaravanascordoba -d parking_db -c "
SELECT 
    v.license_plate, 
    v.country, 
    s.final_price, 
    s.amount_paid,
    s.check_in_time::date as check_in,
    s.check_out_time::date as check_out
FROM stays s 
JOIN vehicles v ON s.vehicle_id = v.id 
WHERE s.status = 'COMPLETED' 
AND (
    CAST(s.final_price AS TEXT) LIKE '%.%' AND CAST(s.final_price AS TEXT) NOT LIKE '%.0' AND CAST(s.final_price AS TEXT) NOT LIKE '%.00'
    OR 
    CAST(s.amount_paid AS TEXT) LIKE '%.%' AND CAST(s.amount_paid AS TEXT) NOT LIKE '%.0' AND CAST(s.amount_paid AS TEXT) NOT LIKE '%.00'
)
ORDER BY s.check_out_time DESC;
"
```

**Ejemplo de salida:**
```
 license_plate | country | final_price | amount_paid |  check_in  | check_out  
---------------+---------+-------------+-------------+------------+------------
 FA040GJ       | France  |       35.98 |       35.98 | 2025-12-06 | 2025-12-08
 MBKX144       | Germany |       13.99 |       13.99 | 2025-12-07 | 2025-12-08
```

---

## 2️⃣ Redondear Precios

Una vez identificadas las matrículas con precios incorrectos, redondéalas:

```bash
docker-compose exec db psql -U autocaravanascordoba -d parking_db -c "
UPDATE stays s
SET 
  final_price = ROUND(s.final_price),
  amount_paid = ROUND(s.amount_paid)
FROM vehicles v
WHERE s.vehicle_id = v.id
  AND v.license_plate IN (
    'MATRICULA1', 'MATRICULA2', 'MATRICULA3'
  )
  AND s.status = 'COMPLETED'
RETURNING v.license_plate, s.final_price, s.amount_paid;
"
```

**Reemplaza `'MATRICULA1', 'MATRICULA2', 'MATRICULA3'`** con las matrículas detectadas en el paso 1.

**Ejemplo:**
```bash
# Si detectaste: FA040GJ (35.98), MBKX144 (13.99), 7113MMS (17.98)
docker-compose exec db psql -U autocaravanascordoba -d parking_db -c "
UPDATE stays s
SET 
  final_price = ROUND(s.final_price),
  amount_paid = ROUND(s.amount_paid)
FROM vehicles v
WHERE s.vehicle_id = v.id
  AND v.license_plate IN (
    'FA040GJ', 'MBKX144', '7113MMS'
  )
  AND s.status = 'COMPLETED'
RETURNING v.license_plate, s.final_price, s.amount_paid;
"
```

**Resultado:**
```
 license_plate | final_price | amount_paid 
---------------+-------------+-------------
 FA040GJ       |          36 |          36
 MBKX144       |          14 |          14
 7113MMS       |          18 |          18
```

---

## 3️⃣ Verificar Corrección

Vuelve a ejecutar la query del **Paso 1** para confirmar que no quedan precios con decimales:

```bash
docker-compose exec db psql -U autocaravanascordoba -d parking_db -c "
SELECT 
    v.license_plate, 
    s.final_price, 
    s.amount_paid
FROM stays s 
JOIN vehicles v ON s.vehicle_id = v.id 
WHERE s.status = 'COMPLETED' 
AND (
    CAST(s.final_price AS TEXT) LIKE '%.%' AND CAST(s.final_price AS TEXT) NOT LIKE '%.0' AND CAST(s.final_price AS TEXT) NOT LIKE '%.00'
    OR 
    CAST(s.amount_paid AS TEXT) LIKE '%.%' AND CAST(s.amount_paid AS TEXT) NOT LIKE '%.0' AND CAST(s.amount_paid AS TEXT) NOT LIKE '%.00'
)
ORDER BY s.check_out_time DESC;
"
```

**Resultado esperado:** `(0 rows)` ✅

---

## Eliminar SINPAs de Lista Negra (Manualmente vía SQL)

### Ver todos los SINPAs activos
```bash
docker-compose exec db psql -U autocaravanascordoba -d parking_db -c "
SELECT id, license_plate, amount_owed, incident_date, notes, resolved 
FROM blacklist 
WHERE resolved = false 
ORDER BY incident_date DESC;
"
```

### Marcar SINPA como resuelto (por ID)
```bash
docker-compose exec db psql -U autocaravanascordoba -d parking_db -c "
UPDATE blacklist 
SET resolved = true 
WHERE id = [ID_DEL_SINPA];
"
```

### Marcar SINPA como resuelto (por matrícula)
```bash
docker-compose exec db psql -U autocaravanascordoba -d parking_db -c "
UPDATE blacklist 
SET resolved = true 
WHERE license_plate = '[MATRICULA]' AND resolved = false;
"
```

### Eliminar SINPA completamente (NO REVERSIBLE)
```bash
docker-compose exec db psql -U autocaravanascordoba -d parking_db -c "
DELETE FROM blacklist 
WHERE id = [ID_DEL_SINPA];
"
```

## 🔄 Restaurar Backup en Base de Datos

Guía para restaurar un backup `.sql` en formato plano en una base de datos limpia o reemplazar una existente.

---

## 📦 Escenario 1: Restaurar en BD Limpia (Recomendado)

Úsalo cuando quieras migrar todos los datos a un nuevo entorno (RPi5, nuevo PC, etc.)

### **Paso 1: Para Docker y borra el volumen**
```bash
docker-compose down
docker volume rm parking-management-system_postgres_data
```

### **Paso 2: Levanta SOLO la base de datos**
```bash
docker-compose up -d db
```

Espera 10 segundos para que PostgreSQL arranque completamente:
```bash
# Linux/Mac
sleep 10

# Windows PowerShell
timeout /t 10
```

### **Paso 3: Copia el backup al contenedor**
```bash
docker cp /ruta/al/backup_plain.sql parking-management-system-db-1:/tmp/
```

**Ejemplo:**
```bash
docker cp D:/Downloads_Predator/backup_plain.sql parking-management-system-db-1:/tmp/
```

### **Paso 4: Restaura el backup**
```bash
docker-compose exec db psql -U autocaravanascordoba -d parking_db -f /tmp/backup_plain.sql
```

### **Paso 5: Verifica que los datos están OK**
```bash
docker-compose exec db psql -U autocaravanascordoba -d parking_db -c "SELECT COUNT(*) FROM vehicles;"
docker-compose exec db psql -U autocaravanascordoba -d parking_db -c "SELECT COUNT(*) FROM stays WHERE status = 'COMPLETED';"
```

### **Paso 6: Levanta backend y frontend**
```bash
docker-compose up -d
```

### **Paso 7: Accede al frontend**
Abre: `http://localhost:3000` y verifica que los datos aparecen correctamente.

---

## 🔄 Escenario 2: Reemplazar BD Existente

Úsalo cuando quieras actualizar los datos en un entorno que ya está corriendo.

### **Paso 1: Para el backend (opcional, recomendado)**
```bash
docker-compose stop backend
```

### **Paso 2: Limpia la base de datos**
```bash
docker-compose exec db psql -U autocaravanascordoba -d parking_db -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"
```

### **Paso 3: Copia el backup al contenedor**
```bash
docker cp /ruta/al/backup_plain.sql parking-management-system-db-1:/tmp/
```

### **Paso 4: Restaura el backup**
```bash
docker-compose exec db psql -U autocaravanascordoba -d parking_db -f /tmp/backup_plain.sql
```

### **Paso 5: Verifica los datos**
```bash
docker-compose exec db psql -U autocaravanascordoba -d parking_db -c "SELECT COUNT(*) FROM vehicles;"
```

### **Paso 6: Reinicia el backend**
```bash
docker-compose start backend
```

---

## 🔧 Generar Backup Plano (desde oficina)

Para crear un backup compatible con cualquier versión de PostgreSQL:

```bash
docker-compose exec backend bash -c "PGPASSWORD=extremoduro5800 pg_dump -U autocaravanascordoba -h db -d parking_db -F p > /app/backups/database/backup_plain.sql"
```

Luego copia el backup fuera del contenedor:

```bash
docker cp parking-management-system-backend-1:/app/backups/database/backup_plain.sql ./backup_plain.sql
```

---

## ⚠️ Errores Comunes

### Error: "already exists"
**Causa:** El backend ya creó las tablas vacías antes de restaurar.  
**Solución:** Usa **Escenario 1** (restaurar ANTES de levantar el backend).

### Error: "unsupported version"
**Causa:** Intentas restaurar un backup comprimido (`-F c`) entre versiones diferentes de PostgreSQL.  
**Solución:** Usa backups en formato plano (`-F p`).

### Error: "foreign key constraint"
**Causa:** Intentas restaurar sobre una BD que ya tiene datos parciales.  
**Solución:** Limpia completamente con `DROP SCHEMA public CASCADE` antes de restaurar.

---

## 📝 Notas Importantes

- **Formato recomendado:** Plain SQL (`-F p`) para máxima portabilidad
- **Timing crítico:** Restaurar ANTES de que el backend arranque (Escenario 1)
- **Versión PostgreSQL:** Fijar versión exacta en `docker-compose.yml`: `image: postgres:15.15`
- **Backups automáticos:** El `backup_service.py` genera backups en formato plano compatible

---

## 🎯 Migración Oficina → RPi5

Para migrar del PC de oficina a la Raspberry Pi 5:

1. **En oficina:** Genera backup plano
2. **Copia archivo** a RPi5 (USB, email, Drive)
3. **En RPi5:** Usa **Escenario 1** (BD limpia)
4. Configura IPs en `.env` para red de oficina
5. ¡Listo!

## ⚠️ Notas Importantes

- **Causa del problema:** Usar el scroll del ratón sobre los campos de precio incrementa/decrementa en 0.01€
- **Prevención:** Escribir manualmente los precios sin usar el scroll
- **Backup recomendado:** Hacer backup antes de ejecutar el UPDATE
- **Redondeo:** Siempre redondea hacia arriba (ej: 35.98 → 36, 13.99 → 14)

---

## 📊 Resumen

| Paso | Acción | Comando |
|------|--------|---------|
| 1 | Detectar | Query SELECT con filtros decimales |
| 2 | Corregir | UPDATE con ROUND() en matrículas específicas |
| 3 | Verificar | Query SELECT debe devolver 0 rows |

---

## 3️⃣ Migrar a Otro PC (Docker Nuevo)

### En el PC ORIGINAL:

**1. Copia el backup más reciente**
```bash
# Listar backups
docker-compose exec backend ls -lh /app/backups/database/

# Copiar backup fuera del contenedor
docker cp parking-management-system-backend-1:/app/backups/database/backup_20251208_133750.sql ./
```

**2. Lleva el archivo `.sql` al nuevo PC** (USB, Drive, etc.)

---

### En el PC NUEVO:

**1. Clona el proyecto y arranca Docker**
```bash
git clone <repo>
cd parking-management-system
docker-compose up -d
```

**2. Copia el backup al contenedor**
```bash
docker cp backup_20251208_133750.sql parking-management-system-backend-1:/tmp/
```

**3. Restaura el backup**
```bash
docker-compose exec db pg_restore \
  -U autocaravanascordoba \
  -d parking_db \
  --clean \
  --if-exists \
  /tmp/backup_20251208_133750.sql
```

**4. Verifica que funciona**
```bash
docker-compose exec db psql -U autocaravanascordoba -d parking_db -c "SELECT COUNT(*) FROM vehicles;"
```

---

## 4️⃣ Restaurar desde Google Drive

**1. Descarga el backup de Google Drive**
- Accede a la carpeta "BD-Backups"
- Descarga el `.sql` deseado

**2. Copia al contenedor**
```bash
docker cp backup_descargado.sql parking-management-system-backend-1:/tmp/
```

**3. Restaura**
```bash
docker-compose exec db pg_restore \
  -U autocaravanascordoba \
  -d parking_db \
  --clean \
  --if-exists \
  /tmp/backup_descargado.sql
```

---

## ⚠️ Notas Importantes

- `--clean`: Borra tablas existentes antes de restaurar
- `--if-exists`: No da error si las tablas no existen
- Los backups están en formato comprimido de PostgreSQL (`.sql`)
- El nombre del contenedor puede variar: `parking-management-system-backend-1` o `backend-1`

---

## 🆘 Solución de Problemas

### Error: "no crontab for root"
El backup manual funciona pero el automático no tiene variables de entorno.
```bash
docker-compose exec backend crontab -l
```
Debe mostrar el cron con las variables POSTGRES_*.

### Error: "password authentication failed"
Las credenciales no coinciden. Verifica el `.env` y `docker-compose.yml`.

### Backup vacío (0 bytes)
El `pg_dump` falló. Revisa:
```bash
docker-compose exec backend cat /app/backups/backup.log
```

---

## 🔐 Seguridad en Producción

### Checklist antes de Deploy

- [ ] Cambiar `SECRET_KEY` a valor aleatorio de 256 bits
- [ ] Cambiar todas las contraseñas de usuarios
- [ ] Cambiar contraseña de PostgreSQL
- [ ] Configurar HTTPS con certificado SSL
- [ ] Restringir puertos en firewall (solo 80/443)
- [ ] Configurar backups automáticos y verificarlos
- [ ] Configurar monitoreo de uptime
- [ ] Limitar intentos de login
- [ ] Configurar rate limiting en API
- [ ] Revisar permisos de archivos
- [ ] Habilitar logs de seguridad
- [ ] Documentar credenciales en lugar seguro

---

## 📞 Soporte

Para problemas, bugs o sugerencias:
- **Email**: autocaravanascordoba@gmail.com
- **Logs**: Siempre incluye logs al reportar problemas

---

## 📄 Licencia

Este proyecto es privado y propiedad de Camper Park Medina Azahara.

---

**Última actualización**: Diciembre 2024
**Versión**: 1.0
**Autor**: Rafael Orozco