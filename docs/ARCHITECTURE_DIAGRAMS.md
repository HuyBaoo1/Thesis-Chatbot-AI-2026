# Sơ đồ kiến trúc trực quan - A20 App

Tài liệu này tập hợp các sơ đồ Mermaid để nhìn nhanh kiến trúc, luồng chính, mô hình dữ liệu và các cơ chế vận hành quan trọng của hệ thống.

## 1) Sơ đồ kiến trúc tổng quát theo lớp
```mermaid
flowchart TB
  subgraph L1[Experience Layer]
    PUB[Public Web App]
    ADM[Admin Dashboard]
    TEL[Telegram User]
  end

  subgraph L2[Edge and API Access]
    VERCEL[Vercel Frontend Hosting]
    API[FastAPI API Gateway]
    RT[SSE / WebSocket Endpoints]
  end

  subgraph L3[Application Services]
    AUTH[Auth Service]
    CHAT[Chat and RAG Service]
    LEAD[Lead Service]
    KB[Knowledge Service]
    OCR[OCR Service]
    CRAWL[Crawl Service]
    ANL[Analytics Service]
    NOTI[Notification Service]
  end

  subgraph L4[Async Processing]
    QUEUE[Redis Queue]
    WORKER[RQ Workers]
  end

  subgraph L5[Data Layer]
    PG[(PostgreSQL)]
    REDIS[(Redis Cache / PubSub)]
    QDRANT[(Qdrant Vector DB)]
    R2[(Cloudflare R2)]
  end

  subgraph L6[External Integrations]
    OPENAI[OpenAI API]
    FIRECRAWL[Firecrawl API]
    TGBOT[Telegram Bot API]
  end

  PUB --> VERCEL --> API
  ADM --> VERCEL --> API
  TEL --> TGBOT --> API

  API --> AUTH
  API --> CHAT
  API --> LEAD
  API --> KB
  API --> OCR
  API --> CRAWL
  API --> ANL
  API --> NOTI
  API --> RT

  CHAT --> OPENAI
  CRAWL --> FIRECRAWL

  OCR --> QUEUE --> WORKER
  KB --> QUEUE
  WORKER --> QDRANT
  WORKER --> R2
  WORKER --> PG

  CHAT --> QDRANT
  CHAT --> PG
  CHAT --> REDIS
  LEAD --> PG
  KB --> PG
  CRAWL --> PG
  RT --> REDIS
```

## 2) Sơ đồ luồng Chat RAG
```mermaid
flowchart LR
  U[User Question] --> FE[Web or Telegram Client]
  FE --> API[FastAPI /api/chat]
  API --> ID[Lead and Conversation Identify]
  ID --> RET[Hybrid Retrieval]
  RET --> VEC[Vector Search Qdrant]
  RET --> KW[Keyword and BM25 Search]
  VEC --> CTX[Context Assembly]
  KW --> CTX
  CTX --> LLM[OpenAI Synthesis]
  LLM --> RESP[Answer and Citations]
  RESP --> SAVE[Save Message and Usage]
  SAVE --> PG[(PostgreSQL)]
  SAVE --> REDIS[(Redis Cache and Event)]
  RESP --> FE
```

## 3) Sơ đồ luồng OCR/Crawl ingest tri thức
```mermaid
flowchart LR
  A[Admin Upload File or Submit URL] --> B[API OCR or Crawl Router]
  B --> C[Push Job to Redis Queue]
  C --> D[RQ Worker]
  D --> E[OCR / Extraction / Chunking]
  E --> F[Embedding Generation]
  F --> G[Upsert to Qdrant]
  E --> H[Store Artifact to R2]
  E --> I[Store Metadata to PostgreSQL]
```

