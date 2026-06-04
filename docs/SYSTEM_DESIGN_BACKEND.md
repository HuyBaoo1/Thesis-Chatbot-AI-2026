## 4. Backend Architecture

### 4.1 API Routers

| Router | Path | Description |
|--------|------|-------------|
| `auth.py` | `/api/auth/*` | JWT authentication, token refresh |
| `chat.py` | `/api/chat/*` | Conversations, messages, AI queries |
| `lead.py` | `/api/lead/*` | Lead CRUD, assignment, scoring |
| `staff.py` | `/api/staff/*` | Staff account management |
| `major.py` | `/api/major/*` | Academic programs |
| `tuition_policy.py` | `/api/tuition-policy/*` | Tuition information |
| `knowledge_chunk.py` | `/api/knowledge-chunk/*` | Knowledge base, embeddings |
| `ocr_quick.py` | `/api/ocr-quick/*` | Document OCR processing |
| `crawl.py` | `/api/crawl/*` | Web crawling via Firecrawl |
| `telegram.py` | `/api/telegram/*` | Telegram bot integration |
| `notification.py` | `/api/notification/*` | Push notifications |
| `admin_analytics.py` | `/api/admin/analytics/*` | Dashboard metrics |
| `realtime.py` | `/api/realtime/*` | Server-Sent Events |

### 4.2 Database Models

```
Lead
├── id, full_name, email, phone
├── source, status, score
├── assigned_staff_id → Staff
└── conversations → Conversation[]

Conversation
├── id, lead_id → Lead
├── staff_id → Staff (assigned)
├── status (OPEN|HANDOFF|CLOSED)
├── summary
└── messages → Message[]

Message
├── id, conversation_id → Conversation
├── role (USER|AI|STAFF|SYSTEM)
├── content, intent
└── chunks → MessageChunkUsage[]

KnowledgeChunk
├── id, category, content
├── embedding_status
├── year, version, major_id
└── vector_id (Qdrant)

Staff
├── id, email, name, role
└── leads → Lead[]

Major
├── id, code, name_vi, name_en
├── description, requirements
└── tuition_range
```

### 4.3 Key Services

#### Chat Pipeline (RAG)
```
User Query
    ↓
Lead Identification (email/phone matching)
    ↓
Hybrid Search
├── Vector Search (Qdrant) - semantic similarity
└── BM25 Search - keyword matching
    ↓
Context Assembly + Chat History
    ↓
OpenAI GPT-4o-mini
    ↓
Response + Citations
```

#### OCR Pipeline
```
File Upload
    ↓
Job Queue (RQ)
    ↓
Smart Extraction Routing
├── PyMuPDF - PDF text extraction
├── RapidOCR - Image OCR
└── Vision API - Cloud AI OCR
    ↓
R2 Storage
    ↓
Structured Output (JSON)
```
