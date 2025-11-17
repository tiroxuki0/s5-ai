import { NextRequest, NextResponse } from "next/server"

// Widget chat API proxy
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { messages, braveApiKey } = body

    // Forward the request to the actual S5 search API
    const apiUrl = new URL("/api/s5/search", request.nextUrl.origin)

    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        messages,
        braveApiKey
      })
    })

    // Handle streaming response from s5/search API
    const reader = response.body?.getReader()
    const decoder = new TextDecoder()
    let aiResponse = ""
    let sources: any[] = []
    let imageResults: any[] = []
    let newsResults: any[] = []
    let followUpQuestions: string[] = []
    let ticker: string | null = null
    let statusMessage = ""

    if (reader) {
      let buffer = ""
      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split("\n")
        buffer = lines.pop() || "" // Keep incomplete line in buffer

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              const data = JSON.parse(line.slice(6))

              if (data.type === "data-ai-response" && data.data?.content) {
                aiResponse = data.data.content
              } else if (data.type === "text" && (data.content || data.data?.content)) {
                aiResponse = (aiResponse || "") + (data.content || data.data?.content || "")
              } else if (data.type === "data-sources" && data.data) {
                if (Array.isArray(data.data.sources)) {
                  sources = data.data.sources
                }
                if (Array.isArray(data.data.imageResults)) {
                  imageResults = data.data.imageResults
                } else {
                }
                if (Array.isArray(data.data.newsResults)) {
                  newsResults = data.data.newsResults
                }
              } else if (data.type === "data-followup" && data.data?.questions) {
                followUpQuestions = data.data.questions
                } else if (data.type === "data-ticker" && (data.data?.symbol || data.data?.ticker)) {
                ticker = data.data.symbol || data.data.ticker
              } else if (data.type === "data-status" && data.data?.message) {
                statusMessage = data.data.message
              }
            } catch (e) {
              console.log("Widget API parse error:", e, "for line:", line)
            }
          }
        }
      }
    }

    const data = {
      content: aiResponse,
      sources,
      imageResults,
      newsResults,
      followUpQuestions,
      ticker,
      status: statusMessage
    }

    // Return with CORS headers
    return NextResponse.json(data, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type"
      }
    })
  } catch (error) {
    console.error("Widget API error:", error)

    return NextResponse.json(
      { error: "Internal server error" },
      {
        status: 500,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type"
        }
      }
    )
  }
}

// Handle OPTIONS for CORS preflight
export async function OPTIONS() {
  return NextResponse.json(
    {},
    {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type"
      }
    }
  )
}
