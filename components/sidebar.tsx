"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useState, useEffect } from "react"
import { cn } from "@/lib/utils"
import { Home, Users, Zap, Calendar, ChevronRight, Plus, Archive } from "lucide-react"
import { Button } from "@/components/ui/button"
import { AddClientDialog } from "@/components/add-client-dialog"
import { getClients, createClient } from "@/lib/database"

const navigation = [
  { name: "Dashboard", href: "/", icon: Home },
  { name: "Teams", href: "/teams", icon: Users },
  { name: "Expenses" , href: "/otherExpenses", icon: Zap },
  { name: "Timeline", href: "/timeline", icon: Calendar },
  { name: "Automations", href: "/automations", icon: Zap },
]

interface Client {
  id: string
  name: string
  status: string
  [key: string]: any
}

export function Sidebar() {
  const pathname = usePathname()
  const [showClientsDropdown, setShowClientsDropdown] = useState(false)
  const [showArchivedDropdown, setShowArchivedDropdown] = useState(false)
  const [showAddClientDialog, setShowAddClientDialog] = useState(false)
  const [allClients, setAllClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)

  // Separate active and archived clients
  const activeClients = allClients.filter(client => client.status !== 'archived')
  const archivedClients = allClients.filter(client => client.status === 'archived')

  useEffect(() => {
    loadClients()
  }, [])

  // Auto-expand clients dropdown if we're on a client page
  useEffect(() => {
    if (pathname.startsWith("/clients")) {
      setShowClientsDropdown(true)
    }
  }, [pathname])

  async function loadClients() {
    try {
      const data = await getClients()
      setAllClients(data)
    } catch (error) {
      console.error("Error loading clients:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleAddClient = async (clientData: any) => {
    try {
      const newClient = await createClient(clientData)
      setAllClients([newClient, ...allClients])
      setShowAddClientDialog(false)
    } catch (error) {
      console.error("Error adding client:", error)
    }
  }

  const isClientPageActive = pathname.startsWith("/clients")

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
                  isClientPageActive
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

              {/* Main Clients Dropdown */}
              <div
                className={cn(
                  "overflow-hidden transition-all duration-300 ease-in-out",
                  showClientsDropdown ? "max-h-[600px] opacity-100" : "max-h-0 opacity-0",
                )}
              >
                <div className="ml-6 mt-2 space-y-1">
                  {/* View All Clients Link */}
                  <Link
                    href="/clients"
                    className={cn(
                      "block px-3 py-2 text-sm transition-colors rounded-md",
                      pathname === "/clients"
                        ? "bg-gray-800 text-white"
                        : "text-gray-300 hover:bg-gray-900 hover:text-white",
                    )}
                  >
                    View All Clients
                  </Link>

                  {/* Add New Client Button */}
                  <Button
                    onClick={() => setShowAddClientDialog(true)}
                    className="w-full justify-start px-3 py-2 text-sm text-gray-300 hover:bg-gray-900 hover:text-white bg-transparent border-0 rounded-md h-auto"
                  >
                    <Plus className="mr-3 h-4 w-4" />
                    Add New Client
                  </Button>

                  {/* Divider */}
                  <div className="border-t border-gray-700 my-2"></div>

                  {/* Active Clients Section */}
                  <div className="text-xs text-gray-500 px-3 py-1 font-medium uppercase tracking-wider">
                    Active Clients ({activeClients.length})
                  </div>

                  {/* Active Client List */}
                  {loading ? (
                    <div className="space-y-2">
                      {[1, 2, 3].map((i) => (
                        <div key={i} className="px-3 py-2 animate-pulse">
                          <div className="h-4 bg-gray-700 rounded w-3/4"></div>
                        </div>
                      ))}
                    </div>
                  ) : activeClients.length > 0 ? (
                    <div className="space-y-1 max-h-48 overflow-y-auto">
                      {activeClients.map((client) => (
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
                      ))}
                    </div>
                  ) : (
                    <div className="px-3 py-2 text-sm text-gray-500 italic">
                      No active clients
                    </div>
                  )}

                  {/* Archived Clients Dropdown */}
                  {archivedClients.length > 0 && (
                    <>
                      <div className="border-t border-gray-700 my-2"></div>
                      
                      <div
                        className={cn(
                          "flex items-center justify-between px-3 py-2 text-sm transition-colors cursor-pointer rounded-md",
                          "text-gray-400 hover:bg-gray-900 hover:text-gray-300",
                        )}
                        onClick={() => setShowArchivedDropdown(!showArchivedDropdown)}
                      >
                        <div className="flex items-center">
                          <Archive className="mr-3 h-4 w-4" />
                          <span className="text-xs font-medium uppercase tracking-wider">
                            Archived ({archivedClients.length})
                          </span>
                        </div>
                        <ChevronRight
                          className={cn(
                            "h-3 w-3 transition-transform duration-200", 
                            showArchivedDropdown && "rotate-90"
                          )}
                        />
                      </div>

                      {/* Archived Clients List */}
                      <div
                        className={cn(
                          "overflow-hidden transition-all duration-300 ease-in-out",
                          showArchivedDropdown ? "max-h-48 opacity-100" : "max-h-0 opacity-0",
                        )}
                      >
                        <div className="ml-6 space-y-1 max-h-32 overflow-y-auto">
                          {archivedClients.map((client) => (
                            <Link
                              key={client.id}
                              href={`/clients/${client.id}`}
                              className={cn(
                                "block px-3 py-2 text-sm transition-colors rounded-md",
                                pathname === `/clients/${client.id}`
                                  ? "bg-gray-800 text-amber-400"
                                  : "text-gray-500 hover:bg-gray-900 hover:text-amber-300",
                              )}
                            >
                              <div className="flex items-center">
                                <Archive className="mr-2 h-3 w-3" />
                                {client.name}
                              </div>
                            </Link>
                          ))}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </li>
          </ul>
        </nav>
      </div>

      <AddClientDialog 
        open={showAddClientDialog} 
        onOpenChange={setShowAddClientDialog} 
        onAddClient={handleAddClient} 
      />
    </>
  )
}
