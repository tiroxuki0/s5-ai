/**
 * S5 Assistant Chat Widget Embed Script
 * Version: 1.0.0
 *
 * This script loads and initializes the S5 Assistant chat widget on any website.
 * It handles cross-origin communication and provides a seamless chat experience.
 */

;(function () {
  "use strict"

  // Configuration - dynamically determine base URL
  var CONFIG = (function () {
    var scripts = document.getElementsByTagName("script")
    var currentScript = scripts[scripts.length - 1]
    var scriptSrc = currentScript.src
    var baseUrl = scriptSrc.substring(0, scriptSrc.lastIndexOf("/") + 1)

    return {
      scriptUrl: baseUrl + "widget/",
      apiUrl: "/api/widget/chat", // Relative to current domain
      cssUrl: baseUrl + "widget/widget.css"
    }
  })()

  // Utility functions
  function loadScript(src, callback) {
    var script = document.createElement("script")
    script.src = src
    script.onload = callback
    script.onerror = function () {
      console.error("Failed to load script:", src)
    }
    document.head.appendChild(script)
  }

  function loadCSS(href) {
    var link = document.createElement("link")
    link.rel = "stylesheet"
    link.href = href
    document.head.appendChild(link)
  }

  function createWidgetContainer(options) {
    var container = document.createElement("div")
    container.id = "s5-chat-widget-container"
    container.style.cssText = 'position: fixed; z-index: 9999; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;'
    document.body.appendChild(container)
    return container
  }

  function getOptionsFromScript(scriptElement) {
    var apiUrl = scriptElement.getAttribute("data-api-url")
    // If no custom API URL is set, use the default relative URL
    if (!apiUrl) {
      // For local development, use localhost, otherwise use relative path
      var isLocalhost = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
      apiUrl = isLocalhost ? "http://localhost:3000/api/widget/chat" : "/api/widget/chat"
    }

    return {
      apiUrl: apiUrl,
      apiKey: scriptElement.getAttribute("data-api-key") || "",
      theme: scriptElement.getAttribute("data-theme") || "auto",
      position: scriptElement.getAttribute("data-position") || "bottom-right",
      primaryColor: scriptElement.getAttribute("data-primary-color") || "#ff4d00"
    }
  }

  // Main initialization
  function initWidget() {
    // Find the script tag that loaded this script
    var scripts = document.getElementsByTagName("script")
    var currentScript = scripts[scripts.length - 1]
    var options = getOptionsFromScript(currentScript)

    // Check if widget is already initialized
    if (document.getElementById("s5-chat-widget-container")) {
      console.warn("S5 Assistant Chat Widget is already initialized")
      return
    }

    // Create container
    var container = createWidgetContainer(options)

    // Load CSS
    loadCSS(CONFIG.cssUrl)

    // Load React and dependencies
    loadScript("https://unpkg.com/react@18/umd/react.production.min.js", function () {
      loadScript("https://unpkg.com/react-dom@18/umd/react-dom.production.min.js", function () {
        // Load Lucide icons
        loadScript("https://unpkg.com/lucide@0.451.0/dist/umd/lucide.js", function () {
          // Load widget bundle (this will be generated during build)
          loadScript(CONFIG.scriptUrl + "widget.js", function () {
            // Initialize the widget
            if (window.S5ChatWidget && window.S5ChatWidget.init) {
              window.S5ChatWidget.init(container, options)
            } else {
              console.error("S5 Assistant Chat Widget failed to load properly")
            }
          })
        })
      })
    })
  }

  // Auto-initialize when DOM is ready
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initWidget)
  } else {
    initWidget()
  }

  // Expose global API for manual initialization
  window.S5ChatWidget = window.S5ChatWidget || {
    init: function (container, options) {
      // This will be overridden by the actual widget code
      console.log("S5 Assistant Chat Widget initializing with options:", options)
    }
  }
})()
