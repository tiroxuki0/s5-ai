"use client"

import React, { useRef, useEffect, useState } from "react"
import { Button } from "./ui/button"
import { Textarea } from "./ui/textarea"

// SVG Icons as components to avoid lucide-react conflicts
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
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
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

interface Message {
  id: string
  role: "user" | "assistant"
  content: string
  timestamp: Date
}

interface ChatWidgetProps {
  apiUrl?: string
  apiKey?: string
  theme?: "light" | "dark" | "auto"
  position?: "bottom-right" | "bottom-left"
  primaryColor?: string
}

export function ChatWidget({ apiUrl = "/api/widget/chat", apiKey, theme = "auto", position = "bottom-right", primaryColor = "#ff4d00" }: ChatWidgetProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isMinimized, setIsMinimized] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [currentImages, setCurrentImages] = useState<any[]>([])
  const [currentSources, setCurrentSources] = useState<any[]>([])
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const formRef = useRef<HTMLFormElement>(null)

  // Theme detection
  const [currentTheme, setCurrentTheme] = useState<"light" | "dark">("light")
  useEffect(() => {
    if (theme === "auto") {
      const isDark = window.matchMedia("(prefers-color-scheme: dark)").matches
      setCurrentTheme(isDark ? "dark" : "light")
    } else {
      setCurrentTheme(theme)
    }
  }, [theme])

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  const sendMessage = async (message: string) => {
    if (!message.trim()) return

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: message,
      timestamp: new Date()
    }

    setMessages((prev) => [...prev, userMessage])
    setInput("")
    setIsLoading(true)

    try {
      const response = await fetch(apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          messages: [...messages, userMessage].map((m) => ({
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

      // Handle streaming response format (similar to main app)
      let assistantContent = ""

      if (data.content) {
        assistantContent = data.content
      } else if (data.parts) {
        // Handle streaming parts format
        assistantContent = data.parts
          .filter((part: any) => part.type === "text")
          .map((part: any) => part.text)
          .join("")
      }

      // Extract images and sources from response
      const images = data.imageResults || []
      const sources = data.sources || []

      setCurrentImages(images)
      setCurrentSources(sources)

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: assistantContent || "I apologize, but I encountered an error processing your request.",
        timestamp: new Date()
      }

      setMessages((prev) => [...prev, assistantMessage])
    } catch (error) {
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: "Sorry, I couldn't connect to the server. Please try again later.",
        timestamp: new Date()
      }
      setMessages((prev) => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    sendMessage(input)
  }

  const toggleChat = () => {
    setIsOpen(!isOpen)
    if (!isOpen) {
      setIsMinimized(false)
    }
  }

  const toggleMinimize = () => {
    setIsMinimized(!isMinimized)
  }

  const positionClasses = {
    "bottom-right": "s5-position-bottom-right",
    "bottom-left": "s5-position-bottom-left"
  }

  if (!isOpen) {
    return (
      <div className={`s5-widget s5-widget-floating ${positionClasses[position]}`}>
        <button onClick={toggleChat} className="s5-widget-button s5-widget-floating-button" style={{ backgroundColor: primaryColor }}>
          <MessageCircleIcon />
        </button>
      </div>
    )
  }

  return (
    <div className={`s5-widget s5-widget-floating ${positionClasses[position]}`}>
      <div className={`s5-widget-chat ${isMinimized ? "s5-widget-minimized" : "s5-widget-expanded"}`}>
        {/* Header */}
        <div className="s5-widget-header" style={{ backgroundColor: primaryColor }}>
          <div className="s5-widget-header-content">
            <div className="s5-widget-header-title">
              <MessageCircleIcon />
              <span>S5.AI Chat</span>
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

        {/* Messages */}
        {!isMinimized && (
          <div className="s5-widget-messages">
            {messages.length === 0 && (
              <div className="s5-widget-welcome">
                <div className="s5-widget-welcome-icon">
                  <MessageCircleIcon />
                </div>
                <p>Hi! I'm your AI assistant. How can I help you today?</p>
              </div>
            )}

            {messages.map((message) => (
              <div key={message.id} className={`s5-widget-message ${message.role === "user" ? "s5-widget-message-user" : "s5-widget-message-assistant"}`}>
                <div className={`s5-widget-message-bubble ${message.role === "user" ? "s5-widget-message-bubble-user" : "s5-widget-message-bubble-assistant"}`}>{message.content}</div>
              </div>
            ))}

            {/* Display images if available */}
            {currentImages.length > 0 && (
              <div className="s5-widget-images">
                {currentImages.map((image, index) => (
                  <div key={index} className="s5-widget-image-item">
                    <img
                      src={image.url}
                      alt={image.title || `Image ${index + 1}`}
                      className="s5-widget-image"
                      onError={(e) => {
                        e.currentTarget.style.display = "none"
                      }}
                    />
                    {image.title && <div className="s5-widget-image-title">{image.title}</div>}
                  </div>
                ))}
              </div>
            )}

            {isLoading && (
              <div className="s5-widget-message s5-widget-message-assistant">
                <div className="s5-widget-message-bubble s5-widget-message-bubble-assistant">
                  <div className="s5-widget-loading">
                    <LoaderIcon />
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        )}

        {/* Input */}
        {!isMinimized && (
          <div className="s5-widget-input-area">
            <form onSubmit={handleSubmit} ref={formRef}>
              <div className="s5-widget-input-container">
                <Textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault()
                      formRef.current?.requestSubmit()
                    }
                  }}
                  placeholder="Type your message..."
                  className="s5-widget-input"
                  rows={1}
                  style={{
                    minHeight: "36px",
                    maxHeight: "80px"
                  }}
                />
                <Button type="submit" disabled={!input.trim() || isLoading} className="s5-widget-send-button" style={{ backgroundColor: primaryColor }}>
                  {isLoading ? <LoaderIcon /> : <SendIcon />}
                </Button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  )
}
