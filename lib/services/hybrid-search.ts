import { confluenceService, ConfluenceSearchResult } from "./confluence"
import { vectorStoreService } from "./pinecone"
import { Document } from "@langchain/core/documents"

interface BraveSource {
  url: string
  title: string
  description?: string
  content?: string
  markdown?: string
  publishedDate?: string
  author?: string
  image?: string
  favicon?: string
  siteName?: string
}

interface BraveNewsResult {
  url: string
  title: string
  description?: string
  publishedDate?: string
  source?: string
  image?: string
}

interface BraveImageResult {
  url: string
  title: string
  thumbnail?: string
  source?: string
  width?: number
  height?: number
  position?: number
}

interface BraveWebResult {
  url: string
  title?: string
  description?: string
}

interface BraveNewsItem {
  url: string
  title: string
  description?: string
  page_age?: string
  source?: string
}

interface BraveImageItem {
  url: string
  title?: string
  thumbnail?: {
    src: string
    width?: number
    height?: number
  }
  source?: string
  position?: number
}

export interface HybridSearchResult {
  query: string
  internalResults: {
    confluence: ConfluenceSearchResult
    vectorSearch: Document[]
  }
  externalResults: {
    sources: BraveSource[]
    newsResults: BraveNewsResult[]
    imageResults: BraveImageResult[]
  }
  combinedContext: string
  hasInternalResults: boolean
  hasExternalResults: boolean
  searchStrategy: "internal_only" | "external_only" | "hybrid" | "fallback"
}

export interface SearchOptions {
  maxInternalResults?: number
  maxExternalResults?: number
  minInternalScore?: number
  preferInternal?: boolean
  forceExternal?: boolean
  enableExternal?: boolean // New flag to completely disable external search
  enableAISearch?: boolean // Enable AI-powered semantic search
  groqClient?: any // Groq client for AI search
}

export class HybridSearchService {
  /**
   * Perform hybrid search combining Confluence and Brave Search
   */
  async search(query: string, options: SearchOptions = {}): Promise<HybridSearchResult> {
    const {
      maxInternalResults = 5,
      maxExternalResults = 10,
      minInternalScore = 0.7,
      preferInternal = true,
      forceExternal = false,
      enableExternal = true, // Default to true for backward compatibility
      enableAISearch = false, // Default to false for backward compatibility
      groqClient
    } = options

    const result: HybridSearchResult = {
      query,
      internalResults: {
        confluence: { pages: [], totalResults: 0, hasMore: false },
        vectorSearch: []
      },
      externalResults: {
        sources: [],
        newsResults: [],
        imageResults: []
      },
      combinedContext: "",
      hasInternalResults: false,
      hasExternalResults: false,
      searchStrategy: "fallback"
    }

    try {
      // Determine search strategy
      const confluenceAvailable = confluenceService.isConfigured()
      const vectorStoreAvailable = vectorStoreService.isReady()

      console.log(`📊 Services available - Confluence: ${confluenceAvailable}, Vector Store: ${vectorStoreAvailable}`)

      // Always try internal search first (if available and not forced external)
      if (!forceExternal && confluenceAvailable) {
        console.log(`🏢 Searching Confluence... (AI Search: ${enableAISearch ? "ENABLED" : "DISABLED"})`)

        try {
          let confluenceResult: ConfluenceSearchResult

          // Use AI-powered hybrid search if enabled and groqClient provided
          if (enableAISearch && groqClient) {
            console.log("🤖 Using AI-powered hybrid search")
            confluenceResult = await confluenceService.hybridSearch(query, groqClient, {
              keywordLimit: Math.ceil(maxInternalResults * 0.6), // 60% keyword
              semanticLimit: Math.ceil(maxInternalResults * 0.8), // 80% semantic
              finalLimit: maxInternalResults
            })
          } else {
            // Traditional keyword search
            console.log("🔍 Using traditional keyword search")
            confluenceResult = await confluenceService.search(query, maxInternalResults)
          }

          result.internalResults.confluence = confluenceResult

          // Search vector store for semantic matches
          if (vectorStoreAvailable) {
            const vectorResults = await vectorStoreService.similaritySearchWithScore(query, maxInternalResults)
            // Filter by minimum score
            result.internalResults.vectorSearch = vectorResults.filter(([, score]) => score >= minInternalScore).map(([doc]) => doc)
          }

          result.hasInternalResults = confluenceResult.pages.length > 0 || result.internalResults.vectorSearch.length > 0

          console.log(`📄 Internal results: Confluence=${confluenceResult.pages.length}, Vector=${result.internalResults.vectorSearch.length}`)
        } catch (error) {
          console.error("❌ Internal search failed:", error)
          result.hasInternalResults = false
        }
      }

      // Decide whether to use external search
      const shouldUseExternal = enableExternal && (forceExternal || !result.hasInternalResults || !preferInternal || result.internalResults.confluence.totalResults < 3) // If internal has very few results

      if (shouldUseExternal) {
        console.log("🌐 Searching external sources...")

        try {
          const externalResult = await this.performExternalSearch(query, maxExternalResults)
          result.externalResults = externalResult
          result.hasExternalResults = externalResult.sources.length > 0

          console.log(`🌍 External results: ${externalResult.sources.length} sources`)
        } catch (error) {
          console.error("❌ External search failed:", error)
          result.hasExternalResults = false
        }
      } else if (!enableExternal) {
        console.log("🚫 External search disabled by configuration")
      }

      // Determine search strategy
      if (result.hasInternalResults && result.hasExternalResults) {
        result.searchStrategy = "hybrid"
      } else if (result.hasInternalResults) {
        result.searchStrategy = "internal_only"
      } else if (result.hasExternalResults) {
        result.searchStrategy = "external_only"
      } else {
        result.searchStrategy = "fallback"
      }

      // Build combined context
      result.combinedContext = this.buildCombinedContext(result)

      console.log(`✅ Hybrid search completed with strategy: ${result.searchStrategy}`)
    } catch (error) {
      console.error("❌ Hybrid search failed:", error)
      result.searchStrategy = "fallback"
    }

    return result
  }

