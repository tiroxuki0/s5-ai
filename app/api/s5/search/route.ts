import { NextResponse } from "next/server"
import { createGroq } from "@ai-sdk/groq"
import { streamText, generateText, createUIMessageStream, createUIMessageStreamResponse, convertToModelMessages } from "ai"
import type { ModelMessage } from "ai"
import { detectCompanyTicker } from "@/lib/company-ticker-map"
import { selectRelevantContent } from "@/lib/content-selection"
import { Redis } from "@upstash/redis"
import { hybridSearchService } from "@/lib/services/hybrid-search"

// Initialize Redis (optional - fallback to no cache if not configured)
let redis: Redis | null = null
try {
  if (process.env.REDIS_URL && process.env.REDIS_TOKEN) {
    redis = new Redis({
      url: process.env.REDIS_URL,
      token: process.env.REDIS_TOKEN
    })
    console.log("Redis cache enabled")
  } else {
    console.log("Redis not configured - running without cache")
  }
} catch (error) {
  console.warn("Failed to initialize Redis:", error)
}

// Cache TTL: 12 hours for search results
const CACHE_TTL = 43200

// Generate cache key from query
function generateCacheKey(query: string): string {
  // Normalize query and create hash-like key
  const normalized = query.toLowerCase().trim().replace(/\s+/g, "_").slice(0, 50)
  const cacheKey = `search:${normalized}`
  console.log("🔑 Generated cache key for query:", query, "->", cacheKey)
  return cacheKey
}

// Cache wrapper for search results
async function getCachedResults(cacheKey: string): Promise<any | null> {
  if (!redis) {
    console.log("❌ Redis not available")
    return null
  }

  try {
    const cached = await redis.get(cacheKey)
    if (cached) {
      console.log("🔄 Redis cache hit for:", cacheKey)
      let parsed
      if (typeof cached === "string") {
        parsed = JSON.parse(cached)
      } else if (typeof cached === "object") {
        // Redis có thể trả về object trực tiếp
        parsed = cached
      } else {
        console.log("❌ Unexpected cache type:", typeof cached)
        return null
      }
      console.log("📋 Parsed cache has sources:", parsed.sources?.length || 0)
      return parsed
    } else {
      console.log("❌ Cache miss for:", cacheKey)
    }
  } catch (error) {
    console.warn("Redis cache read error:", error)
  }
  return null
}

// Save results to cache
async function setCachedResults(cacheKey: string, results: any): Promise<void> {
  if (!redis) {
    console.log("❌ Redis not available for saving")
    return
  }

  try {
    const jsonString = JSON.stringify(results)
    console.log("💾 Saving to Redis cache:", cacheKey, "size:", jsonString.length, "sources:", results.sources?.length || 0)
    await redis.set(cacheKey, jsonString, { ex: CACHE_TTL })
    console.log("✅ Saved to Redis cache:", cacheKey, "TTL:", CACHE_TTL)
  } catch (error) {
    console.warn("Redis cache write error:", error)
  }
}

