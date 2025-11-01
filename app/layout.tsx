import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { Sidebar } from "@/components/sidebar"
import { Header } from "@/components/header"
import { AutomaticTierUpdatesProvider } from "@/components/automatic-tier-updates-provider"
import ErrorSuppressor from "./error-suppressor"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Agency Manager",
  description: "Comprehensive social media marketing agency management system",
    generator: ''
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="">
      <body className={`${inter.className} bg-gray-50 text-gray-900`}>
        <ErrorSuppressor />
        <AutomaticTierUpdatesProvider>
          <div className="flex h-screen">
            <Sidebar />
            <div className="flex-1 flex flex-col overflow-hidden">
              <Header />
              <main className="flex-1 overflow-auto p-6 bg-gray-50">{children}</main>
            </div>
          </div>
        </AutomaticTierUpdatesProvider>
      </body>
    </html>
  )
}
