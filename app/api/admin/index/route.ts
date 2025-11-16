import { NextResponse } from 'next/server'
import { documentIngestionService } from '@/lib/services/document-ingestion'
import { vectorStoreService } from '@/lib/services/pinecone'
import { confluenceService } from '@/lib/services/confluence'

export async function GET() {
  try {
    console.log('📊 Getting indexing status...')

    const status = await documentIngestionService.getIndexingStatus()

    return NextResponse.json({
      success: true,
      data: status
    })

  } catch (error) {
    console.error('❌ Admin status error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { action, ...params } = body

    switch (action) {
      case 'index_confluence_query': {
        const { query, maxPages = 100 } = params

        if (!query) {
          return NextResponse.json(
            { success: false, error: 'Query parameter is required' },
            { status: 400 }
          )
        }

        const result = await documentIngestionService.indexConfluenceByQuery(query, { maxPages })
        return NextResponse.json({ success: true, data: result })
      }

      case 'index_confluence_pages': {
        const { pageIds } = params

        if (!pageIds || !Array.isArray(pageIds) || pageIds.length === 0) {
          return NextResponse.json(
            { success: false, error: 'pageIds array is required' },
            { status: 400 }
          )
        }

        const result = await documentIngestionService.indexConfluencePages(pageIds)
        return NextResponse.json({ success: true, data: result })
      }

      case 'index_confluence_spaces': {
        const { spaces, maxPages = 1000 } = params

        if (!spaces || !Array.isArray(spaces) || spaces.length === 0) {
          return NextResponse.json(
            { success: false, error: 'spaces array is required' },
            { status: 400 }
          )
        }

        const result = await documentIngestionService.indexConfluenceSpaces(spaces, { maxPages })
        return NextResponse.json({ success: true, data: result })
      }

      case 'clear_index': {
        const success = await vectorStoreService.clearIndex()
        return NextResponse.json({
          success,
          message: success ? 'Index cleared successfully' : 'Failed to clear index'
        })
      }

      case 'ensure_index': {
        const success = await vectorStoreService.ensureIndex()
        return NextResponse.json({
          success,
          message: success ? 'Index ensured successfully' : 'Failed to ensure index'
        })
      }

      case 'test_confluence': {
        const isConfigured = confluenceService.isConfigured()

        if (!isConfigured) {
          return NextResponse.json({
            success: false,
            error: 'Confluence not configured',
            config: {
              url: !!process.env.CONFLUENCE_URL,
              user: !!process.env.CONFLUENCE_USER,
              token: !!process.env.CONFLUENCE_TOKEN
            }
          })
        }

        // Test connection by searching for a simple query
        try {
          const testResult = await confluenceService.search('test', 1)
          return NextResponse.json({
            success: true,
            message: 'Confluence connection successful',
            testResults: testResult.totalResults
          })
        } catch (error) {
          return NextResponse.json({
            success: false,
            error: 'Confluence connection failed',
            details: error instanceof Error ? error.message : 'Unknown error'
          })
        }
      }

      case 'test_pinecone': {
        const isReady = vectorStoreService.isReady()

        if (!isReady) {
          return NextResponse.json({
            success: false,
            error: 'Pinecone not ready',
            config: {
              apiKey: !!process.env.PINECONE_API_KEY,
              indexName: !!process.env.PINECONE_INDEX_NAME
            }
          })
        }

        try {
          const stats = await vectorStoreService.getStats()
          return NextResponse.json({
            success: true,
            message: 'Pinecone connection successful',
            stats
          })
        } catch (error) {
          return NextResponse.json({
            success: false,
            error: 'Pinecone test failed',
            details: error instanceof Error ? error.message : 'Unknown error'
          })
        }
      }

      default:
        return NextResponse.json(
          { success: false, error: `Unknown action: ${action}` },
          { status: 400 }
        )
    }

  } catch (error) {
    console.error('❌ Admin action error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
