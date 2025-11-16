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

    const data = await response.json()

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
