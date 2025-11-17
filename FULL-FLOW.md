# S5 Assistant - Full Flow Documentation

## 🎯 Architecture Overview

**S5 Assistant** is an intelligent AI search engine that combines:
- 🔒 **Internal**: Company documentation (Confluence)
- 🌐 **External**: Web search (Brave Search)
- 🧠 **AI**: Natural language processing with Groq
- 💾 **Vector Search**: Pinecone + OpenAI embeddings
- 💬 **Widget**: Embeddable chatbot

---

## 🔄 Main Operational Flows

### 1. Setup and Configuration
```
Environment Variables (.env.local):
├── BRAVE_API_KEY          # Web search
├── GROQ_API_KEY          # AI responses
├── PINECONE_API_KEY      # Vector database
├── OPENAI_API_KEY        # Document embeddings
├── CONFLUENCE_*          # Internal docs
├── REDIS_*              # Caching (optional)
└── ENABLE_*             # Feature flags
```

### 2. Data Ingestion Flow (Admin Panel)
```
User → Admin Panel (/admin)
    ↓
Confluence Spaces → Document Indexing
    ↓
Extract Pages + Images + Metadata
    ↓
Generate Embeddings (OpenAI)
    ↓
Store in Pinecone Vector Database
    ↓
Ready for Semantic Search
```

### 3. Search Request Flow
```
User Query → Frontend (page.tsx)
    ↓
useChat Hook → /api/s5/search
    ↓
🔍 Hybrid Search Service:
    ├── Check Redis Cache (optional)
    ├── Internal Search:
    │   ├── Confluence API (keyword)
    │   └── Vector Search (semantic)
    └── External Search (Brave API)
    ↓
🎯 Determine Strategy:
    ├── internal_only    (internal only)
    ├── external_only    (external only)
    ├── hybrid          (combine both)
    └── fallback        (no results)
    ↓
🤖 AI Response Generation:
    ├── Build Context (internal > external)
    ├── Groq LLM with specialized prompt
    └── Stream Response + Follow-up Questions
    ↓
💾 Cache Results (Redis)
    ↓
Return Streaming Response
```

### 4. AI Processing Flow
```
Query + Sources → Groq LLM
    ↓
System Prompt: "You are an expert on company documentation"
    ↓
Context Building:
    ├── Internal Sources (highest priority)
    ├── Vector Search Results
    ├── External Sources (supporting)
    └── Images from internal docs
    ↓
Response with Citations: [1](url), [2](url)
    ↓
Generate Follow-up Questions
    ↓
Stream to Frontend
```

---

## 🏗️ Detailed Architecture

### Frontend (Next.js + React)
```
app/
├── page.tsx              # Main search interface
├── chat-interface.tsx    # Chat UI with streaming
├── search.tsx           # Search form component
├── admin/
│   └── page.tsx         # Document ingestion UI
└── api/s5/search/       # Hybrid search endpoint
```

### Backend Services
```
lib/services/
├── hybrid-search.ts     # Main orchestrator
├── confluence.ts        # Internal docs search
├── pinecone.ts          # Vector database
└── document-ingestion.ts # Data indexing
```

### Widget System
```
widget/
├── components/
│   ├── ChatWidget.tsx   # Embeddable chatbot
│   └── ui/             # Styled components
├── index.tsx          # Widget entry point
└── build process      # → public/widget/
```

---

## 🔧 Search Strategies

### 1. Internal Only
- When Confluence has good quality results
- Prioritize company documentation
- No external search needed

### 2. External Only
- When internal results are unavailable or insufficient
- Use only Brave Search
- Typically for general queries

### 3. Hybrid
- Combine both internal + external
- Internal as primary source
- External as supplementary source

### 4. AI-Powered Search (ENABLE_AI_SEARCH=true)
```
Query → Groq LLM → Expand Semantic Terms
    ↓
Parallel Search:
├── Keyword Search (traditional)
└── Semantic Search (AI-expanded terms)
    ↓
Combine + Rank Results
    ↓
Better Relevance Scoring
```

---

## 💾 Caching System (Redis)

### Cache Strategy
```
Query → Generate Hash Key
    ↓
Check Redis (TTL: 12 hours)
    ├── Cache Hit → Return stored results
    └── Cache Miss → Execute search
        ↓
Store Results → Redis
        ↓
Return to User
```

### Cache Benefits
- ⚡ **Performance**: ~10x faster for repeated queries
- 💰 **Cost**: Reduced API calls
- 📊 **Consistency**: Same query = same results

---

## 🎨 UI/UX Flow

