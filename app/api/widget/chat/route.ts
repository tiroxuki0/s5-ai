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
    let followUpQuestions: string[] = []

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
              } else if (data.type === "data-sources" && data.data?.sources) {
                sources = data.data.sources
              } else if (data.type === "data-followup" && data.data?.questions) {
                followUpQuestions = data.data.questions
              }
            } catch (e) {
              // Ignore parse errors for now
            }
          }
        }
      }
    }

    const data = {
      content: aiResponse,
      sources,
      followUpQuestions
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
