# S5 Assistant - Hybrid Search Engine

AI-powered search engine combining **internal company documentation** (Confluence) with **external web search** (Brave Search) using **RAG technology** for intelligent document retrieval and generation.

## ✨ Features

- 🏢 **Internal Search**: Search company Confluence documentation
- 🌐 **External Search**: Brave Search API for web, news, and images
- 🧠 **RAG System**: LangChain + Pinecone for document embeddings and retrieval
- 🤖 **AI Responses**: Groq LLM provides contextual answers
- 🔄 **Smart Hybrid**: Automatically combines internal + external results
- 🧬 **AI-Powered Search**: Semantic understanding finds related documents (not just keywords)
- 📊 **Admin Panel**: Manage document indexing at `/admin`
- 💾 **Redis Caching**: Optional caching for improved performance

### AI-Powered Search Benefits

When `ENABLE_AI_SEARCH=true`, the system uses AI to understand query intent beyond keywords:

- **Semantic Matching**: Query "about new docs feature" finds documents about "document ingestion pipeline"
- **Related Concepts**: Understands relationships between technical terms
- **Context Awareness**: Considers user intent and document relevance
- **No More Misses**: Finds documents with different terminology than the query

## Configure

```bash
cp .env.example .env.local
```

Add your keys to `.env.local`:

### Required APIs

```bash
BRAVE_API_KEY=your-brave-search-api-key
GROQ_API_KEY=gsk_your-groq-api-key
GROQ_MODEL=openai/gpt-oss-120b  # Optional: Groq model (default: openai/gpt-oss-120b for better rate limits)
```

### Optional: RAG System (Vector Search)

```bash
PINECONE_API_KEY=your-pinecone-api-key
OPENAI_API_KEY=sk-your-openai-api-key
PINECONE_INDEX_NAME=s5-docs
```

### Optional: Internal Documentation

```bash
CONFLUENCE_URL=https://your-company.atlassian.net
CONFLUENCE_USER=your-email@company.com
CONFLUENCE_TOKEN=your-confluence-api-token
CONFLUENCE_SPACES=space1,space2,space3
```

### Search Configuration

```bash
# Enable/disable external web search
ENABLE_EXTERNAL_SEARCH=true

# Enable AI-powered semantic search (recommended)
# Uses AI to understand query intent and find related documents
ENABLE_AI_SEARCH=true
```

### Maintenance Mode

```bash
# Temporarily shut down the site for maintenance
# When set to "true", users will see a maintenance page
MAINTENANCE_MODE=false
```

To temporarily disable the site, set `MAINTENANCE_MODE=true` in your environment variables. Users will be redirected to a maintenance page instead of the main application.

### Optional: Redis Caching

```bash
REDIS_URL=redis://localhost:6379
REDIS_TOKEN=your-redis-token
```

### Optional: Caching

```bash
REDIS_URL=https://your-redis-url.upstash.io
REDIS_TOKEN=your-redis-token-here
```

## Run

```bash
npm run dev
```

Open http://localhost:3000

- [Brave Search API](https://brave.com/search/api/)
- [Groq](https://groq.com)

### Optional: RAG System

- [Pinecone](https://www.pinecone.io/) - Vector database
- [OpenAI](https://platform.openai.com/) - For document embeddings

### Optional: Internal Docs

- [Confluence API Token](https://confluence.atlassian.com/enterprise/using-personal-access-tokens-1026032365.html)

### Optional: Caching

- [Upstash Redis](https://console.upstash.com/) - For query caching

## Admin Panel

Visit `http://localhost:3000/admin` to manage your search engine:

- **Test Connections**: Verify Pinecone and Confluence connectivity
- **Index Documents**: Add Confluence pages to vector store
- **Monitor Status**: View indexing statistics and system health
- **Manage Data**: Clear indexes, ensure setup, etc.

### Indexing Options

1. **By Query**: Search and index pages matching specific terms
2. **Specific Pages**: Index individual pages by ID
3. **Entire Spaces**: Index all pages from Confluence spaces

## Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Confluence    │    │    Pinecone      │    │   Brave Search   │
│   (Internal)    │◄──►│  (Vector Store)  │◄──►│   (External)     │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                        │                        │
         └────────────────────────┼────────────────────────┘
                                  ▼
                         ┌─────────────────┐
                         │     Groq AI      │
                         │  (LLM Response)  │
                         └─────────────────┘
```

## Search Strategies

Automatically chooses the best search strategy:

1. **Internal Only**: When Confluence has sufficient relevant results
2. **External Only**: When internal search is unavailable or insufficient
3. **Hybrid**: Combines both sources for comprehensive answers

## Redis Caching Setup (Optional)

Redis caching improves performance for repeated queries by storing results for 1 hour:

### 1. Create Upstash Redis Database

1. Go to [Upstash Console](https://console.upstash.com/)
2. Create a new Redis database
3. Copy the **REST API** credentials

### 2. Add to Environment Variables

```bash
REDIS_URL=https://your-redis-url.upstash.io
REDIS_TOKEN=your-redis-token-here
```

### 3. Verify Cache is Working

- Check server logs for: `Redis cache enabled` ✅
- First query: `Saved to Redis cache: search:your_query` 💾
- Same query again: `Redis cache hit for: search:your_query` 🔄

### Cache Behavior

- **TTL**: 1 hour per query
- **Scope**: Only main queries (not follow-ups)
- **Fallback**: Works without Redis (no cache)
- **Performance**: ~10x faster for cached queries

MIT License
