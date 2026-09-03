## 8. Deployment

- **Frontend:** Vercel (static deployment)
- **Backend:** Railway (Docker containers)
- **Workers:** RQ workers for async tasks (OCR, embeddings)
- **Vector Store:** Qdrant Cloud for selected production deployment
- **Fallback:** VPS Docker Compose + Caddy remains available until managed production passes validation

---

## 9. Future Considerations

- [ ] WebSocket support for real-time chat (currently SSE)
- [ ] Redis cluster for HA
- [ ] Qdrant replication
- [ ] Content CDN for R2 assets
- [ ] Advanced analytics dashboard
