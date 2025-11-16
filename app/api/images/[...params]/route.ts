import { NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest, { params }: { params: Promise<{ params: string[] }> }) {
  try {
    const resolvedParams = await params
    const [pageId, ...filenameParts] = resolvedParams?.params
    const filename = filenameParts.join("/")

    if (!pageId || !filename) {
      return NextResponse.json({ error: "Missing pageId or filename" }, { status: 400 })
    }

    // Confluence credentials
    const baseUrl = process.env.CONFLUENCE_URL
    const username = process.env.CONFLUENCE_USER
    const token = process.env.CONFLUENCE_TOKEN

    if (!baseUrl || !username || !token) {
      return NextResponse.json({ error: "Confluence credentials not configured" }, { status: 500 })
    }

    // Build attachment download URL
    const attachmentUrl = `${baseUrl}/wiki/download/attachments/${pageId}/${filename}`

    // Fetch image from Confluence with authentication
    const response = await fetch(attachmentUrl, {
      method: "GET",
      headers: {
        Authorization: `Basic ${Buffer.from(`${username}:${token}`).toString("base64")}`,
        Accept: "*/*"
      }
    })

    if (!response.ok) {
      console.error(`Failed to fetch image: ${response.status} ${response.statusText}`)
      return NextResponse.json({ error: "Failed to fetch image" }, { status: response.status })
    }

    // Get content type
    const contentType = response.headers.get("content-type") || "image/png"

    // Get image buffer
    const buffer = await response.arrayBuffer()

    // Return image with proper headers
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=3600", // Cache for 1 hour
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET",
        "Access-Control-Allow-Headers": "Content-Type"
      }
    })
  } catch (error) {
    console.error("Error proxying image:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
