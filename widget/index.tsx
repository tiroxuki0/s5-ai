import React from "react"
import { createRoot } from "react-dom/client"
import { ChatWidget } from "./components/ChatWidget"
import "./styles/widget.css"

// Widget initialization options
interface WidgetOptions {
  apiUrl?: string
  apiKey?: string
  theme?: "light" | "dark" | "auto"
  position?: "bottom-right" | "bottom-left"
  primaryColor?: string
}

// Global widget API
declare global {
  interface Window {
    S5ChatWidget: {
      init: (container: HTMLElement, options: WidgetOptions) => void
    }
  }
}

// Initialize the widget
function initWidget(container: HTMLElement, options: WidgetOptions) {
  console.log("S5.AI Chat Widget: React initWidget called with container:", container, "and options:", options)

  try {
    const root = createRoot(container)
    console.log("S5.AI Chat Widget: React root created")

    root.render(
      <React.StrictMode>
        <ChatWidget
          apiUrl={options.apiUrl}
          apiKey={options.apiKey}
          theme={options.theme as "light" | "dark" | "auto"}
          position={options.position as "bottom-right" | "bottom-left"}
          primaryColor={options.primaryColor}
        />
      </React.StrictMode>
    )
    console.log("S5.AI Chat Widget: React render called successfully")
  } catch (error) {
    console.error("S5.AI Chat Widget: Error during React initialization:", error)
  }
}

// Export the init function directly
export default initWidget

// Also expose it globally for the embed script
if (typeof window !== "undefined") {
  console.log("S5.AI Chat Widget: Setting window.S5ChatWidget =", initWidget)
  window.S5ChatWidget = initWidget
  console.log("S5.AI Chat Widget: window.S5ChatWidget is now set to", window.S5ChatWidget)
}