  /**
   * Perform external search using Brave Search API
   */
  private async performExternalSearch(
    query: string,
    limit: number
  ): Promise<{
    sources: BraveSource[]
    newsResults: BraveNewsResult[]
    imageResults: BraveImageResult[]
  }> {
    const braveApiKey = process.env.BRAVE_API_KEY

    if (!braveApiKey) {
      throw new Error("Brave Search API key not configured")
    }

    const searchResponse = await fetch(`https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}&count=${limit}&country=US`, {
      method: "GET",
      headers: {
        Accept: "application/json",
        "X-Subscription-Token": braveApiKey
      }
    })

    if (!searchResponse.ok) {
      const errorData = await searchResponse.json()
      throw new Error(`Brave Search API error: ${errorData.error?.detail || searchResponse.statusText}`)
    }

    const searchResult = await searchResponse.json()

    // Extract results from Brave Search response
    const webResults = searchResult.web?.results || []
    const newsData = searchResult.news?.results || []
    const imagesData = searchResult.images?.results || []

    // Transform web sources
    const sources: BraveSource[] = webResults.map((item: BraveWebResult) => ({
      url: item.url,
      title: item.title || item.url,
      description: item.description || "",
      content: item.description || "",
      markdown: item.description || "",
      favicon: null,
      image: null,
      siteName: new URL(item.url).hostname,
      source: "brave_search"
    }))

    // Transform news results
    const newsResults: BraveNewsResult[] = newsData.map((item: BraveNewsItem) => ({
      url: item.url,
      title: item.title,
      description: item.description || "",
      publishedDate: item.page_age,
      source: item.source || (item.url ? new URL(item.url).hostname : undefined),
      image: null
    }))

    // Transform image results
    const imageResults: BraveImageResult[] = imagesData
      .map((item: BraveImageItem) => {
        if (!item.url || !item.thumbnail?.src) return null
        return {
          url: item.url,
          title: item.title || "Untitled",
          thumbnail: item.thumbnail.src,
          source: item.source || (item.url ? new URL(item.url).hostname : undefined),
          width: item.thumbnail.width,
          height: item.thumbnail.height,
          position: item.position || 0
        }
      })
      .filter(Boolean)

    return { sources, newsResults, imageResults }
  }

  /**
   * Build combined context from internal and external results
   */
  private buildCombinedContext(result: HybridSearchResult): string {
    const contexts: string[] = []

    // Add internal Confluence results
    result.internalResults.confluence.pages.forEach((page, index) => {
      const excerpt = page.excerpt || page.content.substring(0, 500)
      contexts.push(`[INTERNAL-${index + 1}] ${page.title} (${page.space})
URL: ${page.url}
Author: ${page.author}
Last Modified: ${page.lastModified}
${excerpt}`)
    })

    // Add internal vector search results
    result.internalResults.vectorSearch.forEach((doc, index) => {
      const metadata = doc.metadata
      contexts.push(`[VECTOR-${index + 1}] ${metadata.title} (${metadata.space})
URL: ${metadata.url}
${doc.pageContent.substring(0, 500)}`)
    })

    // Add external sources (if no good internal results)
    if (!result.hasInternalResults || result.searchStrategy === "hybrid") {
      result.externalResults.sources.slice(0, 5).forEach((source, index) => {
        contexts.push(`[EXTERNAL-${index + 1}] ${source.title}
URL: ${source.url}
${source.description}`)
      })
    }

    return contexts.join("\n\n---\n\n")
  }

  /**
   * Get search recommendations based on available data
   */
  getSearchRecommendations(result: HybridSearchResult): {
    shouldIndexMore: boolean
    recommendedQueries: string[]
    dataQuality: "excellent" | "good" | "poor" | "none"
  } {
    const recommendations = {
      shouldIndexMore: false,
      recommendedQueries: [] as string[],
      dataQuality: "none" as "excellent" | "good" | "poor" | "none"
    }

    const internalCount = result.internalResults.confluence.pages.length + result.internalResults.vectorSearch.length
    const externalCount = result.externalResults.sources.length

    // Determine data quality
    if (internalCount >= 5) {
      recommendations.dataQuality = "excellent"
    } else if (internalCount >= 2) {
      recommendations.dataQuality = "good"
    } else if (externalCount >= 3) {
      recommendations.dataQuality = "poor"
    }

    // Recommend indexing if internal results are poor
    if (internalCount < 2 && confluenceService.isConfigured()) {
      recommendations.shouldIndexMore = true

      // Generate recommended queries based on the search
      const words = result.query.toLowerCase().split(/\s+/)
      recommendations.recommendedQueries = [
        result.query, // Original query
        words.slice(0, 2).join(" "), // First two words
        words.slice(-2).join(" ") // Last two words
      ].filter((q) => q.length > 2)
    }

    return recommendations
  }
}

// Singleton instance
export const hybridSearchService = new HybridSearchService()