### Initial State
```
Hero Page with Search Bar
    ↓
User enters query
    ↓
Check API Key (Brave required)
    ↓
Submit → Loading State
    ↓
Streaming Results:
    ├── Search Status Updates
    ├── Sources (internal + external)
    ├── News + Images (external)
    ├── Stock Ticker (if company query)
    ├── AI Response (streaming)
    └── Follow-up Questions
```

### Chat Mode
```
After first search → Chat Interface
    ↓
Conversation History Preserved
    ↓
Context-aware Follow-ups
    ↓
Per-message Data Tracking
```

---

## 🔗 Integration Points

### Widget Embedding
```html
<script src="https://your-domain.com/embed.js"></script>
<div id="s5-widget"></div>
<script>
  S5Widget.init({
    apiKey: 'your-brave-key',
    theme: 'light|dark',
    position: 'bottom-right'
  })
</script>
```

### API Endpoints
```
/api/s5/search          # Main search (streaming)
/api/admin/index        # Document ingestion
/api/widget/chat        # Widget chat endpoint
/api/s5/check-env       # Environment check
/api/images/[...]       # Image proxy
```

---

## 🚀 Performance Optimizations

### Frontend
- React Streaming UI
- Optimistic Updates
- Lazy Loading
- Memoization (useMemo, useCallback)

### Backend
- Redis Caching
- Parallel API Calls
- Streaming Responses
- Connection Pooling

### Search
- Hybrid Scoring
- Result Deduplication
- Content Chunking (Vector Search)
- Query Expansion (AI)

---

## 🔒 Security & Configuration

### API Keys
- Brave Search (required for external)
- Groq (required for AI responses)
- OpenAI (required for embeddings)
- Pinecone (required for vector search)
- Confluence (optional, for internal docs)

### Feature Flags
```bash
ENABLE_EXTERNAL_SEARCH=true  # Brave Search
ENABLE_AI_SEARCH=true        # Semantic search
ENABLE_WIDGET=true          # Embeddable widget
```

---

## 📊 Monitoring & Admin

### Admin Panel Features
- ✅ Connection Status (Pinecone, Confluence)
- 📊 Index Statistics (vector count, namespaces)
- 🔄 Document Indexing (by query/space/page)
- 🗑️ Data Management (clear indexes)
- 🔍 Test Queries
- 📈 Performance Metrics

---

## 🎯 Use Cases

### Internal Knowledge Base
```
Employee: "How to deploy to production?"
    ↓
Search Confluence docs
    ↓
Find deployment guides
    ↓
AI summarizes with citations
```

### Research Queries
```
User: "Latest React patterns 2024"
    ↓
Internal docs (if any) + Brave Search
    ↓
AI synthesizes information
    ↓
Includes news, articles, tutorials
```

### Company-Specific Questions
```
User: "What's our vacation policy?"
    ↓
Confluence HR docs (internal only)
    ↓
Direct answers from company policy
```

---

## 📈 Architecture Benefits

### Scalability
- **Horizontal Scaling**: Stateless API design
- **Microservices**: Separated concerns
- **Caching Layer**: Redis for performance
- **Vector Database**: Pinecone for similarity search

### Reliability
- **Graceful Degradation**: Works without optional services
- **Error Boundaries**: Frontend error handling
- **Fallback Strategies**: Multiple search approaches
- **Health Checks**: Admin panel monitoring

### Intelligence
- **Semantic Understanding**: AI-powered query expansion
- **Context Awareness**: Conversation history
- **Source Prioritization**: Internal > External
- **Citation Tracking**: Verifiable answers

---

## 🔧 Development & Deployment

### Local Development
```bash
npm install
cp .env.example .env.local  # Configure APIs
npm run dev                # Start development server
```

### Build & Deploy
```bash
npm run build             # Production build
npm run start            # Production server
./build-widget.sh        # Build embeddable widget
```

### Testing
- **Unit Tests**: Service layer testing
- **Integration Tests**: API endpoint testing
- **E2E Tests**: Full user flow testing
- **Manual Testing**: Browser-based testing

---

## 🚀 Future Enhancements

### Planned Features
- **Multi-language Support**: Expand beyond English
- **Advanced Filters**: Date ranges, source types
- **User Authentication**: Personal search history
- **Analytics Dashboard**: Usage metrics
- **Plugin System**: Custom search connectors

### Performance Improvements
- **Edge Caching**: CDN integration
- **Database Optimization**: Query optimization
- **Batch Processing**: Bulk document indexing
- **Real-time Updates**: Live data synchronization

---

This is a highly sophisticated AI search system that combines the power of **internal knowledge** with **external web search**, using **RAG technology** to provide accurate and relevant answers. The widget system allows embedding into any website.

**Last updated:** November 17, 2025
**Version:** S5 Assistant v1.0