## 4) Sơ đồ triển khai (Deployment)
```mermaid
flowchart TB
  subgraph Client
    Browser[Browser]
    TelegramClient[Telegram Client]
  end

  subgraph Vercel
    PublicSite[Public App]
    AdminSite[Admin App]
  end

  subgraph Railway
    Backend[FastAPI Container]
    Worker[RQ Worker Container]
  end

  subgraph DataServices
    Postgres[(PostgreSQL)]
    Redis[(Redis)]
    Qdrant[(Qdrant)]
    R2[(Cloudflare R2)]
  end

  subgraph External
    OpenAI[OpenAI]
    Firecrawl[Firecrawl]
    TgAPI[Telegram Bot API]
  end

  Browser --> PublicSite
  Browser --> AdminSite
  PublicSite --> Backend
  AdminSite --> Backend
  TelegramClient --> TgAPI --> Backend
  Backend --> Postgres
  Backend --> Redis
  Backend --> Qdrant
  Backend --> R2
  Backend --> OpenAI
  Backend --> Firecrawl
  Worker --> Redis
  Worker --> Postgres
  Worker --> Qdrant
  Worker --> R2
```

## 5) Sequence realtime (SSE)
```mermaid
sequenceDiagram
  participant C as Admin Client
  participant A as FastAPI Realtime
  participant R as Redis PubSub
  participant S as Chat Service

  C->>A: Open SSE stream
  A->>R: Subscribe channel (chat:*, lead:*)
  S->>R: Publish event (new_message or lead_update)
  R-->>A: Event payload
  A-->>C: SSE push event
```

## 6) ERD cốt lõi
```mermaid
erDiagram
  STAFF {
    uuid id PK
    string name
    string email
    enum role
    boolean is_active
  }

  LEAD {
    uuid id PK
    string full_name
    string email
    string phone
    enum status
    enum temperature
    int score
    uuid assigned_staff_id FK
  }

  CONVERSATION {
    uuid id PK
    uuid lead_id FK
    uuid staff_id FK
    enum channel
    enum status
    string external_id
  }

  MESSAGE {
    uuid id PK
    uuid conversation_id FK
    enum role
    text content
    string intent
    boolean is_fallback
  }

  MAJOR {
    uuid id PK
    string code
    string name
    enum major_type
    boolean is_active
  }

  KNOWLEDGE_CHUNK {
    uuid id PK
    uuid major_id FK
    enum category
    string title
    text content
    boolean needs_embedding
  }

  LEAD_ACTIVITY {
    uuid id PK
    uuid lead_id FK
    string action
    int score_delta
  }

  LEAD_MAJOR_INTEREST {
    uuid lead_id PK
    uuid major_id PK
    int priority
  }

  MESSAGE_CHUNK_USAGE {
    uuid id PK
    uuid message_id FK
    uuid chunk_id FK
    int rank
    float score
  }

  STAFF ||--o{ LEAD : assigned_to
  STAFF ||--o{ CONVERSATION : handles
  LEAD ||--o{ CONVERSATION : owns
  CONVERSATION ||--o{ MESSAGE : contains
  MAJOR ||--o{ KNOWLEDGE_CHUNK : has
  LEAD ||--o{ LEAD_ACTIVITY : generates
  LEAD ||--o{ LEAD_MAJOR_INTEREST : selects
  MAJOR ||--o{ LEAD_MAJOR_INTEREST : interested_in
  MESSAGE ||--o{ MESSAGE_CHUNK_USAGE : uses
  KNOWLEDGE_CHUNK ||--o{ MESSAGE_CHUNK_USAGE : referenced_by
```

## 7) Use Case Diagram
Lưu ý: Mermaid chưa có UML use case gốc, nên sơ đồ dưới đây dùng `flowchart` để biểu diễn cùng ý nghĩa.

```mermaid
flowchart LR
  Student[Thi sinh]
  Staff[Tu van vien / Admin]
  Telegram[Telegram User]

  subgraph SYS[A20 Admissions Counseling System]
    UC1([Dat cau hoi tuyen sinh])
    UC2([Nhan cau tra loi AI])
    UC3([De lai thong tin lead])
    UC4([Yeu cau lien he tu van vien])
    UC5([Dang nhap dashboard])
    UC6([Quan ly leads va hoi thoai])
    UC7([Tra loi hoi thoai / handoff])
    UC8([Quan ly knowledge base])
    UC9([Upload tai lieu OCR / Crawl URL])
    UC10([Xem dashboard va analytics])
    UC11([Nhan cap nhat realtime])
  end

  Student --> UC1
  Student --> UC2
  Student --> UC3
  Student --> UC4

  Telegram --> UC1
  Telegram --> UC2
  Telegram --> UC4

  Staff --> UC5
  Staff --> UC6
  Staff --> UC7
  Staff --> UC8
  Staff --> UC9
  Staff --> UC10
  Staff --> UC11

  UC1 --> UC2
  UC3 --> UC6
  UC4 --> UC7
  UC8 --> UC1
  UC9 --> UC8
  UC6 --> UC10
```

