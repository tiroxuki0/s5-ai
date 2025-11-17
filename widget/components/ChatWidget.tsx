"use client"

import React, { useRef, useEffect, useState, useMemo, useCallback, Component, ReactNode } from "react"
import { Streamdown } from "streamdown"
import { Button } from "./ui/button"
import { Textarea } from "./ui/textarea"

// SVG Icons defined inline to avoid extra dependencies
const MessageCircleIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
  </svg>
)

const XIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
)

const MinimizeIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="4,14 10,14 10,20" />
    <polyline points="20,10 14,10 14,4" />
    <line x1="14" y1="10" x2="21" y2="3" />
    <line x1="3" y1="21" x2="10" y2="14" />
  </svg>
)

const MaximizeIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="15,3 21,3 21,9" />
    <polyline points="9,21 3,21 3,15" />
    <line x1="21" y1="3" x2="14" y2="10" />
    <line x1="3" y1="21" x2="10" y2="14" />
  </svg>
)

const LoaderIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="s5-widget-spin">
    <line x1="12" y1="2" x2="12" y2="6" />
    <line x1="12" y1="18" x2="12" y2="22" />
    <line x1="4.93" y1="4.93" x2="7.76" y2="7.76" />
    <line x1="16.24" y1="16.24" x2="19.07" y2="19.07" />
    <line x1="2" y1="12" x2="6" y2="12" />
    <line x1="18" y1="12" x2="22" y2="12" />
    <line x1="4.93" y1="19.07" x2="7.76" y2="16.24" />
    <line x1="16.24" y1="7.76" x2="19.07" y2="4.93" />
  </svg>
)

const SendIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="22" y1="2" x2="11" y2="13" />
    <polygon points="22,2 15,22 11,13 2,9" />
  </svg>
)

const SparklesIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M11.017 2.814a1 1 0 0 1 1.966 0l1.051 5.558a2 2 0 0 0 1.594 1.594l5.558 1.051a1 1 0 0 1 0 1.966l-5.558 1.051a2 2 0 0 0-1.594 1.594l-1.051 5.558a1 1 0 0 1-1.966 0l-1.051-5.558a2 2 0 0 0-1.594-1.594l-5.558-1.051a1 1 0 0 1 0-1.966l5.558-1.051a2 2 0 0 0 1.594-1.594z"/>
  </svg>
)

const FileTextIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
    <path d="M14 2H6a2 2 0 0 0-2 2v16c0 1.1.9 2 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
    <line x1="8" x2="16" y1="13" y2="13" />
    <line x1="8" x2="16" y1="17" y2="17" />
  </svg>
)

const CopyIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
    <rect x="9" y="9" width="13" height="13" rx="2" />
    <path d="M5 15H4a2 2 0 0 1-2-2V4c0-1.1.9-2 2-2h9a2 2 0 0 1 2 2v1" />
  </svg>
)

const CheckIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M20 6L9 17l-5-5" />
  </svg>
)

const RefreshIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
    <polyline points="23 4 23 10 17 10" />
    <polyline points="1 20 1 14 7 14" />
    <path d="M3.51 9A9 9 0 0 1 17.5 3.5L23 10M1 14l5.5 6.5A9 9 0 0 0 20.49 15" />
  </svg>
)

const PlusIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="12" y1="5" x2="12" y2="19" />
    <line x1="5" y1="12" x2="19" y2="12" />
  </svg>
)

const ImageIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
    <rect x="3" y="3" width="18" height="18" rx="2" />
    <circle cx="8.5" cy="8.5" r="1.5" />
    <path d="M21 15l-4-4-4.5 4.5-2-2L3 21" />
  </svg>
)

const NewsIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
    <path d="M4 19a2 2 0 0 1-2-2V5h2" />
    <path d="M22 5h-8a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h8" />
    <path d="M22 19a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2" />
    <path d="M14 7h6" />
    <path d="M14 11h6" />
    <path d="M14 15h6" />
  </svg>
)

