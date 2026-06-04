## 5. External Integrations

| Service | Purpose | Connection |
|---------|---------|------------|
| OpenAI | Chat completions, embeddings | HTTPS API |
| Qdrant | Vector storage for knowledge chunks | gRPC/HTTP |
| Cloudflare R2 | File storage (CVs, transcripts) | S3-compatible API |
| Redis | Caching, RQ queue, pub/sub | TCP |
| Firecrawl | Web content scraping | HTTPS API |
| Telegram | Alternative chat channel | Bot API |

---

## 6. Real-time Architecture

```
Frontend                    Backend                    Redis
   │                          │                         │
   │─── EventSource ─────────►│                         │
   │                          │─── Subscribe ─────────►│
   │                          │                         │
   │                          │◄─── Message ────────────│
   │◄─── SSE ────────────────│                         │
   │                          │                         │
```

**Channels:**
- `chat:{conversation_id}` - New messages
- `lead:{lead_id}` - Lead updates

---

## 7. Security

- **Authentication:** JWT with access/refresh token pattern
- **Authorization:** Role-based (Admin, Staff)
- **CSRF Protection:** Enabled for state-changing operations
- **File Upload:** Size limits, type validation
- **Rate Limiting:** Per-endpoint throttling