export async function POST(request: Request) {
  const requestId = Math.random().toString(36).substring(7)

  console.log("🔥 S5 search request:", requestId)
  console.log("🔴 Redis available:", !!redis)

  let body: any
  let messages: any[]

  try {
    body = await request.json()
    messages = body?.messages || []

  } catch (parseError) {
    console.error("Error parsing request body:", parseError)
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 })
  }

  try {
    // Extract query from v5 message structure (messages have parts array)
    let query = body.query
    if (!query && messages.length > 0) {
      const lastMessage = messages[messages.length - 1]
      if (lastMessage.parts && Array.isArray(lastMessage.parts)) {
        // v5 structure
        const textParts = lastMessage.parts.filter((p: any) => p.type === "text")
        query = textParts.map((p: any) => p.text || "").join(" ")
      } else if (lastMessage.content) {
        // Fallback for v4 structure
        query = lastMessage.content
      }
    }

    if (!query) {
      return NextResponse.json({ error: "Query is required" }, { status: 400 })
    }

    // Generate cache key for this query
    const cacheKey = generateCacheKey(query)

    // Check search settings
    // Default to false (disabled) if not set, only enable if explicitly set to 'true'
    const enableExternalSearch = process.env.ENABLE_EXTERNAL_SEARCH === "true"
    const enableAISearch = process.env.ENABLE_AI_SEARCH === "true"

    // Always check cache first before making API calls
    console.log("🔄 Starting cache check for query:", query)
    const cachedResults = await getCachedResults(cacheKey)
    if (cachedResults) {
      console.log("🚀 CACHE HIT - Returning cached results for query:", query)

      // Filter cached results based on current external search setting
      let filteredSources = cachedResults.sources || []
      let filteredNewsResults = cachedResults.newsResults || []
      let filteredImageResults = cachedResults.imageResults || []

      if (!enableExternalSearch) {
        // Remove external sources when external search is disabled
        filteredSources = filteredSources.filter((source: any) => source.source !== "brave_search")
        // Keep only internal images when external search is disabled
        filteredImageResults = filteredImageResults.filter((img: any) => img.source === "confluence")
        // Remove external news when external search is disabled
        filteredNewsResults = []
      }

      console.log("📊 Cache contains (after filtering):", {
        sources: filteredSources.length,
        news: filteredNewsResults.length,
        images: filteredImageResults.length,
        ticker: cachedResults.ticker || null,
        aiResponse: cachedResults.aiResponse ? "YES" : "NO"
      })

      // Return cached results as streaming response
      const stream = createUIMessageStream({
        originalMessages: messages,
        execute: async ({ writer }) => {
          // Send cached data parts
          if (filteredSources.length > 0) {
            writer.write({
              type: "data-sources",
              id: "sources-cached",
              data: {
                sources: filteredSources,
                newsResults: filteredNewsResults,
                imageResults: filteredImageResults
              }
            })
          }

          if (cachedResults.ticker) {
            writer.write({
              type: "data-ticker",
              id: "ticker-cached",
              data: { symbol: cachedResults.ticker }
            })
          }

          if (cachedResults.followUpQuestions?.length > 0) {
            writer.write({
              type: "data-followup",
              id: "followup-cached",
              data: { questions: cachedResults.followUpQuestions }
            })
          }

          // Send cached AI response as a complete message
          if (cachedResults.aiResponse) {
            writer.write({
              type: "data-ai-response",
              id: "ai-response-cached",
              data: { content: cachedResults.aiResponse }
            })
          }
        }
      })
      return createUIMessageStreamResponse({ stream })
    }

    console.log("🌐 CACHE MISS - Making API calls for query:", query)

    // Use API key from request body if provided, otherwise fall back to environment variable
    const braveApiKey = body.braveApiKey || process.env.BRAVE_API_KEY
    const groqApiKey = process.env.GROQ_API_KEY

    if (!braveApiKey) {
      return NextResponse.json({ error: "Brave Search API key not configured" }, { status: 500 })
    }

    if (!groqApiKey) {
      return NextResponse.json({ error: "Groq API key not configured" }, { status: 500 })
    }

    // Configure Groq with the OSS 120B model
    const groq = createGroq({
      apiKey: groqApiKey
    })

    // Perform hybrid search and AI analysis

    // Initialize data for caching (shared across the request)
    let cacheData = {
      sources: [] as any[],
      newsResults: [] as any[],
      imageResults: [] as any[],
      ticker: undefined as string | undefined,
      followUpQuestions: [] as string[],
      aiResponse: undefined as string | undefined,
      searchStrategy: "fallback" as string
    }

    // Create a UIMessage stream with custom data parts
    const stream = createUIMessageStream({
      originalMessages: messages,
      execute: async ({ writer }) => {
        try {
          // Send initial status
          writer.write({
            type: "data-status",
            id: "status-1",
            data: { message: "Starting hybrid search..." },
            transient: true
          })

          // Perform hybrid search
          writer.write({
            type: "data-status",
            id: "status-2",
            data: { message: "Searching internal knowledge base..." },
            transient: true
          })

          const hybridResult = await hybridSearchService.search(query, {
            maxInternalResults: 5,
            maxExternalResults: enableExternalSearch ? 10 : 0,
            preferInternal: true,
            forceExternal: false,
            minInternalScore: 0.7,
            enableExternal: enableExternalSearch,
            enableAISearch: enableAISearch,
            groqClient: enableAISearch ? groq : undefined
          })

          console.log(`🔍 Hybrid search completed with strategy: ${hybridResult.searchStrategy}`)

          // Prepare data for frontend
          let sources: Array<{
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
            source?: string // Add source indicator
          }> = []

          let newsResults: Array<{
            url: string
            title: string
            description?: string
            publishedDate?: string
            source?: string
            image?: string
          }> = []

          let imageResults: Array<{
            url: string
            title: string
            thumbnail?: string
            source?: string
            width?: number
            height?: number
            position?: number
          }> = []

          // Add internal Confluence results
          hybridResult.internalResults.confluence.pages.forEach((page) => {
            // Use first image from attachments if available
            const imageUrl = page.images && page.images.length > 0 ? page.images[0].url : undefined

            sources.push({
              url: page.url,
              title: page.title,
              description: page.excerpt || page.content.substring(0, 200),
              content: page.content,
              markdown: page.content,
              publishedDate: page.lastModified,
              author: page.author,
              image: imageUrl, // Add image from attachments
              siteName: `Confluence (${page.space})`,
              source: "confluence"
            })

            // Add all images from this page to imageResults
            if (page.images && page.images.length > 0) {
              page.images.forEach((img, imgIndex) => {
                imageResults.push({
                  url: img.url,
                  title: img.alt || img.title || `Image from ${page.title}`,
                  thumbnail: img.url, // Use same URL as thumbnail
                  source: "confluence",
                  position: imageResults.length
                })
              })
            }
          })

          // Add external sources if using hybrid or external-only
          if (hybridResult.searchStrategy === "hybrid" || hybridResult.searchStrategy === "external_only") {
            sources.push(
              ...hybridResult.externalResults.sources.map((source) => ({
                ...source,
                source: "brave_search"
              }))
            )
            newsResults = hybridResult.externalResults.newsResults
            imageResults = hybridResult.externalResults.imageResults
          }

          // Send all sources as a persistent data part
          writer.write({
            type: "data-sources",
            id: "sources-1",
            data: {
              sources,
              newsResults,
              imageResults,
              searchStrategy: hybridResult.searchStrategy
            }
          })

          // Update cache data
          cacheData.sources = sources
          cacheData.newsResults = newsResults
          cacheData.imageResults = imageResults
          cacheData.searchStrategy = hybridResult.searchStrategy

          // Small delay to ensure sources render first
          await new Promise((resolve) => setTimeout(resolve, 300))

          // Update status
          writer.write({
            type: "data-status",
            id: "status-3",
            data: { message: "Analyzing sources and generating answer..." },
            transient: true
          })

          // Detect if query is about a company
          const ticker = detectCompanyTicker(query)
          if (ticker) {
            writer.write({
              type: "data-ticker",
              id: "ticker-1",
              data: { symbol: ticker }
            })
            cacheData.ticker = ticker
          }

          // Build enhanced context with better structure and image support
          let contextParts: string[] = []

          // Add internal sources first (highest priority)
          if (hybridResult.internalResults.confluence.pages.length > 0) {
            contextParts.push("=== INTERNAL SOURCES (HIGHEST PRIORITY) ===")
            hybridResult.internalResults.confluence.pages.forEach((page, index) => {
              const excerpt = page.excerpt || page.content.substring(0, 800)
              const citationNumber = index + 1
              let pageContent = `[${citationNumber}] ${page.title} (${page.space})
URL: ${page.url}
Author: ${page.author || "Unknown"}
Last Modified: ${page.lastModified || "Unknown"}
Content: ${excerpt}`

              // Add images if available
              if (page.images && page.images.length > 0) {
                pageContent += `\nImages: ${page.images.map((img) => `[${img.alt || "Image"}](${img.url})`).join(", ")}`
              }

              contextParts.push(pageContent)
            })
          }

          // Add vector search results if available
          if (hybridResult.internalResults.vectorSearch.length > 0) {
            contextParts.push("=== VECTOR SEARCH RESULTS ===")
            const vectorStartIndex = hybridResult.internalResults.confluence.pages.length + 1
            hybridResult.internalResults.vectorSearch.forEach((doc, index) => {
              const metadata = doc.metadata as any
              const citationNumber = vectorStartIndex + index
              contextParts.push(`[${citationNumber}] ${metadata.title} (Vector Search)
URL: ${metadata.url}
Content: ${doc.pageContent.substring(0, 600)}`)
            })
          }

          // Add external sources (supporting evidence)
          if (hybridResult.externalResults.sources.length > 0) {
            contextParts.push("=== EXTERNAL SOURCES (SUPPORTING EVIDENCE) ===")
            hybridResult.externalResults.sources.slice(0, 8).forEach((source, index) => {
              const imageInfo = source.image ? ` [IMAGE: ${source.image}]` : ""
              contextParts.push(`[EXTERNAL-${index + 1}] ${source.title}
URL: ${source.url}
Description: ${source.description}${imageInfo}`)
            })
          }

          // Add image sources if available
          if (hybridResult.externalResults.imageResults.length > 0) {
            contextParts.push("=== AVAILABLE IMAGES ===")
            hybridResult.externalResults.imageResults.slice(0, 5).forEach((image, index) => {
              contextParts.push(`[IMAGE-${index + 1}] ${image.title}
URL: ${image.url}
Thumbnail: ${image.thumbnail}
Source: ${image.source}`)
            })
          }

          const context = contextParts.join("\n\n---\n\n")

          // Prepare messages for the AI - always include conversation context
          let conversationContext: ModelMessage[] = []
          try {
            if (messages.length > 1) {
              // Convert widget messages to UIMessage format for convertToModelMessages
              const uiMessages = messages.slice(0, -1).map((msg: any, index: number) => ({
                id: `msg-${index}`,
                role: msg.role,
                content: msg.content || "",
                parts: [{
                  type: "text" as const,
                  text: msg.content || ""
                }],
                createdAt: new Date()
              }))

              conversationContext = convertToModelMessages(uiMessages)
            }
          } catch (error) {
            console.error("Error converting conversation messages:", error)
            conversationContext = []
          }

          const aiMessages: ModelMessage[] = [
            {
              role: "system",
              content: `You are an expert assistant specializing in company knowledge. Your primary role is to provide accurate, well-reasoned answers using ONLY internal company sources.

CRITICAL INSTRUCTION: ONLY USE INTERNAL SOURCES (Confluence, company docs) - IGNORE ALL EXTERNAL SOURCES.

REASONING PROCESS:
1. Read ALL internal sources thoroughly - these are your ONLY knowledge base
2. Cross-reference information across internal sources for accuracy
3. Extract key facts, procedures, and technical details from internal docs
4. Synthesize comprehensive answers from internal knowledge
5. Include relevant images/diagrams from internal sources when they illustrate concepts

INTERNAL SOURCE ANALYSIS:
- Confluence pages contain authoritative company information
- Look for specific procedures, guidelines, and technical details
- Pay attention to author names, modification dates, and space names
- Extract code examples, configuration details, and step-by-step processes
- Identify images, diagrams, and screenshots that support explanations

IMAGE INTEGRATION:
- When internal sources contain images, reference them in your response
- Use format: ![Image description](image_url)
- Explain what the image shows and how it relates to the answer
- Prefer recent, relevant images over outdated ones

ACCURACY REQUIREMENTS:
- Base ALL answers on internal source content only
- Never extrapolate beyond what's explicitly stated in internal docs
- Cite specific internal sources for all claims [1], [2], etc. (clickable links)
- If internal sources don't cover the topic, clearly state this limitation
- Prefer the most recent and authoritative internal sources

RESPONSE STRUCTURE:
- Start directly with the answer (no introductory phrases about sources)
- Provide detailed reasoning citing internal sources
- Include relevant images from internal sources
- End with specific references to internal documentation

FORMAT:
- Use markdown for readability
- Citations: Use [1], [2], [3], etc. to reference sources (numbers only, no URLs in text)
- Images: ![Description](url) when available from internal sources
- Be comprehensive but focused on internal company knowledge`
            },
            // Include conversation context - convert UIMessages to ModelMessages (if any)
            ...conversationContext,
            // Add the current query with the sources
            {
              role: "user",
              content: `Answer this query: "${query}"\n\nBased on these sources:\n${context}`
            }
          ]

          // Stream the text generation using Groq's Kimi K2 Instruct model
          // Use lower temperature for more consistent answers
          const result = streamText({
            model: groq("moonshotai/kimi-k2-instruct"),
            messages: aiMessages,
            temperature: 0.3, // Reduced from 0.7 for consistency
            maxRetries: 2
          })

          // Merge the AI stream into our UIMessage stream
          writer.merge(result.toUIMessageStream())

          // Get the full answer for follow-up generation and caching
          const fullAnswer = await result.text
          cacheData.aiResponse = fullAnswer

          // Generate follow-up questions - always consider conversation history
          const conversationPreview = messages
            .map((m: { role: string; parts?: any[]; content?: string }) => {
              let content = ""
              if (m.parts && Array.isArray(m.parts)) {
                // v5 structure with parts
                const textParts = m.parts.filter((p: any) => p.type === "text")
                content = textParts.map((p: any) => p.text || "").join(" ")
              } else if (m.content) {
                // v4 structure or widget format with content
                content = m.content
              }
              return `${m.role}: ${content}`
            })
            .join("\n\n")

          try {
            const followUpResponse = await generateText({
              model: groq("moonshotai/kimi-k2-instruct"),
              messages: [
                {
                  role: "system",
                  content: `Generate 5 natural follow-up questions based on the query and answer.\n                \n                ONLY generate questions if the query warrants them:\n                - Skip for simple greetings or basic acknowledgments\n                - Create questions that feel natural, not forced\n                - Make them genuinely helpful, not just filler\n                - Focus on the topic and sources available\n                - Consider the full conversation history and avoid repeating previous questions\n                \n                If the query doesn't need follow-ups, return an empty response.\n                Return only the questions, one per line, no numbering or bullets.`
                },
                {
                  role: "user",
                  content: `Query: ${query}\n\nAnswer provided: ${fullAnswer.substring(0, 500)}...\n\n${
                    sources.length > 0 ? `Available sources about: ${sources.map((s: { title: string }) => s.title).join(", ")}\n\n` : ""
                  }Generate 5 diverse follow-up questions that would help the user learn more about this topic from different angles.`
                }
              ],
              temperature: 0.3, // Reduced for consistency
              maxRetries: 2
            })

            // Process follow-up questions
            const followUpQuestions = followUpResponse.text
              .split("\n")
              .map((q: string) => q.trim())
              .filter((q: string) => q.length > 0)
              .slice(0, 5)

            // Send follow-up questions as a data part
            writer.write({
              type: "data-followup",
              id: "followup-1",
              data: { questions: followUpQuestions }
            })

            // Update cache data
            cacheData.followUpQuestions = followUpQuestions
          } catch (followUpError) {
            // Error generating follow-up questions
          }
        } catch (error) {
          // Handle specific error types
          const errorMessage = error instanceof Error ? error.message : "Unknown error"
          const statusCode = error && typeof error === "object" && "statusCode" in error ? error.statusCode : error && typeof error === "object" && "status" in error ? error.status : undefined

          // Provide user-friendly error messages
          const errorResponses: Record<number, { error: string; suggestion?: string }> = {
            401: {
              error: "Invalid API key",
              suggestion: "Please check your API key is correct."
            },
            402: {
              error: "Insufficient credits",
              suggestion: "You've run out of credits. Please upgrade your plan."
            },
            429: {
              error: "Rate limit exceeded",
              suggestion: "Too many requests. Please wait a moment and try again."
            },
            504: {
              error: "Request timeout",
              suggestion: "The search took too long. Try a simpler query or fewer sources."
            }
          }

          const errorResponse = statusCode && errorResponses[statusCode as keyof typeof errorResponses] ? errorResponses[statusCode as keyof typeof errorResponses] : { error: errorMessage }

          writer.write({
            type: "data-error",
            id: "error-1",
            data: {
              error: errorResponse.error,
              ...(errorResponse.suggestion ? { suggestion: errorResponse.suggestion } : {}),
              ...(statusCode ? { statusCode } : {})
            },
            transient: true
          })
        } finally {
          // Always save to cache if we have successful data
          if (cacheData.sources.length > 0) {
            await setCachedResults(cacheKey, cacheData)
          }
        }
      }
    })

    return createUIMessageStreamResponse({ stream })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error"
    const errorStack = error instanceof Error ? error.stack : ""
    return NextResponse.json({ error: "Search failed", message: errorMessage, details: errorStack }, { status: 500 })
  }
}