## 8) Database ERD mở rộng
```mermaid
erDiagram
  LEAD ||--o{ CONVERSATION : has
  LEAD ||--o{ APPLICATION : applies
  LEAD ||--o{ LEAD_MAJOR_INTEREST : interested_in
  LEAD ||--o{ LEAD_ACTIVITY : logged
  LEAD ||--o{ NOTIFICATION : receives
  LEAD }o--|| STAFF : assigned_to

  CONVERSATION ||--o{ MESSAGE : contains
  CONVERSATION }o--|| STAFF : handled_by
  CONVERSATION ||--o{ NOTIFICATION : triggers

  MESSAGE ||--o{ MESSAGE_CHUNK_USAGE : used_chunks
  MESSAGE_CHUNK_USAGE }o--|| KNOWLEDGE_CHUNK : references

  MAJOR ||--o{ APPLICATION : applications
  MAJOR ||--o{ LEAD_MAJOR_INTEREST : interested_leads
  MAJOR ||--o{ KNOWLEDGE_CHUNK : knowledge
  MAJOR ||--o{ TUITION_POLICY : tuition
  MAJOR ||--o{ SCHOLARSHIP_POLICY : scholarships

  STAFF ||--o{ LEAD : manages
  STAFF ||--o{ CONVERSATION : handles
  STAFF ||--o{ NOTIFICATION : notified

  FAQ_ANALYTICS }o--|| CONVERSATION : last_seen_in
  FAQ_ANALYTICS }o--|| MESSAGE : user_msg
  FAQ_ANALYTICS }o--|| MESSAGE : assistant_msg

  CRAWL_SESSION ||--o{ CRAWL_PAGE_JOB : pages

  LEAD {
    uuid id PK
    string full_name
    string email UK
    string phone UK
    string high_school
    string province
    enum status
    enum temperature
    int score
    float gpa
    float ielts
    int sat
    int act
    uuid assigned_staff_id FK
    datetime last_interaction_at
  }

  STAFF {
    uuid id PK
    string name
    string email UK
    string password
    enum role
    bool is_active
  }

  CONVERSATION {
    uuid id PK
    uuid lead_id FK
    uuid staff_id FK
    enum channel
    enum status
    string summary
    string source_domain
    datetime ai_fallback_deadline_at
  }

  MESSAGE {
    uuid id PK
    uuid conversation_id FK
    enum role
    text content
    string intent
    bool is_fallback
    json citations_json
  }

  MESSAGE_CHUNK_USAGE {
    uuid id PK
    uuid message_id FK
    uuid chunk_id FK
    int rank
    float score
    text content
    string category
    string source
  }

  KNOWLEDGE_CHUNK {
    uuid id PK
    uuid major_id FK
    enum category
    string title
    text content
    json metadata_json
    int year
    string source
    string source_url
    int version
    bool is_active
    bool needs_embedding
  }

  MAJOR {
    uuid id PK
    string code UK
    string name
    text description
    int duration
    int credits
    string degree_type
    enum major_type
    bool is_active
  }

  APPLICATION {
    uuid id PK
    uuid lead_id FK
    uuid major_id FK
    enum stage
    int admission_year
    string round_name
    string source_channel
  }

  TUITION_POLICY {
    uuid id PK
    uuid major_id FK
    int year
    enum fee_type
    float base_fee
    bool is_active
  }

  SCHOLARSHIP_POLICY {
    uuid id PK
    uuid major_id FK
    int year
    string name
    enum type
    enum scope
    enum value_type
    float value
    json criteria
    bool is_active
  }

  LEAD_MAJOR_INTEREST {
    uuid lead_id PK
    uuid major_id PK
    int priority
  }

  LEAD_ACTIVITY {
    uuid id PK
    uuid lead_id FK
    string action
    int score_delta
    json extra_data
  }

  NOTIFICATION {
    uuid id PK
    uuid lead_id FK
    uuid conversation_id FK
    uuid staff_id FK
    enum type
    enum target
    string content
    bool is_read
    enum status
  }

  FAQ_ANALYTICS {
    uuid id PK
    string question
    string normalized UK
    string intent
    int count
    bool is_fallback
    uuid last_conversation_id FK
    uuid last_user_message_id FK
    uuid last_assistant_message_id FK
    datetime last_asked_at
  }

  DAILY_ANALYTIC {
    uuid id PK
    date date UK
    int total_chats
    int new_leads
    int fallbacks
    json top_intents
  }

  CRAWL_SESSION {
    uuid id PK
    string target_url
    int limit
    enum status
    int total_pages
    int completed_pages
  }

  CRAWL_PAGE_JOB {
    uuid id PK
    uuid crawl_session_id FK
    string source_url
    string detected_title
    int page_index
    string md_r2_key
    string status
    json suggested_metadata
    string sent_to_kb
  }

  OCR_JOB {
    uuid id PK
    string rq_job_id UK
    string original_filename
    string source_file_hash
    string content_hash
    string source_r2_key
    string md_r2_key
    string title
    int year
    string category
    string status
    string sent_to_kb
  }
```

