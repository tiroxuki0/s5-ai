import { Pinecone } from "@pinecone-database/pinecone"
import { PineconeStore } from "@langchain/pinecone"
import { OpenAIEmbeddings } from "@langchain/openai"
import { Document } from "@langchain/core/documents"

export interface PineconeConfig {
  apiKey: string
  indexName: string
  dimension?: number
  metric?: "cosine" | "euclidean" | "dotproduct"
}

export class VectorStoreService {
  private pinecone: Pinecone | null = null
  private embeddings: OpenAIEmbeddings | null = null
  private config: PineconeConfig

  constructor(config: PineconeConfig) {
    this.config = {
      dimension: 1536, // OpenAI text-embedding-ada-002 dimension
      metric: "cosine",
      ...config
    }

    this.initialize()
  }

  private initialize() {
    try {
      if (!this.config.apiKey) {
        console.warn("Pinecone API key not configured")
        return
      }

      this.pinecone = new Pinecone({
        apiKey: this.config.apiKey
      })

      // Initialize OpenAI embeddings
      this.embeddings = new OpenAIEmbeddings({
        openAIApiKey: process.env.OPENAI_API_KEY,
        modelName: "text-embedding-ada-002"
      })

      console.log("✅ Pinecone service initialized")
    } catch (error) {
      console.error("❌ Failed to initialize Pinecone:", error)
    }
  }

  /**
   * Ensure the index exists, create if it doesn't
   */
  async ensureIndex(): Promise<boolean> {
    if (!this.pinecone) {
      console.warn("Pinecone not initialized")
      return false
    }

    try {
      const existingIndexes = await this.pinecone.listIndexes()
      const indexExists = existingIndexes.indexes?.some((idx) => idx.name === this.config.indexName)

      if (!indexExists) {
        console.log(`📝 Creating Pinecone index: ${this.config.indexName}`)
        await this.pinecone.createIndex({
          name: this.config.indexName,
          dimension: this.config.dimension!,
          metric: this.config.metric!,
          spec: {
            serverless: {
              cloud: "aws",
              region: "us-east-1"
            }
          }
        })

        // Wait for index to be ready
        console.log("⏳ Waiting for index to be ready...")
        await new Promise((resolve) => setTimeout(resolve, 10000))

        console.log("✅ Index created successfully")
      } else {
        console.log(`✅ Index ${this.config.indexName} already exists`)
      }

      return true
    } catch (error) {
      console.error("❌ Failed to ensure index:", error)
      return false
    }
  }

  /**
   * Get or create PineconeStore instance
   */
  async getVectorStore(): Promise<PineconeStore | null> {
    if (!this.pinecone || !this.embeddings) {
      console.warn("Pinecone or embeddings not initialized")
      return null
    }

    try {
      const index = this.pinecone.Index(this.config.indexName)
      return await PineconeStore.fromExistingIndex(this.embeddings, {
        pineconeIndex: index,
        maxConcurrency: 5
      })
    } catch (error) {
      console.error("❌ Failed to create vector store:", error)
      return null
    }
  }

  /**
   * Add documents to the vector store
   */
  async addDocuments(documents: Document[]): Promise<boolean> {
    try {
      const vectorStore = await this.getVectorStore()
      if (!vectorStore) return false

      console.log(`📥 Adding ${documents.length} documents to vector store`)

      // Add documents in batches to avoid rate limits
      const batchSize = 100
      for (let i = 0; i < documents.length; i += batchSize) {
        const batch = documents.slice(i, i + batchSize)
        await vectorStore.addDocuments(batch)
        console.log(`✅ Added batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(documents.length / batchSize)}`)
      }

      console.log("✅ All documents added successfully")
      return true
    } catch (error) {
      console.error("❌ Failed to add documents:", error)
      return false
    }
  }

  /**
   * Search for similar documents
   */
  async similaritySearch(query: string, k: number = 5): Promise<Document[]> {
    try {
      const vectorStore = await this.getVectorStore()
      if (!vectorStore) return []

      console.log(`🔍 Performing similarity search for: "${query}"`)

      const results = await vectorStore.similaritySearch(query, k)
      console.log(`📊 Found ${results.length} similar documents`)

      return results
    } catch (error) {
      console.error("❌ Similarity search failed:", error)
      return []
    }
  }

  /**
   * Search with score (returns similarity scores)
   */
  async similaritySearchWithScore(query: string, k: number = 5): Promise<[Document, number][]> {
    try {
      const vectorStore = await this.getVectorStore()
      if (!vectorStore) return []

      console.log(`🔍 Performing similarity search with scores for: "${query}"`)

      const results = await vectorStore.similaritySearchWithScore(query, k)
      console.log(`📊 Found ${results.length} similar documents with scores`)

      return results
    } catch (error) {
      console.error("❌ Similarity search with score failed:", error)
      return []
    }
  }

  /**
   * Delete documents by IDs
   */
  async deleteDocuments(ids: string[]): Promise<boolean> {
    try {
      const vectorStore = await this.getVectorStore()
      if (!vectorStore) return false

      console.log(`🗑️ Deleting ${ids.length} documents from vector store`)
      await vectorStore.delete({ ids })
      console.log("✅ Documents deleted successfully")
      return true
    } catch (error) {
      console.error("❌ Failed to delete documents:", error)
      return false
    }
  }

  /**
   * Clear all documents from the index
   */
  async clearIndex(): Promise<boolean> {
    try {
      if (!this.pinecone) return false

      const index = this.pinecone.Index(this.config.indexName)
      await index.deleteAll()
      console.log("🧹 Index cleared successfully")
      return true
    } catch (error) {
      console.error("❌ Failed to clear index:", error)
      return false
    }
  }

  /**
   * Get index statistics
   */
  async getStats(): Promise<{
    totalVectorCount: number
    namespaces: Record<string, { vectorCount: number }>
  } | null> {
    try {
      if (!this.pinecone) return null

      const index = this.pinecone.Index(this.config.indexName)
      const stats = await index.describeIndexStats()
      console.log("📊 Index stats:", stats)
      //@ts-ignore
      return stats
    } catch (error) {
      console.error("❌ Failed to get index stats:", error)
      return null
    }
  }

  /**
   * Check if service is ready
   */
  isReady(): boolean {
    return !!(this.pinecone && this.embeddings)
  }
}

// Configuration from environment
const pineconeConfig: PineconeConfig = {
  apiKey: process.env.PINECONE_API_KEY || "",
  indexName: process.env.PINECONE_INDEX_NAME || "s5-docs"
}

// Singleton instance
export const vectorStoreService = new VectorStoreService(pineconeConfig)
