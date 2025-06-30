"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useState, useEffect } from "react"
import { cn } from "@/lib/utils"
import { Home, Users, Zap, Calendar, ChevronRight, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { AddClientDialog } from "@/components/add-client-dialog"
import { getClients, createClient } from "@/lib/database"

const navigation = [
  { name: "Dashboard", href: "/", icon: Home },
  { name: "Teams", href: "/teams", icon: Users },
  { name: "Timeline", href: "/timeline", icon: Calendar },
  { name: "Automations", href: "/automations", icon: Zap },
]

export function Sidebar() {
  const pathname = usePathname()
  const [showClientsDropdown, setShowClientsDropdown] = useState(false)
  const [showAddClientDialog, setShowAddClientDialog] = useState(false)
  const [clients, setClients] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadClients()
  }, [])

  async function loadClients() {
    try {
      const data = await getClients()
      setClients(data)
    } catch (error) {
      console.error("Error loading clients:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleAddClient = async (clientData: any) => {
    try {
      const newClient = await createClient(clientData)
      setClients([newClient, ...clients])
      setShowAddClientDialog(false)
    } catch (error) {
      console.error("Error adding client:", error)
    }
  }

  return (
    <>
      <div className="w-64 bg-black border-r border-gray-800">
        <div className="p-6">
          <h1 className="text-xl font-bold text-white">Janavi Sawadia</h1>
          <p className="text-sm text-gray-400 mt-1">Social Media Marketing</p>
        </div>

        <nav className="mt-6 px-3">
          <ul className="space-y-1">
            {navigation.map((item) => {
              const isActive = pathname === item.href
              return (
                <li key={item.name}>
                  <Link
                    href={item.href}
                    className={cn(
                      "flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors",
                      isActive ? "bg-gray-900 text-white" : "text-gray-300 hover:bg-gray-900 hover:text-white",
                    )}
                  >
                    <item.icon className="mr-3 h-5 w-5" />
                    {item.name}
                  </Link>
                </li>
              )
            })}

            {/* Clients Dropdown */}
            <li className="relative">
              <div
                className={cn(
                  "flex items-center justify-between px-3 py-2 text-sm font-medium rounded-md transition-colors cursor-pointer",
                  pathname.startsWith("/clients")
                    ? "bg-gray-900 text-white"
                    : "text-gray-300 hover:bg-gray-900 hover:text-white",
                )}
                onClick={() => setShowClientsDropdown(!showClientsDropdown)}
              >
                <div className="flex items-center">
                  <Users className="mr-3 h-5 w-5" />
                  Clients
                </div>
                <ChevronRight
                  className={cn("h-4 w-4 transition-transform duration-200", showClientsDropdown && "rotate-90")}
                />
              </div>

              {/* Smooth Dropdown */}
              <div
                className={cn(
                  "overflow-hidden transition-all duration-300 ease-in-out",
                  showClientsDropdown ? "max-h-96 opacity-100" : "max-h-0 opacity-0",
                )}
              >
                <div className="ml-6 mt-2 space-y-1">
                  {/* Add New Client Button */}
                  <Button
                    onClick={() => setShowAddClientDialog(true)}
                    className="w-full justify-start px-3 py-2 text-sm text-gray-300 hover:bg-gray-900 hover:text-white bg-transparent border-0 rounded-md h-auto"
                  >
                    <Plus className="mr-3 h-4 w-4" />
                    Add New Client
                  </Button>

                  {/* Client List */}
                  {loading ? (
                    <div className="space-y-2">
                      {[1, 2, 3].map((i) => (
                        <div key={i} className="px-3 py-2 animate-pulse">
                          <div className="h-4 bg-gray-700 rounded w-3/4"></div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    clients.map((client) => (
                      <Link
                        key={client.id}
                        href={`/clients/${client.id}`}
                        className={cn(
                          "block px-3 py-2 text-sm transition-colors rounded-md",
                          pathname === `/clients/${client.id}`
                            ? "bg-gray-800 text-white"
                            : "text-gray-300 hover:bg-gray-900 hover:text-white",
                        )}
                      >
                        {client.name}
                      </Link>
                    ))
                  )}
                </div>
              </div>
            </li>
          </ul>
        </nav>
      </div>

      <AddClientDialog open={showAddClientDialog} onOpenChange={setShowAddClientDialog} onAddClient={handleAddClient} />
    </>
  )
}
