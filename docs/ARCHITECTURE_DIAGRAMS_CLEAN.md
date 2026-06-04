# Sơ đồ Kiến trúc - Clean Versions

Phiên bản clean của các sơ đồ Mermaid, giữ nguyên nội dung nhưng tổ chức lại cho dễ đọc và trình bày.

---

## 1. Sơ đồ Deployment (Triển khai)

```mermaid
%%{init: {'theme': 'base', 'themeVariables': { 'primaryColor': '#4A90D9', 'primaryTextColor': '#fff'}}}%%
flowchart TB
    subgraph Client["🌐 Client Layer"]
        Browser["🖥️ Browser"]
        Telegram["💬 Telegram App"]
    end

    subgraph Hosting["☁️ Hosting"]
        Vercel["▲ Vercel"]
        Railway["🚂 Railway"]
    end

    subgraph Services["⚙️ Services"]
        API["FastAPI Backend"]
        Worker["RQ Worker"]
    end

    subgraph Data["💾 Data Layer"]
        PG["PostgreSQL"]
        Redis["Redis"]
        Qdrant["Qdrant Vector DB"]
        R2["Cloudflare R2"]
    end

    subgraph External["🔗 External APIs"]
        OpenAI["OpenAI GPT-4o"]
        Gemini["Gemini Flash"]
        Firecrawl["Firecrawl"]
        TelegramBot["Telegram Bot"]
    end

    Browser --> Vercel
    Telegram --> TelegramBot
    Vercel --> API
    TelegramBot --> API
    API <--> Services
    API <--> Data
    API <--> External
    Worker <--> Data
    Worker <--> External

    style Vercel fill:#000,color:#fff
    style Railway fill:#000,color:#fff
    style PG fill:#336791,color:#fff
    style Redis fill:#DC382D,color:#fff
    style Qdrant fill:#6ASE00,color:#000
    style R2 fill:#F7485B,color:#fff
```