## 9) Auth Flow - JWT Cookie-based Sequence
```mermaid
sequenceDiagram
  actor U as Staff User
  participant FE as Admin Frontend
  participant API as FastAPI /api/auth
  participant DB as PostgreSQL
  participant R as Redis Rate Limit

  Note over U,R: Login
  U->>FE: Nhap email + password
  FE->>API: POST /api/auth/login
  API->>R: Check rate limit
  R-->>API: OK
  API->>DB: SELECT staff by email
  DB-->>API: Staff record
  API->>API: bcrypt.verify(password, hash)
  API->>API: Create access_token
  API->>API: Create refresh_token
  API-->>FE: Set-Cookie access_token + refresh_token
  API-->>FE: Return user profile
  FE->>U: Redirect to /admin

  Note over U,R: Access protected resource
  U->>FE: Open /admin/leads
  FE->>API: GET /api/lead with access_token
  API->>API: jwt.decode(access_token)
  alt Token valid
    API-->>FE: 200 OK + data
  else Token expired
    API-->>FE: 401 Unauthorized
    FE->>API: POST /api/auth/refresh-token
    API->>API: Verify refresh token + fingerprint
    API->>API: Rotate new tokens
    API-->>FE: Set-Cookie new tokens
    FE->>API: Retry GET /api/lead
    API-->>FE: 200 OK + data
  end

  Note over U,R: Logout
  U->>FE: Click Logout
  FE->>API: POST /api/auth/logout
  API-->>FE: Delete-Cookie access_token, refresh_token
  FE->>U: Redirect to /login
```

## 10) Lead State Machine
```mermaid
stateDiagram-v2
  direction LR

  [*] --> NEW: Lead created
  NEW --> CONTACTED: Staff contacts lead
  NEW --> LOST: No response or invalid lead

  CONTACTED --> QUALIFIED: Eligible after review
  CONTACTED --> LOST: Declined or unreachable

  QUALIFIED --> APPLIED: Lead submits application
  QUALIFIED --> LOST: Loses interest

  APPLIED --> ENROLLED: Enrolls
  APPLIED --> LOST: Chooses another path

  LOST --> NEW: Re-engage
```

### Application Stage
```mermaid
stateDiagram-v2
  direction LR

  [*] --> NEW: Create application
  NEW --> PROFILE_SUBMITTED: Submit profile
  PROFILE_SUBMITTED --> DOCUMENT_REVIEW: Review documents
  DOCUMENT_REVIEW --> INTERVIEW: Invite interview
  INTERVIEW --> OFFER_EXTENDED: Send offer
  OFFER_EXTENDED --> ENROLLED: Accept offer

  DOCUMENT_REVIEW --> REJECTED: Rejected
  INTERVIEW --> REJECTED: Rejected
  OFFER_EXTENDED --> REJECTED: Decline offer
```

### Conversation Status
```mermaid
stateDiagram-v2
  direction LR

  [*] --> OPEN: Start conversation
  OPEN --> HANDOFF: Request human support
  HANDOFF --> OPEN: AI fallback timeout
  HANDOFF --> CLOSED: Resolved by staff
  OPEN --> CLOSED: Conversation finished
```

