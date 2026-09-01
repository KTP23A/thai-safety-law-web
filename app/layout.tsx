import type { Metadata } from "next"
import "./globals.css"

export const metadata: Metadata = {
  title: "IIP26 Master Tracker",
  description: "Live dashboard for the KTP IIP26 Master Tracker 2026 Notion database",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