const StreamdownComponent = Streamdown as unknown as React.ComponentType<any>

interface ErrorBoundaryState {
  hasError: boolean
  error?: Error
}

interface ErrorBoundaryProps {
  children: ReactNode
  fallback?: ReactNode
}

class ChatWidgetErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error("ChatWidget Error Boundary caught an error:", error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="s5-widget s5-widget-floating s5-position-bottom-right">
          <div className="s5-widget-chat s5-widget-expanded">
            <div className="s5-widget-header" style={{ backgroundColor: "#ff4d00" }}>
              <div className="s5-widget-header-content">
                <div className="s5-widget-header-title">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
                  </svg>
                  <span>S5 Assistant - Error</span>
                </div>
                <button onClick={() => window.location.reload()} className="s5-widget-header-button">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="23 4 23 10 17 10" />
                    <polyline points="1 20 1 14 7 14" />
                    <path d="M3.51 9A9 9 0 0 1 17.5 3.5L23 10M1 14l5.5 6.5A9 9 0 0 0 20.49 15" />
                  </svg>
                </button>
              </div>
            </div>
            <div className="s5-widget-content">
              <div className="s5-widget-welcome-card">
                <p>Sorry, there was an error loading the chat. The page will reload.</p>
                <p>Error: {this.state.error?.message}</p>
                <button
                  onClick={() => window.location.reload()}
                  style={{
                    backgroundColor: "#ff4d00",
                    color: "white",
                    border: "none",
                    padding: "8px 16px",
                    borderRadius: "4px",
                    cursor: "pointer",
                    marginTop: "10px"
                  }}
                >
                  Reload Page
                </button>
              </div>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

interface SearchResult {
  url: string
  title: string
  description?: string
  content?: string
  publishedDate?: string
  author?: string
  markdown?: string
  image?: string
  favicon?: string
  siteName?: string
}

interface NewsResult {
  url: string
  title: string
  description?: string
  publishedDate?: string
  date?: string
  source?: string
  image?: string
}

interface ImageResult {
  url: string
  title?: string
  thumbnail?: string
  source?: string
}

interface MessageMetadata {
  sources: SearchResult[]
  newsResults: NewsResult[]
  imageResults: ImageResult[]
  followUpQuestions: string[]
  ticker?: string | null
}

interface Message {
  id: string
  role: "user" | "assistant"
  content: string
  timestamp: Date
  metadata?: MessageMetadata
}

interface ChatWidgetProps {
  apiUrl?: string
  apiKey?: string
  theme?: "light" | "dark" | "auto"
  position?: "bottom-right" | "bottom-left"
  primaryColor?: string
}

interface WidgetMarkdownProps {
  content: string
  sources?: SearchResult[]
  apiUrl?: string
}

const normalizeMetadata = (data?: Partial<MessageMetadata>): MessageMetadata => ({
  sources: data?.sources ?? [],
  newsResults: data?.newsResults ?? [],
  imageResults: data?.imageResults ?? [],
  followUpQuestions: data?.followUpQuestions ?? [],
  ticker: data?.ticker ?? null
})

const getDomainFromUrl = (url?: string, fallback?: string) => {
  if (fallback) return fallback
  if (!url) return ""
  try {
    const parsed = new URL(url)
    return parsed.hostname.replace(/^www\./, "")
  } catch {
    return url
  }
}

const WidgetMarkdown = ({ content, sources, apiUrl }: WidgetMarkdownProps) => {
  // Simple markdown renderer that handles basic formatting, images, and citations
  const renderSimpleMarkdown = (text: string) => {
    // First, convert CITATION_1 to [1] like the markdown-renderer does
    let processedText = text
      .replace(/\bCITATION_(\d+)\b/g, "___CITATION_$1___")
      .replace(/___CITATION_(\d+)___/g, "[$1]")

    // Handle markdown image syntax ![alt](url) FIRST - before processing plain URLs
    processedText = processedText.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (match, alt, url) => {
      // Process Confluence URLs in image syntax too
      let processedUrl = url
      if (url.includes('s5philippines.atlassian.net/wiki/download/attachments/')) {
        const match = url.match(/\/download\/attachments\/(\d+)\/([^?\s]+)/)
        if (match) {
          const pageId = match[1]
          const filename = match[2]
          // Use the API URL to construct the proxy path
          let baseUrl = ''
          if (apiUrl) {
            if (apiUrl.startsWith('http')) {
              // Full URL - extract base URL
              baseUrl = apiUrl.replace('/api/widget/chat', '')
            } else {
              // Relative path - use current origin
              baseUrl = typeof window !== 'undefined' ? window.location.origin : ''
            }
          }
          processedUrl = `${baseUrl}/api/images/${pageId}/${encodeURIComponent(filename)}`
        }
      }
      return `<img src="${processedUrl}" alt="${alt || 'Image'}" class="s5-widget-image" />`
    })

    // Process Confluence image URLs in plain text (not in markdown syntax)
    processedText = processedText.replace(
      /(?<!\]\()https:\/\/s5philippines\.atlassian\.net\/wiki\/download\/attachments\/(\d+)\/([^?\s]+)/g,
      (match, pageId, filename) => {
        // Use the API URL to construct the proxy path
        let baseUrl = ''
        if (apiUrl) {
          if (apiUrl.startsWith('http')) {
            // Full URL - extract base URL
            baseUrl = apiUrl.replace('/api/widget/chat', '')
          } else {
            // Relative path - use current origin
            baseUrl = typeof window !== 'undefined' ? window.location.origin : ''
          }
        }
        const proxyUrl = `${baseUrl}/api/images/${pageId}/${encodeURIComponent(filename)}`
        return `<img src="${proxyUrl}" alt="${filename}" class="s5-widget-image" />`
      }
    )

    // Handle markdown links [text](url) - make them clickable links
    processedText = processedText.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (match, text, url) => {
      // Skip if this is a citation (just numbers in brackets)
      if (/^\d+$/.test(text)) {
        return match // Leave citations for the next regex to handle
      }
      return `<a href="${url}" target="_blank" rel="noopener noreferrer" class="s5-widget-link">${text}</a>`
    })

    // Handle citations [1], [2], etc. - make them clickable links
    processedText = processedText.replace(/\[(\d+)\]/g, (match, citationNumber) => {
      const sourceIndex = parseInt(citationNumber) - 1
      const source = sources?.[sourceIndex]

      if (source?.url) {
        return `<sup><a href="${source.url}" target="_blank" rel="noopener noreferrer" class="s5-widget-citation-link s5-widget-citation">[${citationNumber}]</a></sup>`
      } else {
        return `<sup class="s5-widget-citation">[${citationNumber}]</sup>`
      }
    })

    // Handle basic markdown patterns
    return processedText
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') // Bold
      .replace(/\*(.*?)\*/g, '<em>$1</em>') // Italic
      .replace(/`(.*?)`/g, '<code class="s5-widget-inline-code">$1</code>') // Inline code
      .replace(/\n/g, '<br>') // Line breaks
  }

  return (
    <div className="s5-widget-markdown">
      <div
        className="s5-widget-markdown-content"
        dangerouslySetInnerHTML={{ __html: renderSimpleMarkdown(content) }}
      />
    </div>
  )
}

