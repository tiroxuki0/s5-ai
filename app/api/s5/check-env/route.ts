import { NextResponse } from "next/server"

export async function GET() {
  const enableExternalSearch = process.env.ENABLE_EXTERNAL_SEARCH
  return NextResponse.json({
    hasBraveKey: !!process.env.BRAVE_API_KEY,
    enableExternalSearch: enableExternalSearch,
    enableExternalSearchParsed: enableExternalSearch === "true"
  })
}
