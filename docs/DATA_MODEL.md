# SevaSetu data model

Core tables use UUID primary keys, `createdAt`, `updatedAt`, soft deletion where history must survive, foreign keys, and indexes for tenant/role/status/time queries.

```mermaid
erDiagram
  USER ||--o| CUSTOMER_PROFILE : has
  USER ||--o| WORKER_PROFILE : has
  WORKER_PROFILE ||--o{ WORKER_SERVICE : offers
  SERVICE ||--o{ WORKER_SERVICE : listed_by
  SERVICE_CATEGORY ||--o{ SERVICE : contains
  CUSTOMER_PROFILE ||--o{ SERVICE_REQUEST : creates
  WORKER_PROFILE ||--o{ SERVICE_REQUEST : accepts
  SERVICE_REQUEST ||--o{ REQUEST_STATUS_HISTORY : records
  SERVICE_REQUEST ||--o| REVIEW : earns
  USER ||--o{ REPORT : submits
  SERVICE_REQUEST ||--o{ REPORT : concerns
  USER ||--o{ CONVERSATION_MEMBER : joins
  CONVERSATION ||--o{ MESSAGE : contains
```

Initial Prisma entities: `User`, `CustomerProfile`, `WorkerProfile`, `ServiceCategory`, `Service`, `WorkerService`, `ServiceRequest`, `RequestStatusHistory`, `Conversation`, `ConversationMember`, `Message`, `Review`, `Report`, `Verification`, `Notification`, `SavedWorker`, `Address`, and `AuditLog`. Future payment entities remain isolated behind a payments module.