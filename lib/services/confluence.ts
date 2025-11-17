import { Document } from "@langchain/core/documents"
import { generateText } from "ai"

export interface ConfluenceImage {
  url: string
  alt?: string
  title?: string
}

export interface ConfluencePage {
  id: string
  title: string
  content: string
  url: string
  space: string
  lastModified: string
  author: string
  excerpt?: string
  images?: ConfluenceImage[]
  attachments?: ConfluenceImage[]
}

interface ConfluenceApiResult {
  id: string
  title: string
  body?: {
    storage?: {
      value?: string
    }
  }
  _links?: {
    webui?: string
  }
  space?: {
    name?: string
  }
  version?: {
    when?: string
    by?: {
      displayName?: string
    }
  }
  lastModified?: string
}

export interface ConfluenceSearchResult {
  pages: ConfluencePage[]
  totalResults: number
  hasMore: boolean
}

export class ConfluenceService {
  private baseUrl: string
  private username: string
  private token: string
  private spaces: string[]

  constructor() {
    this.baseUrl = process.env.CONFLUENCE_URL || ""
    this.username = process.env.CONFLUENCE_USER || ""
    this.token = process.env.CONFLUENCE_TOKEN || ""
    this.spaces = (process.env.CONFLUENCE_SPACES || "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)

    if (!this.baseUrl || !this.username || !this.token) {
      console.warn("Confluence credentials not configured")
    }
  }

  /**
   * Helper function to get model with fallback for rate limits
   */
  private getModelWithFallback(groqClient: any, primaryModel: string | undefined) {
    const fallbackModels = ["openai/gpt-oss-120b", "openai/gpt-oss-20b", "openai/gpt-oss-safeguard-20b", "qwen/qwen3-32b", "meta-llama/llama-4-scout-17b-16e-instruct", "moonshotai/kimi-k2-instruct-0905"]

    // Try primary model first
    if (primaryModel && !fallbackModels.includes(primaryModel)) {
      fallbackModels.unshift(primaryModel)
    }

    return groqClient(fallbackModels[0]) // Return first available model
  }

  private getAuthHeader(): string {
    const credentials = Buffer.from(`${this.username}:${this.token}`).toString("base64")
    return `Basic ${credentials}`
  }

  /**
   * Expand query semantically using AI to understand user intent
   */
  private async expandQuerySemantically(query: string, groqClient: any): Promise<string[]> {
    try {
      console.log(`🧠 Expanding query semantically: "${query}"`)

      const expansion = await generateText({
        model: this.getModelWithFallback(groqClient, process.env.GROQ_MODEL || ""),
        messages: [
          {
            role: "system",
            content: `You are an expert at understanding user queries about technical documentation.

Given a user query, extract and expand it into relevant search terms and concepts that would help find documentation.

Focus on:
- Core concepts and features
- Related technologies and terms
- Alternative phrasings
- Technical keywords

Return ONLY a JSON array of search terms/phrases, max 20 items.

Examples:
Query: "all about new docs feature"
Output: ["docs generate", "document generation", "new docs", "docs feature", "document creation", "generate docs", "docs api", "document builder"]

Query: "how to setup authentication"
Output: ["authentication setup", "auth configuration", "login setup", "user authentication", "auth api", "authentication guide", "oauth setup", "jwt authentication"]`
          },
          {
            role: "user",
            content: `Query: "${query}"`
          }
        ],
        temperature: 0.5
      })

      const expandedTerms = JSON.parse(expansion.text.trim())
      if (Array.isArray(expandedTerms) && expandedTerms.length > 0) {
        console.log(`✅ Query expanded to: [${expandedTerms.join(", ")}]`)
        return expandedTerms
      }
    } catch (error) {
      console.warn("❌ Query expansion failed:", error)
    }

    // Fallback: return original query terms
    return [query]
  }

  /**
   * AI-powered semantic search using Groq
   */
  async semanticSearch(query: string, groqClient: any, limit: number = 10): Promise<ConfluenceSearchResult> {
    if (!this.baseUrl || !this.username || !this.token) {
      console.warn("Confluence not configured for semantic search")
      return { pages: [], totalResults: 0, hasMore: false }
    }

    try {
      console.log(`🤖 Starting AI semantic search for: "${query}"`)

      // Step 1: Expand query semantically to understand user intent
      const expandedQueries = await this.expandQuerySemantically(query, groqClient)

      // Step 2: Search using multiple expanded queries to get broader set of candidates
      const searchPromises = expandedQueries.slice(0, 3).map((expandedQuery) => this.search(expandedQuery, Math.min(limit * 2, 30)))

      const searchResults = await Promise.allSettled(searchPromises)
      const allPages = new Map<string, ConfluencePage>()

      searchResults.forEach((result) => {
        if (result.status === "fulfilled") {
          result.value.pages.forEach((page) => allPages.set(page.id, page))
        }
      })

      const broadSearch = {
        pages: Array.from(allPages.values()),
        totalResults: allPages.size,
        hasMore: false
      }
      console.log(`📊 Broad search found ${broadSearch.pages.length} unique documents from ${expandedQueries.length} queries`)

      if (broadSearch.pages.length === 0) {
        console.log("❌ No documents found for semantic analysis")
        return broadSearch
      }

      // Step 3: Use AI to analyze and rank documents by semantic relevance
      const documentsForAnalysis = broadSearch.pages.map((page) => ({
        id: page.id,
        title: page.title,
        content: page.content.substring(0, 1000), // Limit content for token efficiency
        url: page.url,
        space: page.space,
        excerpt: page.excerpt || page.content.substring(0, 200)
      }))

      const semanticAnalysis = await generateText({
        model: this.getModelWithFallback(groqClient, process.env.GROQ_MODEL || ""),
        messages: [
          {
            role: "system",
            content: `You are an expert at finding the most relevant technical documentation for user queries.

Analyze these Confluence documents and rank them by semantic relevance to this query: "${query}"

Consider:
- Direct topic matches
- Related concepts and technologies
- Technical terms and features mentioned
- User intent and context
- How well the document would help answer the query

Return ONLY a JSON array of document IDs in order of relevance (most relevant first).
Format: ["doc-id-1", "doc-id-2", "doc-id-3"]

Documents to analyze:`
          },
          {
            role: "user",
            content: JSON.stringify(documentsForAnalysis, null, 2)
          }
        ],
        temperature: 0.5
      })
      console.log("semanticAnalysis", semanticAnalysis.text)
      let rankedIds: string[] = []
      try {
        const parsed = JSON.parse(semanticAnalysis.text.trim())
        console.log("parsed", parsed)
        rankedIds = Array.isArray(parsed) ? parsed : []
      } catch (e) {
        console.warn("Failed to parse AI ranking response, using original order")
        rankedIds = broadSearch.pages.map((p) => p.id)
      }

      // Step 3: Reorder documents based on AI ranking
      const rankedPages = rankedIds
        .map((id) => broadSearch.pages.find((p) => p.id === id))
        .filter((page): page is ConfluencePage => page !== undefined)
        .slice(0, limit)

      console.log(`✅ AI semantic search completed: ${rankedPages.length} relevant documents found`)

      return {
        pages: rankedPages,
        totalResults: rankedPages.length,
        hasMore: broadSearch.hasMore
      }
    } catch (error) {
      console.error("❌ AI semantic search failed:", error)
      // Fallback to regular keyword search
      console.log("🔄 Falling back to keyword search")
      return this.search(query, limit)
    }
  }

  /**
   * Hybrid search combining keyword and AI semantic approaches
   */
  async hybridSearch(
    query: string,
    groqClient: any,
    options: {
      keywordLimit?: number
      semanticLimit?: number
      finalLimit?: number
    } = {}
  ): Promise<ConfluenceSearchResult> {
    const { keywordLimit = 8, semanticLimit = 8, finalLimit = 10 } = options

    console.log(`🔄 Starting hybrid search for: "${query}"`)

    // Run both searches in parallel for speed
    const [keywordResults, semanticResults] = await Promise.allSettled([this.search(query, keywordLimit), this.semanticSearch(query, groqClient, semanticLimit)])

    const keywordPages = keywordResults.status === "fulfilled" ? keywordResults.value.pages : []
    const semanticPages = semanticResults.status === "fulfilled" ? semanticResults.value.pages : []

    console.log(`📊 Keyword results: ${keywordPages.length}, Semantic results: ${semanticPages.length}`)

    // Combine and deduplicate results
    const allPages = new Map<string, ConfluencePage>()

    // Add keyword results first (preserve order)
    keywordPages.forEach((page) => allPages.set(page.id, page))

    // Add semantic results (they may reorder or add new ones)
    semanticPages.forEach((page) => allPages.set(page.id, page))

    // Convert back to array, maintaining some relevance ordering
    const combinedPages = Array.from(allPages.values())

    // Final AI reranking of combined results
    if (combinedPages.length > finalLimit) {
      try {
        const finalRanking = await generateText({
          model: this.getModelWithFallback(groqClient, process.env.GROQ_MODEL || ""),
          messages: [
            {
              role: "system",
              content: `Given the user query: "${query}"

Rank these combined search results by final relevance. Return ONLY a JSON array of the top ${finalLimit} most relevant document IDs.

Consider both keyword matches and semantic relevance.`
            },
            {
              role: "user",
              content: JSON.stringify(
                combinedPages.slice(0, 20).map((p) => ({
                  id: p.id,
                  title: p.title,
                  excerpt: p.excerpt || p.content.substring(0, 150)
                })),
                null,
                2
              )
            }
          ],
          temperature: 0.1
        })

        const finalIds = JSON.parse(finalRanking.text.trim())
        const finalPages = finalIds
          .map((id: string) => combinedPages.find((p) => p.id === id))
          .filter(Boolean)
          .slice(0, finalLimit)

        combinedPages.splice(0, combinedPages.length, ...finalPages)
      } catch (e) {
        console.warn("Final AI reranking failed, using combined order")
        combinedPages.splice(finalLimit) // Just truncate
      }
    }

    console.log(`✅ Hybrid search completed: ${combinedPages.length} final results`)

    return {
      pages: combinedPages.slice(0, finalLimit),
      totalResults: combinedPages.length,
      hasMore: false // We don't know about pagination in hybrid mode
    }
  }

  /**
   * Search Confluence pages using CQL (Confluence Query Language)
   */
  async search(query: string, limit: number = 20, start: number = 0): Promise<ConfluenceSearchResult> {
    if (!this.baseUrl || !this.username || !this.token) {
      console.warn("Confluence not configured, returning empty results")
      return { pages: [], totalResults: 0, hasMore: false }
    }

    try {
      // Build improved CQL query with better term extraction
      const { keyTerms, phrases } = this.extractKeyTermsAndPhrases(query)
      let cql = ""

      console.log(`🔍 Query analysis: "${query}" -> Key terms: [${keyTerms.join(", ")}], Phrases: [${phrases.join(", ")}]`)

      if (phrases.length > 0) {
        // Simple search: just search for phrases in title and text
        const phraseQueries = phrases.map((phrase) => `title ~ "${phrase}" OR text ~ "${phrase}"`)
        cql = phraseQueries.join(" OR ")
      } else if (keyTerms.length === 1) {
        // Single term - use exact match
        cql = `title ~ "${keyTerms[0]}" OR text ~ "${keyTerms[0]}"`
      } else if (keyTerms.length === 2) {
        // Two terms - simple search for the phrase in title and text
        cql = `title ~ "${keyTerms.join(" ")}" OR text ~ "${keyTerms.join(" ")}"`
      } else {
        // Multiple terms - try different combinations for better relevance
        const termCombinations = this.generateTermCombinations(keyTerms)

        // Build CQL with multiple search strategies
        const combinationQueries = termCombinations.map((combo) => `(title ~ "${combo.join(" ")}" OR text ~ "${combo.join(" ")}")`)
        cql = combinationQueries.join(" OR ")

        // Add individual term searches for maximum recall
        const individualTerms = keyTerms.map((term) => `(title ~ "${term}" OR text ~ "${term}")`).join(" OR ")
        cql = `(${cql}) OR (${individualTerms})`
      }

      if (this.spaces.length > 0) {
        const spaceQuery = this.spaces.map((space) => `space = "${space}"`).join(" OR ")
        cql = `(${cql}) AND (${spaceQuery})`
      }

      const url = `${this.baseUrl}/wiki/rest/api/content/search?cql=${encodeURIComponent(cql)}&limit=${limit}&start=${start}&expand=body.storage,space`

      console.log("🔍 Searching Confluence:", { query, cql, url: url.replace(/ATATT3xFfGF0.*B826C446/g, "[TOKEN]") })
      console.log("url", url)
      const response = await fetch(url, {
        method: "GET",
        headers: {
          Authorization: this.getAuthHeader(),
          Accept: "application/json",
          "Content-Type": "application/json"
        }
      })

      if (!response.ok) {
        throw new Error(`Confluence API error: ${response.status} ${response.statusText}`)
      }

      const data = await response.json()

      // Transform results
      // Process pages and fetch attachments for top results
      const pages: ConfluencePage[] = []

      for (let i = 0; i < data.results.length; i++) {
        const result = data.results[i]
        const content = result.body?.storage?.value || ""
        const inlineImages = this.extractImages(content)
        // Fetch attachments only for first 5 results to get images for more pages
        const attachments = i < 5 ? await this.fetchAttachments(result.id) : []

        // Combine inline images and attachments
        // Replace attachment placeholders with actual URLs
        const processedInlineImages = inlineImages.map((img) => {
          if (img.url.startsWith("attachment:")) {
            const filename = img.url.replace("attachment:", "")
            return {
              ...img,
              url: `/api/images/${result.id}/${encodeURIComponent(filename)}`
            }
          }
          return img
        })

        const allImages = [...processedInlineImages, ...attachments]
        pages.push({
          id: result.id,
          title: result.title,
          content: content,
          url: result._links?.webui ? `${this.baseUrl}/wiki${result._links.webui}` : `${this.baseUrl}/wiki/spaces/${result.space?.name || "UNKNOWN"}/pages/${result.id}`,
          space: result.space?.name || "Unknown",
          lastModified: result.version?.when || result.lastModified,
          author: result.version?.by?.displayName || "Unknown",
          excerpt: this.extractExcerpt(content, query),
          images: allImages // Combined images from content and attachments
        })
      }

      return {
        pages,
        totalResults: data.totalSize || 0,
        hasMore: data.start + data.limit < (data.totalSize || 0)
      }
    } catch (error) {
      console.error("Confluence search error:", error)
      throw error
    }
  }

  /**
   * Get a specific page by ID
   */
  async getPage(pageId: string): Promise<ConfluencePage | null> {
    if (!this.baseUrl || !this.username || !this.token) {
      return null
    }

    try {
      const url = `${this.baseUrl}/wiki/rest/api/content/${pageId}?expand=body.storage,version,space`

      const response = await fetch(url, {
        method: "GET",
        headers: {
          Authorization: this.getAuthHeader(),
          Accept: "application/json"
        }
      })

      if (!response.ok) {
        throw new Error(`Confluence API error: ${response.status}`)
      }

      const result = await response.json()

      return {
        id: result.id,
        title: result.title,
        content: result.body?.storage?.value || "",
        url: result._links?.webui ? `${this.baseUrl}/wiki${result._links.webui}` : `${this.baseUrl}/wiki/spaces/${result.space?.name || "UNKNOWN"}/pages/${result.id}`,
        space: result.space?.name || "Unknown",
        lastModified: result.version?.when || result.lastModified,
        author: result.version?.by?.displayName || "Unknown"
      }
    } catch (error) {
      console.error("Confluence get page error:", error)
      return null
    }
  }

  /**
   * Convert Confluence pages to LangChain documents for RAG
   */
  pagesToDocuments(pages: ConfluencePage[]): Document[] {
    return pages.map(
      (page) =>
        new Document({
          pageContent: page.content,
          metadata: {
            id: page.id,
            title: page.title,
            url: page.url,
            space: page.space,
            lastModified: page.lastModified,
            author: page.author,
            excerpt: page.excerpt,
            source: "confluence"
          }
        })
    )
  }

  /**
   * Extract key terms from query, removing stop words
   */
  private extractKeyTermsAndPhrases(query: string): { keyTerms: string[]; phrases: string[] } {
    // Context-aware stop words - keep more terms that might be important in tech contexts
    const stopWords = new Set([
      "a",
      "an",
      "and",
      "are",
      "as",
      "at",
      "be",
      "by",
      "for",
      "from",
      "has",
      "he",
      "in",
      "is",
      "it",
      "its",
      "of",
      "on",
      "that",
      "the",
      "to",
      "was",
      "will",
      "with",
      "what",
      "when",
      "where",
      "how",
      "why",
      "who",
      "which",
      "all",
      "after",
      "also",
      "am",
      "any",
      "before",
      "but",
      "can",
      "could",
      "did",
      "do",
      "does",
      "had",
      "have",
      "having",
      "here",
      "his",
      "i",
      "if",
      "into",
      "may",
      "me",
      "might",
      "most",
      "must",
      "my",
      "no",
      "nor",
      "not",
      "now",
      "only",
      "or",
      "other",
      "our",
      "out",
      "over",
      "should",
      "so",
      "some",
      "such",
      "than",
      "their",
      "them",
      "then",
      "there",
      "these",
      "they",
      "this",
      "those",
      "through",
      "too",
      "under",
      "up",
      "very",
      "were",
      "would",
      "you",
      "your"
    ])

    // Tech-specific important terms that should be preserved even if short
    const importantTechTerms = new Set([
      "api",
      "app",
      "aws",
      "css",
      "db",
      "dev",
      "doc",
      "docs",
      "env",
      "git",
      "gpu",
      "html",
      "http",
      "https",
      "id",
      "ip",
      "js",
      "json",
      "key",
      "log",
      "ml",
      "new",
      "npm",
      "ops",
      "os",
      "pdf",
      "php",
      "prod",
      "qa",
      "react",
      "ref",
      "repo",
      "sdk",
      "sql",
      "ssh",
      "ssl",
      "svg",
      "tag",
      "ts",
      "ui",
      "url",
      "ux",
      "vm",
      "xml"
    ])

    // Split query into words, lowercase, remove punctuation
    const words = query
      .toLowerCase()
      .split(/\s+/)
      .map((word) => word.replace(/[^\w]/g, ""))
      .filter((word) => word.length > 0)

    // Extract meaningful phrases (2-3 consecutive words)
    const phrases: string[] = []
    for (let i = 0; i < words.length - 1; i++) {
      // Try 2-word phrases
      if (i < words.length - 1) {
        const phrase = words.slice(i, i + 2).join(" ")
        // Only keep phrases that don't start/end with stop words (unless they're important)
        const firstWord = words[i]
        const secondWord = words[i + 1]
        const isValidPhrase =
          ((!stopWords.has(firstWord) || importantTechTerms.has(firstWord)) && (!stopWords.has(secondWord) || importantTechTerms.has(secondWord))) ||
          (importantTechTerms.has(firstWord) && importantTechTerms.has(secondWord))

        if (isValidPhrase && phrase.length > 3) {
          phrases.push(phrase)
        }
      }

      // Try 3-word phrases for longer queries
      if (i < words.length - 2) {
        const phrase = words.slice(i, i + 3).join(" ")
        const hasImportantTerms = words.slice(i, i + 3).some((word) => importantTechTerms.has(word))
        if (hasImportantTerms && phrase.length > 5) {
          phrases.push(phrase)
        }
      }
    }

    // Extract key terms with improved logic
    const keyTerms = words.filter((word) => {
      // Keep important tech terms even if short
      if (importantTechTerms.has(word)) return true
      // Keep longer words that are likely meaningful
      if (word.length > 3) return true
      // Filter out stop words unless they're important in context
      return !stopWords.has(word)
    })

    // Remove duplicates and limit results
    const uniqueKeyTerms = Array.from(new Set(keyTerms)).slice(0, 5)
    const uniquePhrases = Array.from(new Set(phrases)).slice(0, 3)

    // Prioritize phrases that contain multiple key terms
    const prioritizedPhrases = uniquePhrases.sort((a, b) => {
      const aKeyTerms = uniqueKeyTerms.filter((term) => a.includes(term)).length
      const bKeyTerms = uniqueKeyTerms.filter((term) => b.includes(term)).length
      return bKeyTerms - aKeyTerms
    })

    return {
      keyTerms: uniqueKeyTerms,
      phrases: prioritizedPhrases
    }
  }

  private generateTermCombinations(terms: string[]): string[][] {
    const combinations: string[][] = []

    // Always include the full combination if we have multiple terms
    if (terms.length >= 2) {
      combinations.push(terms)
    }

    // Include consecutive pairs
    for (let i = 0; i < terms.length - 1; i++) {
      combinations.push([terms[i], terms[i + 1]])
    }

    // Include the most important individual terms
    // Prioritize terms that are likely to be most specific
    const importantTerms = terms.filter((term) => term.length > 4 || /^[a-z]{2,3}[0-9]+$/.test(term))
    if (importantTerms.length > 0) {
      combinations.push(...importantTerms.slice(0, 2).map((term) => [term]))
    }

    // Remove duplicates and limit to most relevant combinations
    const uniqueCombinations = combinations.filter((combo, index, self) => index === self.findIndex((c) => c.join(" ") === combo.join(" "))).slice(0, 4)

    return uniqueCombinations
  }

  /**
   * Extract excerpt around search terms
   */
  private extractExcerpt(content: string, query: string): string {
    if (!content) return ""

    // Remove HTML tags and decode entities
    const cleanContent = content
      .replace(/<[^>]*>/g, "")
      .replace(/&nbsp;/g, " ")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&amp;/g, "&")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")

    // Find query terms in content
    const queryWords = query.toLowerCase().split(/\s+/)
    const contentLower = cleanContent.toLowerCase()

    let bestExcerpt = ""
    let bestScore = 0

    // Look for excerpts containing multiple query terms
    for (let i = 0; i < contentLower.length - 200; i += 50) {
      const excerpt = cleanContent.substring(i, i + 200)
      const excerptLower = excerpt.toLowerCase()

      let score = 0
      queryWords.forEach((word) => {
        if (excerptLower.includes(word)) score++
      })

      if (score > bestScore) {
        bestScore = score
        bestExcerpt = excerpt.trim()
      }
    }

    return bestExcerpt || cleanContent.substring(0, 200)
  }

