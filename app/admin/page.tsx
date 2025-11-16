"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2, Database, Search, Trash2, RefreshCw, CheckCircle, XCircle } from "lucide-react"
import { toast } from "sonner"

interface IndexingStatus {
  vectorStoreReady: boolean
  confluenceConfigured: boolean
  indexStats: any
  timestamp: string
  error?: string
}

export default function AdminPage() {
  const [status, setStatus] = useState<IndexingStatus | null>(null)
  const [loading, setLoading] = useState(false)
  const [indexingQuery, setIndexingQuery] = useState("")
  const [indexingSpaces, setIndexingSpaces] = useState("")
  const [pageIds, setPageIds] = useState("")

  const fetchStatus = async () => {
    try {
      const response = await fetch("/api/admin/index")
      const data = await response.json()

      if (data.success) {
        setStatus(data.data)
      } else {
        toast.error("Failed to fetch status: " + data.error)
      }
    } catch (error) {
      toast.error("Failed to fetch status")
      console.error(error)
    }
  }

  const performAction = async (action: string, params: any = {}) => {
    setLoading(true)
    try {
      const response = await fetch("/api/admin/index", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ...params })
      })

      const data = await response.json()

      if (data.success) {
        toast.success(`${action} completed successfully`)
        await fetchStatus() // Refresh status
      } else {
        toast.error(`${action} failed: ${data.error}`)
      }
    } catch (error) {
      toast.error(`${action} failed`)
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchStatus()
  }, [])

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">S5 Admin Panel</h1>
          <p className="text-gray-600 dark:text-gray-400">Manage document indexing and search configuration</p>
        </div>

        {/* Status Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                Vector Store (Pinecone)
              </CardTitle>
              <CardDescription>Document storage and retrieval</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2 mb-4">
                {status?.vectorStoreReady ? <CheckCircle className="h-5 w-5 text-green-500" /> : <XCircle className="h-5 w-5 text-red-500" />}
                <span className={status?.vectorStoreReady ? "text-green-600" : "text-red-600"}>{status?.vectorStoreReady ? "Connected" : "Not Connected"}</span>
              </div>

              {status?.indexStats && (
                <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                  <div>Total Vectors: {status.indexStats.totalVectorCount || 0}</div>
                  <div>Namespaces: {Object.keys(status.indexStats.namespaces || {}).length}</div>
                </div>
              )}

              <div className="flex gap-2 mt-4">
                <Button size="sm" variant="outline" onClick={() => performAction("test_pinecone")} disabled={loading}>
                  Test Connection
                </Button>
                <Button size="sm" variant="outline" onClick={() => performAction("ensure_index")} disabled={loading}>
                  Ensure Index
                </Button>
                <Button size="sm" variant="destructive" onClick={() => performAction("clear_index")} disabled={loading}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Search className="h-5 w-5" />
                Confluence Integration
              </CardTitle>
              <CardDescription>Internal documentation source</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2 mb-4">
                {status?.confluenceConfigured ? <CheckCircle className="h-5 w-5 text-green-500" /> : <XCircle className="h-5 w-5 text-red-500" />}
                <span className={status?.confluenceConfigured ? "text-green-600" : "text-red-600"}>{status?.confluenceConfigured ? "Configured" : "Not Configured"}</span>
              </div>

              <div className="flex gap-2 mt-4">
                <Button size="sm" variant="outline" onClick={() => performAction("test_confluence")} disabled={loading}>
                  Test Connection
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Indexing Actions */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Index by Search Query</CardTitle>
              <CardDescription>Search and index Confluence pages matching a query</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Input placeholder="Enter search query (e.g., 'API documentation')" value={indexingQuery} onChange={(e) => setIndexingQuery(e.target.value)} />
              <Button onClick={() => performAction("index_confluence_query", { query: indexingQuery })} disabled={loading || !indexingQuery.trim()} className="w-full">
                {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Index by Query
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Index Specific Pages</CardTitle>
              <CardDescription>Index specific Confluence pages by ID</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Input placeholder="Enter page IDs (comma-separated)" value={pageIds} onChange={(e) => setPageIds(e.target.value)} />
              <Button
                onClick={() =>
                  performAction("index_confluence_pages", {
                    pageIds: pageIds
                      .split(",")
                      .map((id) => id.trim())
                      .filter(Boolean)
                  })
                }
                disabled={loading || !pageIds.trim()}
                className="w-full"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Index Pages
              </Button>
            </CardContent>
          </Card>

          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Index Entire Spaces</CardTitle>
              <CardDescription>Index all pages from specific Confluence spaces</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Input placeholder="Enter space keys (comma-separated, e.g., 'DEV,PROD')" value={indexingSpaces} onChange={(e) => setIndexingSpaces(e.target.value)} />
              <div className="flex gap-2">
                <Button
                  onClick={() =>
                    performAction("index_confluence_spaces", {
                      spaces: indexingSpaces
                        .split(",")
                        .map((space) => space.trim())
                        .filter(Boolean)
                    })
                  }
                  disabled={loading || !indexingSpaces.trim()}
                  className="flex-1"
                >
                  {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Index Spaces
                </Button>
                <Button variant="outline" onClick={fetchStatus} disabled={loading}>
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Status Information */}
        {status && (
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>System Status</CardTitle>
              <CardDescription>Last updated: {new Date(status.timestamp).toLocaleString()}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">{status.vectorStoreReady ? "✅" : "❌"}</div>
                  <div className="text-sm text-gray-600">Vector Store</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">{status.confluenceConfigured ? "✅" : "❌"}</div>
                  <div className="text-sm text-gray-600">Confluence</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-600">{status.indexStats?.totalVectorCount || 0}</div>
                  <div className="text-sm text-gray-600">Total Vectors</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-orange-600">{Object.keys(status.indexStats?.namespaces || {}).length}</div>
                  <div className="text-sm text-gray-600">Namespaces</div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
