import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters"
import { Document } from "@langchain/core/documents"
import { confluenceService, ConfluencePage } from "./confluence"
import { vectorStoreService } from "./pinecone"

export interface IngestionOptions {
  chunkSize?: number
  chunkOverlap?: number
  batchSize?: number
  maxPages?: number
}

export interface IngestionResult {
  success: boolean
  totalPages: number
  indexedChunks: number
  errors: string[]
}

export class DocumentIngestionService {
  private textSplitter: RecursiveCharacterTextSplitter

  constructor(options: IngestionOptions = {}) {
    const { chunkSize = 1000, chunkOverlap = 200 } = options

    this.textSplitter = new RecursiveCharacterTextSplitter({
      chunkSize,
      chunkOverlap,
      separators: ["\n\n", "\n", " ", ""] // Split on paragraphs, lines, spaces
    })
  }

  /**
   * Index all Confluence pages for a given search query
   */
  async indexConfluenceByQuery(query: string, options: IngestionOptions = {}): Promise<IngestionResult> {
    const { batchSize = 50, maxPages = 1000 } = options

    console.log(`🚀 Starting Confluence indexing for query: "${query}"`)

    const result: IngestionResult = {
      success: false,
      totalPages: 0,
      indexedChunks: 0,
      errors: []
    }

    try {
      // Search for relevant pages
      const searchResult = await confluenceService.search(query, maxPages)
      result.totalPages = searchResult.pages.length

      console.log(`📄 Found ${searchResult.pages.length} relevant pages`)

      if (searchResult.pages.length === 0) {
        result.success = true
        return result
      }

      // Process pages in batches
      const allDocuments: Document[] = []

      for (let i = 0; i < searchResult.pages.length; i += batchSize) {
        const batch = searchResult.pages.slice(i, i + batchSize)
        console.log(`🔄 Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(searchResult.pages.length / batchSize)}`)

        const batchDocuments = await this.processPages(batch)
        allDocuments.push(...batchDocuments)
      }

      // Add to vector store
      const vectorStoreSuccess = await vectorStoreService.addDocuments(allDocuments)
      if (!vectorStoreSuccess) {
        throw new Error("Failed to add documents to vector store")
      }

      result.indexedChunks = allDocuments.length
      result.success = true

      console.log(`✅ Successfully indexed ${result.indexedChunks} document chunks`)
    } catch (error) {
      console.error("❌ Document ingestion failed:", error)
      result.errors.push(error instanceof Error ? error.message : "Unknown error")
    }

    return result
  }

  /**
   * Index specific Confluence pages by IDs
   */
  async indexConfluencePages(pageIds: string[]): Promise<IngestionResult> {
    console.log(`🚀 Starting Confluence indexing for ${pageIds.length} specific pages`)

    const result: IngestionResult = {
      success: false,
      totalPages: 0,
      indexedChunks: 0,
      errors: []
    }

    try {
      const pages: ConfluencePage[] = []

      // Fetch each page
      for (const pageId of pageIds) {
        const page = await confluenceService.getPage(pageId)
        if (page) {
          pages.push(page)
        } else {
          result.errors.push(`Failed to fetch page ${pageId}`)
        }
      }

      result.totalPages = pages.length

      if (pages.length === 0) {
        result.success = true
        return result
      }

      // Process and index pages
      const documents = await this.processPages(pages)
      const vectorStoreSuccess = await vectorStoreService.addDocuments(documents)

      if (!vectorStoreSuccess) {
        throw new Error("Failed to add documents to vector store")
      }

      result.indexedChunks = documents.length
      result.success = true

      console.log(`✅ Successfully indexed ${result.indexedChunks} document chunks from ${result.totalPages} pages`)
    } catch (error) {
      console.error("❌ Page indexing failed:", error)
      result.errors.push(error instanceof Error ? error.message : "Unknown error")
    }

    return result
  }