  /**
   * Fetch attachments for a page
   */
  private async fetchAttachments(pageId: string): Promise<ConfluenceImage[]> {
    if (!this.baseUrl || !this.username || !this.token) {
      return []
    }

    try {
      const url = `${this.baseUrl}/wiki/rest/api/content/${pageId}/child/attachment`

      const response = await fetch(url, {
        method: "GET",
        headers: {
          Authorization: this.getAuthHeader(),
          Accept: "application/json"
        }
      })

      if (!response.ok) {
        return []
      }

      const data = await response.json()
      const attachments: ConfluenceImage[] = []

      for (const attachment of data.results || []) {
        const mimeType = attachment.extensions?.mediaType || ""
        if (mimeType.startsWith("image/")) {
          // Build proxied image URL through our API
          const proxiedUrl = `/api/images/${pageId}/${encodeURIComponent(attachment.title)}`

          attachments.push({
            url: proxiedUrl,
            alt: attachment.title,
            title: attachment.title
          })
        }
      }

      return attachments
    } catch (error) {
      console.error("Error fetching attachments:", error)
      return []
    }
  }

  /**
   * Extract images from Confluence page content
   */
  private extractImages(content: string): ConfluenceImage[] {
    if (!content) return []

    const images: ConfluenceImage[] = []

    // Match Confluence image tags and regular img tags
    const patterns = [
      /<ac:image[^>]*>.*?<ri:attachment[^>]*ri:filename="([^"]*)"[^>]*>.*?<\/ac:image>/gi,
      /<img[^>]+src="([^"]*)"[^>]*(?:alt="([^"]*)")?(?:title="([^"]*)")?[^>]*>/gi,
      /<ac:image[^>]*>.*?<ri:url[^>]*ri:value="([^"]*)"[^>]*>.*?<\/ac:image>/gi
    ]

    patterns.forEach((pattern) => {
      let match
      while ((match = pattern.exec(content)) !== null) {
        const url = match[1]
        const alt = match[2]
        const title = match[3]

        if (url) {
          let absoluteUrl: string

          // Handle different URL types
          if (url.startsWith("http")) {
            // Already absolute URL
            absoluteUrl = url
          } else if (url.startsWith("/")) {
            // Relative URL from Confluence
            absoluteUrl = `${this.baseUrl}${url}`
          } else if (url.includes(".png") || url.includes(".jpg") || url.includes(".jpeg") || url.includes(".gif")) {
            // Looks like a filename, construct attachment URL
            // We need pageId, but we'll use a placeholder for now
            absoluteUrl = `attachment:${url}`
          } else {
            // Fallback
            absoluteUrl = url
          }

          images.push({
            url: absoluteUrl,
            alt: alt,
            title: title
          })
        }
      }
    })

    return images
  }

  /**
   * Check if Confluence is configured and available
   */
  isConfigured(): boolean {
    return !!(this.baseUrl && this.username && this.token)
  }
}

// Singleton instance
export const confluenceService = new ConfluenceService()
