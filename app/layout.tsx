import type { Metadata } from "next"
import "./globals.css"
import { Toaster } from "sonner"
import { redirect } from "next/navigation"

export const metadata: Metadata = {
  title: "S5 Assistant - AI-Powered Search",
  description: "Advanced search with AI-powered documentation and real-time information"
}

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode
}>) {
  // Check for maintenance mode
  if (process.env.MAINTENANCE_MODE === "true") {
    redirect("/maintenance")
  }

  return (
    <html lang="en">
      <body className="font-sans antialiased">
        {children}
        <Toaster position="bottom-right" />
      </body>
    </html>
  )
}
