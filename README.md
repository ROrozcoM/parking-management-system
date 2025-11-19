# Caravan Parking Management System

A web application for managing caravan parking operations with automated detection and manual management capabilities.

## Features

- **Automatic Detection**: External script integration for vehicle detection
- **Stay Management**: Manage pending, active, and completed stays
- **Parking Spot Management**: Track 66 parking spots of different types (A, B, C, Special)
- **User Authentication**: JWT-based authentication for operators
- **Audit Trail**: Complete history of all actions performed by operators
- **Responsive UI**: React-based frontend with intuitive interface

## System Architecture

- **Backend**: Python with FastAPI
- **Database**: PostgreSQL with SQLAlchemy ORM
- **Frontend**: React (Single Page Application)
- **Containerization**: Docker and Docker Compose

## Prerequisites

- Docker and Docker Compose installed
- Basic knowledge of command line

## Quick Start

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd dokerized-parking-manager
   ```

2. Build and run the application:
   ```bash
   docker-compose up --build
   ```

3. Access the application:
   - Frontend: http://localhost:80
   - Backend API: http://localhost:80/api
   - API Documentation: http://localhost:80/api/docs

4. Default login credentials:
   - Username: `javi`
   - Password: `extremoduro5800`

## Detailed Setup

### Backend Setup

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

3. Run the backend server:
   ```bash
   uvicorn app.main:app --reload
   ```

### Frontend Setup

1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Run the frontend server:
   ```bash
   npm start
   ```

### Database Setup

The database is automatically set up with Docker Compose. To manually create the database tables:

1. Access the backend container:
   ```bash
   docker-compose exec backend bash
   ```

2. Run the following command:
   ```bash
   python init_db.py
   ```

## API Documentation

The API documentation is available at http://localhost:80/api/docs when the application is running.

### Key Endpoints

- `POST /api/auth/token` - Get JWT token
- `GET /api/stays/pending` - Get pending stays
- `GET /api/stays/active` - Get active stays
- `POST /api/stays/{id}/check-in` - Check-in a stay
- `POST /api/stays/{id}/check-out` - Check-out a stay
- `POST /api/stays/{id}/discard` - Discard a stay
- `POST /api/stays/manual` - Create manual entry
- `GET /api/dashboard/data` - Get dashboard data
- `GET /api/history` - Get history logs

## Workflow

1. **Detection**: External script detects vehicle and creates a pending stay
2. **Management**: Operator reviews pending stays and either:
   - **Discards** the stay (optionally blacklisting the vehicle)
   - **Checks-in** the stay, assigning a parking spot
3. **Active Stays**: Operator manages active stays and can:
   - **Check-out** the stay, calculating the final price
   - **Create manual entries** for vehicles not detected automatically
4. **History**: All actions are logged with user attribution for audit purposes

## Development

### Adding New Features

1. Backend:
   - Add new models to `backend/app/models.py`
   - Create new CRUD functions in `backend/app/crud.py`
   - Add new API endpoints in `backend/app/api/`

2. Frontend:
   - Create new components in `frontend/src/components/`
   - Add new pages in `frontend/src/pages/`
   - Update API service in `frontend/src/services/api.js`

### Database Migrations

To create a new migration:

1. Access the backend container:
   ```bash
   docker-compose exec backend bash
   ```

2. Create a migration:
   ```bash
   alembic revision --autogenerate -m "Description of changes"
   ```

3. Apply the migration:
   ```bash
   alembic upgrade head
   ```

## Troubleshooting

### Common Issues

1. **Database Connection Issues**:
   - Ensure PostgreSQL is running: `docker-compose ps`
   - Check database connection string in backend environment variables

2. **Frontend Cannot Connect to Backend**:
   - Check that both services are running: `docker-compose ps`
   - Verify API proxy configuration in nginx.conf

3. **Authentication Issues**:
   - Verify JWT secret key is set correctly
   - Check that token is being stored in localStorage

### Logs

To view logs for a specific service:
```bash
docker-compose logs [service-name]
```

Example:
```bash
docker-compose logs backend
```

## License

This project is licensed under the MIT License.