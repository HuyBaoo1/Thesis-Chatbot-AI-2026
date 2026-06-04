## 3. Frontend Architecture

### 3.1 Directory Structure

```
vite-app/src/
├── api/                 # Typed API clients
│   ├── client.ts        # Axios instance with interceptors
│   ├── chat.ts
│   ├── lead.ts
│   ├── knowledge-chunk.ts
│   └── ...
├── app/
│   └── router.tsx       # React Router v7 route definitions
├── components/
│   ├── common/          # Shared components (Header, Sidebar, etc.)
│   └── ui/              # shadcn/ui component library
├── features/            # Feature-based modules
│   ├── chat/
│   ├── dashboard/
│   ├── lead/
│   ├── staff/
│   ├── knowledge-chunk/
│   ├── major/
│   ├── hot-questions/
│   ├── tuition-policy/
│   ├── quick-processing/
│   └── web-crawler/
├── hooks/               # Custom React hooks
├── i18n/                # i18next internationalization
├── lib/
│   ├── axios.ts         # API client setup
│   ├── react-query.tsx  # TanStack Query provider
│   ├── realtime.ts      # Server-Sent Events client
│   └── utils.ts
├── stores/              # Zustand stores
│   ├── auth-store.tsx
│   └── lead-store.tsx
└── types/               # TypeScript type definitions
```

### 3.2 State Management

| Layer | Tool | Purpose |
|-------|------|---------|
| Server State | TanStack Query | API caching, mutations, invalidation |
| Global State | Zustand | Auth state, lead context |
| URL State | React Router | Page navigation, filters |
| Form State | React Hook Form | Form handling with validation |

### 3.3 Layouts

```
AppRouter
├── HomeLayout     → Public pages (landing, login, chat)
├── AdminLayout    → Admin dashboard, lead management
└── LoginLayout    → Authentication pages
```

### 3.4 Key Pages

| Route | Component | Description |
|-------|-----------|-------------|
| `/` | HomePage | Landing page with chat widget |
| `/login` | LoginPage | Staff authentication |
| `/admin` | DashboardPage | Overview metrics |
| `/admin/chat` | ChatPage | Conversation management |
| `/admin/leads` | LeadPage | Lead CRUD + scoring |
| `/admin/knowledge` | KnowledgeChunkPage | Knowledge base management |
| `/admin/majors` | MajorPage | Academic programs |
| `/admin/tuition` | TuitionPolicyPage | Tuition data |
| `/admin/staff` | StaffPage | Staff management |
| `/admin/hot-questions` | HotQuestionsPage | FAQ analytics |
| `/admin/quick-processing` | QuickProcessingPage | OCR pipeline |
| `/admin/web-crawler` | WebCrawlerPage | Content scraping |