**Render:** [Mermaid Live Editor](https://mermaid.live/edit#pako:eNo9zz1OwzAQhV_l5FgqLlKhVCp1CCGKFBcGN2BmwsLkNOkGpuYIwdAPEU_c-PVJlqT-e_ze2I6lZEvyR6Kf7X3bdnY_8p1t3WFP6N0K7X2n2s6P7i5O2K8qJ-vqR9H4KzK9pXU3mV7T9Kf6o9dHdl0q3T7V1K9Jf8bJ9t7q3tK4r0y2l3i2hXUrqRyV2Z2V3Z3Z3Z3Z3Z3Z3Z)

---

## 2. Sơ đồ Chat RAG Flow

```mermaid
%%{init: {'theme': 'base'}}%%
flowchart TB
    START["👤 User Question"] --> API
    
    subgraph API["FastAPI /api/chat"]
        ROUTE["Router - Intent Classification"]
        RETRIEVE["Hybrid Retrieval"]
        SYNTHESIZE["GPT-4o Synthesis"]
    end
    
    subgraph Retrieval["🔍 Retrieval"]
        VEC["Vector Search"]
        BM25["BM25 Keyword Search"]
        MERGE["Merge & Rerank"]
    end
    
    subgraph Storage["💾 Storage"]
        PG["PostgreSQL"]
        REDIS["Redis Cache"]
    end
    
    API --> ROUTE
    
    ROUTE -->|"Tuition/Scholarship/etc"| RETRIEVE
    ROUTE -->|"Ambiguous"| CLARIFY["❓ Ask Clarification"]
    
    RETRIEVE --> VEC
    RETRIEVE --> BM25
    VEC --> MERGE
    BM25 --> MERGE
    MERGE --> SYNTHESIZE
    SYNTHESIZE --> RESP["📝 Answer + Citations"]
    
    RESP --> PG
    RESP --> REDIS
    RESP --> END["👤 User"]
    
    CLARIFY --> END

    style START fill:#4CAF50,color:#fff
    style END fill:#4CAF50,color:#fff
    style CLARIFY fill:#FF9800,color:#fff
    style RESP fill:#2196F3,color:#fff
```

---

## 3. Lead State Machine

```mermaid
%%{init: {'theme': 'base'}}%%
stateDiagram-v2
    direction LR
    
    [*] --> NEW: Tao lead moi
    NEW --> CONTACTED: Nhan vien lien he
    NEW --> LOST: Khong phan hoi
    
    CONTACTED --> QUALIFIED: Du dieu kien
    CONTACTED --> LOST: Tu choi
    
    QUALIFIED --> APPLIED: Nop ho so
    QUALIFIED --> LOST: Mat quan tam
    
    APPLIED --> ENROLLED: Nhap hoc
    APPLIED --> LOST: Chon truong khac
    
    LOST --> NEW: Tai kich hoat
```

---

## 4. Application Stage Flow

```mermaid
%%{init: {'theme': 'base'}}%%
stateDiagram-v2
    direction LR
    
    [*] --> NEW
    NEW --> PROFILE: Nop ho so
    PROFILE --> DOCUMENTS: Nop giay to
    DOCUMENTS --> INTERVIEW: Phong van
    INTERVIEW --> OFFER: Moi nhap hoc
    OFFER --> ENROLLED: Chap nhan
    
    DOCUMENTS --> REJECTED: Khong dat
    INTERVIEW --> REJECTED: Khong dat
    OFFER --> REJECTED: Tu choi
```

---

## 5. Human Handoff Flow

```mermaid
%%{init: {'theme': 'base'}}%%
sequenceDiagram
    participant U as 👤 User
    participant FE as 💬 Chat Widget
    participant API as ⚡ FastAPI
    participant AI as 🤖 AI Chat
    participant Redis as 📡 Redis PubSub
    participant Staff as 👨‍💼 Staff Dashboard

    rect rgb(200, 230, 200)
        Note over U,AI: 🤖 AI tự động trả lời
        U->>FE: Gửi câu hỏi
        FE->>API: POST /api/chat/query
        API->>AI: Run RAG pipeline
        AI-->>API: Answer + citations
        API-->>FE: AI response
        FE-->>U: Hiển thị câu trả lời
    end

    rect rgb(255, 230, 200)
        Note over U,Staff: 🙋 User yêu cầu hỗ trợ
        U->>FE: Cần tư vấn viên
        FE->>API: POST /api/chat/query
        API->>API: Detect handoff intent
        API->>Redis: Publish handoff event
        Redis-->>Staff: 🔔 SSE notification
        API-->>FE: Đang chờ tư vấn viên...
        Staff->>API: Claim conversation
        API-->>Redis: Publish staff joined
        Redis-->>FE: Tư vấn viên đã tham gia
        FE-->>U: Tư vấn viên đang trả lời
    end

    rect rgb(255, 200, 200)
        Note over U,AI: ⏰ Timeout - AI fallback
        Sched->>API: Check expired handoffs
        API->>API: Reset status to OPEN
        API->>Redis: Insert AI fallback message
        Redis-->>FE: SSE push
        FE-->>U: AI tiếp tục hỗ trợ
    end
```

---

## 6. Auth Flow (JWT)

```mermaid
%%{init: {'theme': 'base'}}%%
sequenceDiagram
    participant U as 👤 Staff
    participant FE as 💻 Admin Frontend
    participant API as ⚡ FastAPI Auth
    participant DB as 🗄️ PostgreSQL
    participant R as 📊 Redis Rate Limit

    rect rgb(200, 220, 255)
        Note over U,DB: 🔐 Login
        U->>FE: Nhập email + password
        FE->>API: POST /api/auth/login
        API->>R: Check rate limit
        R-->>API: OK
        API->>DB: SELECT staff by email
        DB-->>API: Staff record
        API->>API: bcrypt.verify()
        API->>API: Create JWT tokens
        API-->>FE: Set-Cookie + profile
        FE->>U: Redirect /admin
    end

    rect rgb(220, 255, 220)
        Note over U,DB: 🔄 Token refresh
        FE->>API: GET /api/resource
        API->>API: Verify JWT
        API-->>FE: 401 Token expired
        FE->>API: POST /api/auth/refresh
        API->>API: Verify refresh token
        API-->>FE: New tokens
        FE->>API: Retry request
        API-->>FE: 200 OK
    end

    rect rgb(255, 220, 220)
        Note over U,DB: 🚪 Logout
        U->>FE: Click Logout
        FE->>API: POST /api/auth/logout
        API-->>FE: Clear cookies
        FE->>U: Redirect /login
    end
```

---

## 7. Knowledge Ingestion Flow

```mermaid
%%{init: {'theme': 'base'}}%%
flowchart TB
    START["📄 Admin Upload / URL"] --> ROUTER
    
    subgraph Process["⚙️ Xử lý"]
        ROUTER["Router: OCR / Crawl"]
        QUEUE["📤 Redis Queue"]
        WORKER["👷 RQ Worker"]
    end
    
    subgraph Extract["🔬 Trích xuất"]
        OCR["OCR / Parse Text"]
        CHUNK["Chunking"]
        EMBED["Embedding"]
    end
    
    subgraph Store["💾 Lưu trữ"]
        QDRANT["Qdrant Vector DB"]
        R2["Cloudflare R2"]
        PG["PostgreSQL"]
    end
    
    ROUTER -->|"File upload"| OCR
    ROUTER -->|"URL crawl"| CRAWL["🌐 Firecrawl Crawl"]
    
    OCR --> CHUNK
    CRAWL --> CHUNK
    
    CHUNK --> EMBED
    CHUNK --> R2
    
    EMBED --> QDRANT
    CHUNK --> PG
    
    style START fill:#4CAF50,color:#fff
    style QDRANT fill:#6ASE00,color:#000
    style R2 fill:#F7485B,color:#fff
    style PG fill:#336791,color:#fff
```

---

## 8. C4 Context Diagram

```mermaid
%%{init: {'theme': 'base'}}%%
flowchart TB
    subgraph External["Hệ thống ngoài"]
        Student["🎓 Thí sinh"]
        Staff["👨‍💼 Nhân viên tư vấn"]
        Telegram["💬 Telegram"]
    end

    subgraph A20System["A20 Admissions System"]
        subgraph Frontend
            PublicApp["🌐 Public Chat App"]
            AdminApp["👨‍💼 Admin Dashboard"]
        end
        
        subgraph Backend
            API["⚡ FastAPI"]
            AI["🤖 AI Chat Service"]
            Worker["👷 RQ Worker"]
        end
        
        subgraph Data
            PG["🗄️ PostgreSQL"]
            Qdrant["🔢 Qdrant"]
            Redis["📡 Redis"]
        end
    end

    subgraph ThirdParty["Bên thứ 3"]
        OpenAI["🤖 OpenAI"]
        Firecrawl["🌐 Firecrawl"]
    end

    Student --> PublicApp
    Staff --> AdminApp
    Student --> Telegram
    Telegram --> API
    
    PublicApp --> API
    AdminApp --> API
    
    API --> AI
    API --> PG
    API --> Qdrant
    API --> Redis
    
    AI --> OpenAI
    Worker --> Firecrawl
    
    Worker --> PG
    Worker --> Qdrant

    style Student fill:#4CAF50,color:#fff
    style Staff fill:#2196F3,color:#fff
    style A20System fill:#FFF3E0,stroke:#FF9800
```

---

## Cách render sơ đồ ra ảnh

### Cách 1: Mermaid Live Editor
1. Copy code Mermaid vào https://mermaid.live
2. Click "Actions" → "Export PNG/SVG"

### Cách 2: Dùng AI vẽ lại
1. Copy nội dung text mô tả
2. Paste vào AI image generator (Claude, GPT-4o, etc.)
3. Yêu cầu vẽ theo style clean, professional

### Cách 3: VS Code Extension
1. Cài extension "Mermaid Markdown Syntax Highlighting"
2. Preview trực tiếp trong VS Code

---

## So sánh với bản gốc

| Sơ đồ | Cải tiến |
|-------|----------|
| Deployment | Thêm màu sắc, biểu tượng, group rõ ràng |
| Chat RAG | Tách retrieval thành sub-graph riêng |
| Lead State | Giữ nguyên logic, thêm note mô tả |
| Application Flow | Đơn giản hóa, màu sắc phân biệt |
| Human Handoff | Dùng rect để phân biệt 3 giai đoạn |
| Auth Flow | Tách 3 flows riêng biệt |
| Knowledge Ingestion | Thêm icons, màu sắc |
| C4 Context | Rõ ràng hơn với border và fill |