## 11) Human Handoff Flow - Sequence Diagram
```mermaid
sequenceDiagram
  actor U as User
  participant FE as Chat Widget
  participant API as FastAPI /api/chat
  participant AI as Chat RAG Pipeline
  participant Redis as Redis PubSub
  participant Staff as Staff Dashboard
  participant Sched as Fallback Scheduler
  participant DB as PostgreSQL

  Note over U,DB: Normal AI chat
  U->>FE: Send question
  FE->>API: POST /api/chat/query
  API->>AI: Run pipeline
  AI-->>API: Answer + citations
  API-->>FE: AI response

  Note over U,DB: User requests human
  U->>FE: Need counselor support
  FE->>API: POST /api/chat/query
  API->>API: Intent = handoff request
  API->>DB: Update conversation status = HANDOFF
  API->>DB: Set ai_fallback_deadline_at
  API->>Redis: Publish handoff requested
  Redis-->>Staff: SSE notification
  API-->>FE: Waiting message

  Note over U,DB: Staff claims conversation
  Staff->>API: POST /api/conversation/:id/claim
  API->>DB: Assign staff_id and clear deadline
  API->>Redis: Publish staff joined
  Redis-->>FE: SSE push
  FE-->>U: Counselor joined

  Note over U,DB: Staff unavailable, AI fallback
  Sched->>DB: Find expired HANDOFF conversations
  DB-->>Sched: Expired rows
  Sched->>DB: Reset status to OPEN
  Sched->>DB: Insert fallback AI message
  Sched->>Redis: Publish new message event
  Redis-->>FE: SSE push
  FE-->>U: AI resumes support
```

## 12) C4 Model - Context and Container
### C4 Level 1 - System Context
```mermaid
flowchart TB
  U[Prospective Student]
  S[Counselor or Admin]

  A20[A20 Admissions System]
  Telegram[Telegram Platform]
  OpenAI[OpenAI API]
  Firecrawl[Firecrawl API]

  U -->|Chat Widget or Telegram| A20
  S -->|Manage leads, chat, knowledge| A20
  A20 -->|Bot API| Telegram
  A20 -->|Chat and Embeddings| OpenAI
  A20 -->|Web Crawling| Firecrawl
```

### C4 Level 2 - Container Diagram
```mermaid
flowchart TB
  subgraph Student
    Browser[Web Browser]
    TgApp[Telegram App]
  end

  subgraph Staff
    AdminBrowser[Admin Browser]
  end

  subgraph Vercel
    PublicApp[Public SPA - React + Vite]
    AdminApp[Admin SPA - React + Vite]
  end

  subgraph Railway
    API2[FastAPI API Server]
    Worker2[RQ Worker]
  end

  subgraph Data
    PG2[(PostgreSQL)]
    Redis2[(Redis)]
    Qdrant2[(Qdrant)]
    R22[(Cloudflare R2)]
  end

  subgraph ExternalAPIs
    OAI[OpenAI]
    Gem[Gemini Flash]
    FC[Firecrawl]
    TG2[Telegram Bot API]
  end

  Browser --> PublicApp
  AdminBrowser --> AdminApp
  TgApp --> TG2
  TG2 --> API2

  PublicApp --> API2
  AdminApp --> API2

  API2 --> PG2
  API2 --> Redis2
  API2 --> Qdrant2
  API2 --> R22
  API2 --> OAI
  API2 --> Gem
  API2 --> FC

  Worker2 --> Redis2
  Worker2 --> PG2
  Worker2 --> Qdrant2
  Worker2 --> R22
  Worker2 --> OAI
  Worker2 --> FC
```

---

## 13) Gợi ý sử dụng khi thuyết trình
- Slide 1: Sơ đồ tổng quát theo lớp.
- Slide 2: Luồng Chat RAG.
- Slide 3: Luồng OCR/Crawl.
- Slide 4: Deployment + Realtime.
- Slide 5: ERD cốt lõi.
- Slide 6: Use Case Diagram.
- Slide 7: Auth Flow.
- Slide 8: Lead State Machine.
- Slide 9: Human Handoff Flow.
- Slide 10: C4 Context + Container.
- Phụ lục kỹ thuật: Database ERD mở rộng.