  /**
   * Index entire Confluence spaces
   */
  async indexConfluenceSpaces(spaces: string[], options: IngestionOptions = {}): Promise<IngestionResult> {
    const { maxPages = 5000 } = options

    console.log(`🚀 Starting Confluence indexing for spaces: ${spaces.join(", ")}`)

    const result: IngestionResult = {
      success: false,
      totalPages: 0,
      indexedChunks: 0,
      errors: []
    }

    try {
      // For each space, we'll do a broad search to get all pages
      const allPages: ConfluencePage[] = []

      for (const space of spaces) {
        console.log(`🔍 Searching space: ${space}`)

        // Use a very broad query to get all pages in the space
        const searchResult = await confluenceService.search("*", maxPages, 0)

        // Filter pages by space
        const spacePages = searchResult.pages.filter((page) => page.space === space)
        allPages.push(...spacePages)

        console.log(`📄 Found ${spacePages.length} pages in space ${space}`)
      }

      result.totalPages = allPages.length

      if (allPages.length === 0) {
        result.success = true
        return result
      }

      // Process in batches
      const batchSize = 50
      const allDocuments: Document[] = []

      for (let i = 0; i < allPages.length; i += batchSize) {
        const batch = allPages.slice(i, i + batchSize)
        console.log(`🔄 Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(allPages.length / batchSize)}`)

        const batchDocuments = await this.processPages(batch)
        allDocuments.push(...batchDocuments)
      }

      // Add to vector store
      const vectorStoreSuccess = await vectorStoreService.addDocuments(allDocuments)
      if (!vectorStoreSuccess) {
        throw new Error("Failed to add documents to vector store")
      }

      result.indexedChunks = allDocuments.length
      result.success = true

      console.log(`✅ Successfully indexed ${result.indexedChunks} document chunks from ${result.totalPages} pages`)
    } catch (error) {
      console.error("❌ Space indexing failed:", error)
      result.errors.push(error instanceof Error ? error.message : "Unknown error")
    }

    return result
  }

  /**
   * Process Confluence pages into documents with metadata
   */
  private async processPages(pages: ConfluencePage[]): Promise<Document[]> {
    const documents: Document[] = []

    for (const page of pages) {
      try {
        // Clean the content
        const cleanContent = this.cleanConfluenceContent(page.content)

        if (!cleanContent.trim()) {
          console.warn(`⚠️ Skipping empty page: ${page.title}`)
          continue
        }

        // Create base document
        const baseDocument = new Document({
          pageContent: cleanContent,
          metadata: {
            id: page.id,
            title: page.title,
            url: page.url,
            space: page.space,
            lastModified: page.lastModified,
            author: page.author,
            excerpt: page.excerpt,
            source: "confluence",
            type: "full_page"
          }
        })

        // Split into chunks if content is long
        if (cleanContent.length > this.textSplitter.chunkSize) {
          const chunks = await this.textSplitter.splitDocuments([baseDocument])

          // Add chunk metadata
          chunks.forEach((chunk, index) => {
            chunk.metadata = {
              ...chunk.metadata,
              chunkIndex: index,
              totalChunks: chunks.length,
              type: "page_chunk"
            }
          })

          documents.push(...chunks)
        } else {
          documents.push(baseDocument)
        }
      } catch (error) {
        console.error(`❌ Failed to process page ${page.title}:`, error)
      }
    }

    return documents
  }

  /**
   * Clean Confluence HTML content
   */
  private cleanConfluenceContent(content: string): string {
    if (!content) return ""

    // Remove HTML tags
    let clean = content.replace(/<[^>]*>/g, "")

    // Decode HTML entities
    clean = clean
      .replace(/&nbsp;/g, " ")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&amp;/g, "&")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&mdash;/g, "—")
      .replace(/&ndash;/g, "–")
      .replace(/&hellip;/g, "…")

    // Remove extra whitespace
    clean = clean.replace(/\s+/g, " ").trim()

    // Remove Confluence-specific artifacts
    clean = clean.replace(/\{.*?\}/g, "") // Remove macro placeholders

    return clean
  }

  /**
   * Get indexing status and statistics
   */
  async getIndexingStatus(): Promise<{
    vectorStoreReady: boolean
    confluenceConfigured: boolean
    indexStats: {
      totalVectorCount: number
      namespaces: Record<string, { vectorCount: number }>
    } | null
    timestamp: string
    error?: string
  }> {
    try {
      const stats = await vectorStoreService.getStats()
      return {
        vectorStoreReady: vectorStoreService.isReady(),
        confluenceConfigured: confluenceService.isConfigured(),
        indexStats: stats,
        timestamp: new Date().toISOString()
      }
    } catch (error) {
      console.error("❌ Failed to get indexing status:", error)
      return {
        vectorStoreReady: false,
        confluenceConfigured: false,
        indexStats: null,
        error: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString()
      }
    }
  }
}

// Singleton instance
export const documentIngestionService = new DocumentIngestionService()