function ChatWidgetInternal({ apiUrl = "/api/widget/chat", apiKey, theme = "auto", position = "bottom-right", primaryColor = "#ff4d00" }: ChatWidgetProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isMinimized, setIsMinimized] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null)
  const [searchStatus, setSearchStatus] = useState("")
  const [currentTheme, setCurrentTheme] = useState<"light" | "dark">("light")
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const formRef = useRef<HTMLFormElement>(null)
  const submitForm = useCallback(() => {
    const form = formRef.current
    if (!form) return
    if (typeof form.requestSubmit === "function") {
      form.requestSubmit()
      return
    }

    const event = new Event("submit", { bubbles: true, cancelable: true })
    form.dispatchEvent(event)
  }, [])

  useEffect(() => {
    if (!scrollContainerRef.current) return
    const container = scrollContainerRef.current
    container.scrollTo({
      top: container.scrollHeight,
      behavior: "smooth"
    })
  }, [messages, searchStatus, isLoading])

  const historyPairs = useMemo(() => {
    if (messages.length <= 2) return []
    const pairs: Array<{ user: Message | undefined; assistant: Message | undefined; key: number }> = []
    for (let i = 0; i < messages.length - 2; i += 2) {
      const userMessage = messages[i]
      const assistantMessage = messages[i + 1]
      if (!assistantMessage || assistantMessage.role !== "assistant") continue
      pairs.push({ user: userMessage, assistant: assistantMessage, key: i })
    }
    return pairs
  }, [messages])

  const sendMessage = async (message: string) => {
    if (!message.trim() || isLoading) return

    const userMessage: Message = {
      id: `${Date.now()}-user`,
      role: "user",
      content: message,
      timestamp: new Date()
    }

    // Update state synchronously
    const updatedMessages = [...messages, userMessage]
    setMessages(updatedMessages)
    setInput("")
    setIsLoading(true)
    setSearchStatus("Thinking...")

    try {
      const response = await fetch(apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          messages: updatedMessages.map((m) => ({
            role: m.role,
            content: m.content
          })),
          ...(apiKey && { braveApiKey: apiKey })
        })
      })

      if (!response.ok) {
        throw new Error(`API request failed: ${response.status}`)
      }

      const data = await response.json()
      

      const metadata = normalizeMetadata({
        sources: data.sources,
        newsResults: data.newsResults,
        imageResults: data.imageResults,
        followUpQuestions: data.followUpQuestions,
        ticker: data.ticker
      })


      const assistantMessage: Message = {
        id: `${Date.now()}-assistant`,
        role: "assistant",
        content: data.content || "I couldn't find an answer for that, please try a different question.",
        timestamp: new Date(),
        metadata
      }


      // Ensure state updates happen in correct order
      setMessages((prev) => {
        // Double-check we don't add duplicate messages
        const lastMessage = prev[prev.length - 1]
        if (lastMessage?.role === "assistant" && lastMessage.timestamp.getTime() > Date.now() - 1000) {
          // Possible duplicate within last second, skip
          return prev
        }
        return [...prev, assistantMessage]
      })
      setSearchStatus(data.status || "")
    } catch (error) {
      console.error("Chat API error:", error)
      const errorMessage: Message = {
        id: `${Date.now()}-error`,
        role: "assistant",
        content: "Sorry, I couldn't connect to the server. Please try again later.",
        timestamp: new Date(),
        metadata: normalizeMetadata()
      }
      setMessages((prev) => {
        // Avoid adding error message if we already have a response
        const lastMessage = prev[prev.length - 1]
        if (lastMessage?.role === "assistant") {
          return prev
        }
        return [...prev, errorMessage]
      })
      setSearchStatus("")
    } finally {
      setIsLoading(false)
    }
  }

  const handleFormSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!input.trim() || isLoading) return
    sendMessage(input)
  }

  const handleFollowUpClick = (question: string) => {
    setInput(question)
    setTimeout(() => {
      submitForm()
    }, 60)
  }

  const handleCopy = (content: string, messageId: string) => {
    if (typeof navigator === "undefined" || !navigator.clipboard) return
    navigator.clipboard.writeText(content).then(() => {
      setCopiedMessageId(messageId)
      setTimeout(() => setCopiedMessageId(null), 2000)
    })
  }

  const handleRewrite = () => {
    const lastUserMessage = [...messages].reverse().find((message) => message.role === "user")
    if (!lastUserMessage) return
    setInput(lastUserMessage.content)
    setTimeout(() => {
      submitForm()
    }, 80)
  }

  const toggleChat = () => {
    setIsOpen((prev) => !prev)
    if (!isOpen) {
      setIsMinimized(false)
    }
  }

  const toggleMinimize = () => {
    setIsMinimized((prev) => !prev)
  }

  const positionClasses = {
    "bottom-right": "s5-position-bottom-right",
    "bottom-left": "s5-position-bottom-left"
  }

  // Calculate derived values - memoize to prevent re-calculations
  const derivedState = useMemo(() => {
    let currentQuery = ""
    let isWaitingForResponse = false
    if (messages.length > 0) {
      const lastMessage = messages[messages.length - 1]
      const previousMessage = messages[messages.length - 2]
      if (lastMessage?.role === "user") {
        currentQuery = lastMessage.content
        isWaitingForResponse = true
      } else if (previousMessage?.role === "user" && lastMessage?.role === "assistant") {
        currentQuery = previousMessage.content
      }
    }
    return { currentQuery, isWaitingForResponse }
  }, [messages])

  const { currentQuery, isWaitingForResponse } = derivedState

  const latestAssistantMessage = useMemo(() => {
    return [...messages].reverse().find((message) => message.role === "assistant")
  }, [messages])

  // Memoize derived values to prevent unnecessary re-calculations
  const currentSources = useMemo(() => latestAssistantMessage?.metadata?.sources ?? [], [latestAssistantMessage])
  const currentImages = useMemo(() => latestAssistantMessage?.metadata?.imageResults ?? [], [latestAssistantMessage])
  const currentNews = useMemo(() => latestAssistantMessage?.metadata?.newsResults ?? [], [latestAssistantMessage])
  const currentFollowUps = useMemo(() => latestAssistantMessage?.metadata?.followUpQuestions ?? [], [latestAssistantMessage])
  const currentTicker = useMemo(() => latestAssistantMessage?.metadata?.ticker ?? null, [latestAssistantMessage])
  const currentAnswer = useMemo(() => latestAssistantMessage?.content ?? "", [latestAssistantMessage])
  
  const statusText = searchStatus || (isLoading && isWaitingForResponse ? "Gathering information..." : "")

  // Theme detection and application
  useEffect(() => {
    if (theme === "auto") {
      const isDark = window.matchMedia("(prefers-color-scheme: dark)").matches
      setCurrentTheme(isDark ? "dark" : "light")
    } else {
      setCurrentTheme(theme)
    }
  }, [theme])

  if (!isOpen) {
    return (
      <div className={`s5-widget s5-widget-floating s5-theme-${currentTheme} ${positionClasses[position]}`}>
        <button onClick={toggleChat} className="s5-widget-button s5-widget-floating-button" style={{ backgroundColor: primaryColor }}>
          <MessageCircleIcon />
        </button>
      </div>
    )
  }

  return (
    <div className={`s5-widget s5-widget-floating s5-theme-${currentTheme} ${positionClasses[position]}`}>
      <div className={`s5-widget-chat ${isMinimized ? "s5-widget-minimized" : "s5-widget-expanded"}`}>
        <div className="s5-widget-header" style={{ backgroundColor: primaryColor }}>
          <div className="s5-widget-header-content">
            <div className="s5-widget-header-title">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" className="lucide lucide-sparkle-icon lucide-sparkle">
                <path d="M11.017 2.814a1 1 0 0 1 1.966 0l1.051 5.558a2 2 0 0 0 1.594 1.594l5.558 1.051a1 1 0 0 1 0 1.966l-5.558 1.051a2 2 0 0 0-1.594 1.594l-1.051 5.558a1 1 0 0 1-1.966 0l-1.051-5.558a2 2 0 0 0-1.594-1.594l-5.558-1.051a1 1 0 0 1 0-1.966l5.558-1.051a2 2 0 0 0 1.594-1.594z"/>
              </svg>
              <span>S5 Assistant</span>
            </div>
            <div className="s5-widget-header-actions">
              <button onClick={toggleMinimize} className="s5-widget-header-button">
                {isMinimized ? <MaximizeIcon /> : <MinimizeIcon />}
              </button>
              <button onClick={() => setIsOpen(false)} className="s5-widget-header-button">
                <XIcon />
              </button>
            </div>
          </div>
        </div>

        {!isMinimized && (
          <>
            <div className="s5-widget-content">
              <div className="s5-widget-scroll" ref={scrollContainerRef}>
                {messages.length === 0 && (
                  <div className="s5-widget-welcome-card">
                    <div className="s5-widget-welcome-icon">
                      <MessageCircleIcon />
                    </div>
                    <p>Hi! I can search the web, summarize docs, and suggest next steps. Ask anything.</p>
                  </div>
                )}

                {historyPairs.map((pair, idx) => (
                  <div key={`history-${pair.key}`} className="s5-widget-history-block">
                    {pair.user && <h3 className="s5-widget-history-question">{pair.user.content}</h3>}
                    {pair.assistant && (
                      <>
                        <WidgetMarkdown content={pair.assistant.content} sources={pair.assistant.metadata?.sources} apiUrl={apiUrl} />
                        {pair.assistant.metadata?.sources?.length ? (
                          <div className="s5-widget-section inner">
                            <div className="s5-widget-section-header">
                              <FileTextIcon />
                              <span>Sources</span>
                            </div>
                            <div className="s5-widget-sources-grid">
                              {pair.assistant.metadata.sources.map((source, sourceIndex) => (
                                <a
                                  key={`${source.url}-${sourceIndex}`}
                                  href={source.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="s5-widget-source-card"
                                >
                                  <div className="s5-widget-source-meta">
                                    <span>{getDomainFromUrl(source.url, source.siteName)}</span>
                                  </div>
                                  <p className='s5-widget-source-meta-title'>{source.title}</p>
                                </a>
                              ))}
                            </div>
                          </div>
                        ) : null}

                        {pair.assistant.metadata?.followUpQuestions?.length ? (
                          <div className="s5-widget-followups">
                            {pair.assistant.metadata.followUpQuestions.map((question, questionIndex) => (
                              <button key={`followup-${pair.key}-${questionIndex}`} className="s5-widget-followup" onClick={() => handleFollowUpClick(question)}>
                                <PlusIcon />
                                <span>{question}</span>
                              </button>
                            ))}
                          </div>
                        ) : null}
                      </>
                    )}
                  </div>
                ))}

                {currentQuery && (
                  <div className="s5-widget-query-heading">
                    <h2>{currentQuery}</h2>
                  </div>
                )}

                {statusText && (
                  <div className="s5-widget-status">
                    <LoaderIcon />
                    <span>{statusText}</span>
                  </div>
                )}

                {!isWaitingForResponse && currentSources.length > 0 && (
                  <div className="s5-widget-section">
                    <div className="s5-widget-section-header">
                      <FileTextIcon />
                      <span>Sources</span>
                    </div>
                    <div className="s5-widget-sources-grid">
                      {currentSources.map((source, index) => (
                        <a key={`${source.url}-${index}`} href={source.url} target="_blank" rel="noopener noreferrer" className="s5-widget-source-card">
                          <div className="s5-widget-source-meta">
                            <span>{getDomainFromUrl(source.url, source.siteName)}</span>
                          </div>
                          <p className='s5-widget-source-meta-title'>{source.title}</p>
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                {!isWaitingForResponse && currentImages.length > 0 && (
                  <div className="s5-widget-section">
                    <div className="s5-widget-section-header">
                      <ImageIcon />
                      <span>Images</span>
                    </div>
                    <div className="s5-widget-images-grid">
                      {currentImages?.slice(0, 10).map((image, index) => (
                        <a
                          key={`${image.url}-${index}`}
                          href={image.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="s5-widget-image-card"
                        >
                          {/* Background image */}
                          <div className="s5-widget-image-bg">
                            <img
                              src={image.thumbnail || image.url}
                              alt={image.title || `Image ${index + 1}`}
                              className="s5-widget-image-img"
                              onError={(e) => {
                                const target = e.target as HTMLImageElement
                                target.style.display = "none"
                              }}
                            />
                          </div>
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                {!isWaitingForResponse && currentNews.length > 0 && (
                  <div className="s5-widget-section">
                    <div className="s5-widget-section-header">
                      <NewsIcon />
                      <span>News</span>
                    </div>
                    <div className="s5-widget-news-list">
                      {currentNews.slice(0, 3).map((news, index) => (
                        <a key={`${news.url}-${index}`} href={news.url} target="_blank" rel="noopener noreferrer" className="s5-widget-news-item">
                          <div>
                            <p>{news.title}</p>
                            <span>{getDomainFromUrl(news.url, news.source)}</span>
                          </div>
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                {!isWaitingForResponse && currentTicker && (
                  <div className="s5-widget-ticker-badge">Ticker: {currentTicker}</div>
                )}

                {!isWaitingForResponse && currentAnswer && (
                  <div className="s5-widget-answer">
                    <div className="s5-widget-answer-header">
                      <div className="s5-widget-section-header">
                        <SparklesIcon />
                        <span>Answer</span>
                      </div>
                      {!isLoading && (
                        <div className="s5-widget-answer-actions">
                          <button className="s5-widget-icon-button" onClick={() => handleCopy(currentAnswer, "current")}>
                            {copiedMessageId === "current" ? <CheckIcon /> : <CopyIcon />}
                          </button>
                          <button className="s5-widget-icon-button" onClick={handleRewrite}>
                            <RefreshIcon />
                          </button>
                        </div>
                      )}
                    </div>
                    <WidgetMarkdown content={currentAnswer} sources={currentSources} apiUrl={apiUrl} />
                  </div>
                )}

                {(isWaitingForResponse || (isLoading && !currentAnswer)) && (
                  <div className="s5-widget-loading-dots">
                    <span className="s5-bounce" />
                    <span className="s5-bounce" />
                    <span className="s5-bounce" />
                  </div>
                )}

                {!isWaitingForResponse && currentFollowUps.length > 0 && (
                  <div className="s5-widget-section">
                    <div className="s5-widget-section-header">
                      <SparklesIcon />
                      <span>Related</span>
                    </div>
                    <div className="s5-widget-followups">
                      {currentFollowUps.map((question, index) => (
                        <button key={`current-followup-${index}`} className="s5-widget-followup" onClick={() => handleFollowUpClick(question)}>
                          <PlusIcon />
                          <span>{question}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>
            </div>

            <div className="s5-widget-input-area">
              <form onSubmit={handleFormSubmit} ref={formRef}>
                <div className="s5-widget-input-container">
                  <Textarea
                    value={input}
                    onChange={(event) => setInput(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" && !event.shiftKey) {
                        event.preventDefault()
                        submitForm()
                      }
                    }}
                    placeholder="Ask a follow-up question..."
                    className="s5-widget-input"
                    rows={1}
                    style={{
                      minHeight: "40px",
                      maxHeight: "100px"
                    }}
                  />
                  <Button type="submit" disabled={!input.trim() || isLoading} className="s5-widget-send-button" style={{ backgroundColor: primaryColor }}>
                    {isLoading ? <LoaderIcon /> : <SendIcon />}
                  </Button>
                </div>
              </form>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export function ChatWidget({ apiUrl, apiKey, theme, position, primaryColor }: ChatWidgetProps) {
  return (
    <ChatWidgetErrorBoundary>
      <ChatWidgetInternal
        apiUrl={apiUrl}
        apiKey={apiKey}
        theme={theme}
        position={position}
        primaryColor={primaryColor}
      />
    </ChatWidgetErrorBoundary>
  )
}
