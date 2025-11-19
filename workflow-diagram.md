# Caravan Parking Management System - Workflow Diagram

## System Workflow Overview

```mermaid
flowchart TD
    A[External Detection Script] -->|Creates| B[Pending Stay]
    B --> C{Operator Review}
    C -->|Discard| D[Discard Stay]
    C -->|Check-in| E[Active Stay]
    E --> F{Operator Action}
    F -->|Check-out| G[Completed Stay]
    F -->|Manual Entry| H[Manual Active Stay]
    H --> F
    D --> I[History Log]
    E --> I
    G --> I
```

## Detailed Stay Management Workflow

```mermaid
flowchart TD
    subgraph Detection Process
        A1[Camera detects vehicle] --> A2[Extract license plate]
        A2 --> A3[Create pending stay in DB]
        A3 --> A4[Status: pending]
    end
    
    subgraph Pending Stay Management
        B1[Operator views pending stays] --> B2{Decision}
        B2 -->|Discard| B3[Select reason]
        B3 --> B4{Reason is 'sedan'?}
        B4 -->|Yes| B5[Blacklist vehicle]
        B4 -->|No| B6[Update status to discarded]
        B5 --> B6
        B6 --> B7[Create history log]
        
        B2 -->|Check-in| B8[Select spot type]
        B8 --> B9[Find available spot]
        B9 --> B10[Assign spot to stay]
        B10 --> B11[Update status to active]
        B11 --> B12[Create history log]
    end
    
    subgraph Active Stay Management
        C1[Operator views active stays] --> C2{Decision}
        C2 -->|Check-out| C3[Calculate price]
        C3 --> C4[Confirm final price]
        C4 --> C5[Update status to completed]
        C5 --> C6[Record exit time]
        C6 --> C7[Free parking spot]
        C7 --> C8[Create history log]
        
        C2 -->|Manual Entry| C9[Enter vehicle details]
        C9 --> C10[Select spot type]
        C10 --> C11[Create active stay]
        C11 --> C12[Assign spot to stay]
        C12 --> C13[Create history log]
    end
    
    A3 --> B1
    B7 --> HistoryLog
    B12 --> HistoryLog
    C8 --> HistoryLog
    C13 --> HistoryLog
```

## Database Schema Relationships

```mermaid
erDiagram
    User ||--o{ Stay : "manages"
    User ||--o{ HistoryLog : "performs"
    Vehicle ||--o{ Stay : "has"
    ParkingSpot ||--o{ Stay : "assigned to"
    Stay ||--o{ HistoryLog : "logged in"
    
    User {
        int id PK
        string username UK
        string hashed_password
        boolean is_active
    }
    
    Vehicle {
        int id PK
        string license_plate UK
        string vehicle_type
        string brand nullable
        string country nullable
        boolean is_blacklisted
    }
    
    ParkingSpot {
        int id PK
        string spot_number UK
        enum spot_type
        boolean is_occupied
    }
    
    Stay {
        int id PK
        int vehicle_id FK
        int parking_spot_id FK nullable
        datetime detection_time
        datetime check_in_time nullable
        datetime check_out_time nullable
        enum status
        float final_price nullable
        int user_id FK nullable
    }
    
    HistoryLog {
        int id PK
        int stay_id FK
        string action
        datetime timestamp
        json details nullable
        int user_id FK
    }
```

## Stay Status Transitions

```mermaid
stateDiagram-v2
    [*] --> Pending: External detection
    Pending --> Active: Check-in
    Pending --> Discarded: Discard
    Active --> Completed: Check-out
    Active --> Discarded: Discard
    Completed --> [*]
    Discarded --> [*]
    
    note right of Pending
        Created by external script
        Awaiting operator review
    end note
    
    note right of Active
        Vehicle is parked
        Occupying a spot
    end note
    
    note right of Completed
        Stay finished
        Price recorded
    end note
    
    note right of Discarded
        False detection
        Or unauthorized vehicle
    end note
```

## Authentication and Authorization Flow

```mermaid
sequenceDiagram
    participant User
    participant Frontend
    participant Backend
    participant Database
    
    User->>Frontend: Enter credentials
    Frontend->>Backend: POST /api/auth/token
    Backend->>Database: Verify credentials
    Database-->>Backend: User data
    Backend->>Backend: Generate JWT
    Backend-->>Frontend: JWT token
    Frontend->>Frontend: Store token in localStorage
    Frontend->>Backend: API request with JWT
    Backend->>Backend: Validate JWT
    Backend->>Database: Get user data
    Database-->>Backend: User data
    Backend-->>Frontend: Response
    Frontend->>User: Display data
```

## Frontend Component Structure

```mermaid
graph TD
    App[App.js] --> Router[React Router]
    Router --> Login[Login Page]
    Router --> Dashboard[Dashboard Page]
    Router --> History[History Page]
    
    Dashboard --> Header[Header Component]
    Dashboard --> Footer[Footer Component]
    Dashboard --> PendingCard[Pending Stays Card]
    Dashboard --> ActiveCard[Active Stays Card]
    
    PendingCard --> CheckInModal[Check-in Modal]
    PendingCard --> DiscardModal[Discard Modal]
    
    ActiveCard --> CheckOutModal[Check-out Modal]
    ActiveCard --> ManualEntryModal[Manual Entry Modal]
    
    Login --> AuthContext[Auth Context]
    Dashboard --> AuthContext
    History --> AuthContext
    
    AuthContext --> API[API Service]
    CheckInModal --> API
    DiscardModal --> API
    CheckOutModal --> API
    ManualEntryModal --> API
```

## Docker Architecture

```mermaid
graph TD
    subgraph Docker Compose
        DB[(PostgreSQL)]
        Backend[FastAPI Backend]
        Frontend[React Frontend]
        Nginx[Nginx Proxy]
        
        DB -->|Database connection| Backend
        Backend -->|API calls| Frontend
        Frontend -->|Static files| Nginx
        Backend -->|API endpoints| Nginx
        
        User[User Browser] -->|HTTP requests| Nginx
        Nginx -->|Proxy to frontend| Frontend
        Nginx -->|Proxy to API| Backend
    end
    
    subgraph Volumes
        PostgreSQL_Data[(PostgreSQL Data)]
    end
    
    DB --> PostgreSQL_Data
```

## API Endpoint Structure

```mermaid
graph LR
    subgraph Authentication
        A1[POST /api/auth/token]
        A2[GET /api/auth/users/me]
    end
    
    subgraph Stays Management
        B1[GET /api/stays/pending]
        B2[GET /api/stays/active]
        B3[POST /api/stays/{id}/check-in]
        B4[POST /api/stays/{id}/check-out]
        B5[POST /api/stays/{id}/discard]
        B6[POST /api/stays/manual]
    end
    
    subgraph Dashboard
        C1[GET /api/dashboard/data]
    end
    
    subgraph History
        D1[GET /api/history]
    end
    
    A1 -->|JWT Token| B1
    A1 -->|JWT Token| B2
    A1 -->|JWT Token| B3
    A1 -->|JWT Token| B4
    A1 -->|JWT Token| B5
    A1 -->|JWT Token| B6
    A1 -->|JWT Token| C1
    A1 -->|JWT Token| D1