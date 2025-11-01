"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useState, useEffect } from "react"
import { cn } from "@/lib/utils"
import { Home, Users, Zap, Calendar, ChevronRight, Plus, Archive, FileText, Settings, CreditCard, BarChart3 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { AddClientDialog } from "@/components/add-client-dialog"
import { getClients, createClient } from "@/lib/database"

const navigation = [
  { name: "Dashboard", href: "/", icon: Home },
  { name: "Teams", href: "/teams", icon: Users },
  { name: "Billing", href: "/billing", icon: CreditCard },
  { name: "Expenses" , href: "/otherExpenses", icon: Zap },
  { name: "Timeline", href: "/timeline", icon: Calendar },
  { name: "Notes", href: "/notes", icon: FileText },
  { name: "Settings", href: "/settings", icon: Settings },
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
      <div className="w-64 bg-gray-50 shadow-sm">
        <div className="p-6">
          <div className="flex items-center">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center mr-3">
              <span className="text-white font-bold text-sm">J</span>
            </div>
            <div>
              <h1 className="text-lg font-semibold text-gray-900">Janavi Dashboard</h1>
            </div>
          </div>
          <hr className="mt-4 border-gray-200" />
        </div>

        <nav className="mt-2 px-3">
          <ul className="space-y-1">
            {navigation.map((item) => {
              const isActive = pathname === item.href
              return (
                <li key={item.name}>
                  <Link
                    href={item.href}
                    className={cn(
                      "flex items-center px-2 py-1 text-sm font-medium rounded-lg transition-all duration-200 group relative m-2",
                      isActive 
                        ? " text-blue-700 shadow-sm border-l-4 border-blue-600 bg-white" 
                        : "text-gray-600 hover:bg-gray-50 hover:text-gray-900",
                    )}
                  >
                    <span className={cn(
                      "inline-flex items-center justify-center w-8 h-8 rounded-lg mr-3 transition-colors",
                      isActive ? "bg-blue-600 text-white" : "bg-white text-gray-400 group-hover:bg-gray-200 shadow-md"
                    )}>
                      <item.icon className="h-4 w-4" />
                    </span>
                    <span className="font-medium">{item.name}</span>
                  </Link>
                </li>
              )
            })}

            {/* Clients Dropdown */}
            <li className="relative">
              <div
                className={cn(
                  "flex items-center justify-between px-4 py-3 text-sm font-medium rounded-lg transition-all duration-200 cursor-pointer group",
                  isClientPageActive
                    ? "bg-blue-50 text-blue-700 shadow-sm border-l-4 border-blue-600"
                    : "text-gray-600 hover:bg-gray-50 hover:text-gray-900",
                )}
                onClick={() => setShowClientsDropdown(!showClientsDropdown)}
              >
                <div className="flex items-center">
                  <span className={cn(
                    "inline-flex items-center justify-center w-8 h-8 rounded-lg mr-3 transition-colors",
                    isClientPageActive ? "bg-white text-white" : "bg-gray-100 text-gray-600 group-hover:bg-gray-200"
                  )}>
                    <Users className="h-4 w-4" />
                  </span>
                  <span className="font-medium">Clients</span>
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
                      "block px-4 py-2 text-sm transition-colors rounded-lg ml-2",
                      pathname === "/clients"
                        ? "bg-blue-100 text-blue-700 font-medium"
                        : "text-gray-600 hover:bg-gray-50 hover:text-gray-900",
                    )}
                  >
                    View All Clients
                  </Link>

                  {/* Add New Client Button */}
                  <Button
                    onClick={() => setShowAddClientDialog(true)}
                    className="w-full justify-start px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 hover:text-gray-900 bg-transparent border-0 rounded-lg h-auto ml-2"
                  >
                    <Plus className="mr-3 h-4 w-4" />
                    Add New Client
                  </Button>

                  {/* Divider */}
                  <div className="border-t border-gray-200 my-2 ml-2"></div>

                  {/* Active Clients Section */}
                  <div className="text-xs text-gray-500 px-4 py-1 font-medium uppercase tracking-wider ml-2">
                    Active Clients ({activeClients.length})
                  </div>

                  {/* Active Client List */}
                  {loading ? (
                    <div className="space-y-2">
                      {[1, 2, 3].map((i) => (
                        <div key={i} className="px-4 py-2 animate-pulse ml-2">
                          <div className="h-4 bg-gray-200 rounded w-3/4"></div>
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
                            "block px-4 py-2 text-sm transition-colors rounded-lg ml-2",
                            pathname === `/clients/${client.id}`
                              ? "bg-blue-100 text-blue-700 font-medium"
                              : "text-gray-600 hover:bg-gray-50 hover:text-gray-900",
                          )}
                        >
                          {client.name}
                        </Link>
                      ))}
                    </div>
                  ) : (
                    <div className="px-4 py-2 text-sm text-gray-500 italic ml-2">
                      No active clients
                    </div>
                  )}

                  {/* Archived Clients Dropdown */}
                  {archivedClients.length > 0 && (
                    <>
                      <div className="border-t border-gray-200 my-2 ml-2"></div>
                      
                      <div
                        className={cn(
                          "flex items-center justify-between px-4 py-2 text-sm transition-colors cursor-pointer rounded-lg ml-2",
                          "text-gray-500 hover:bg-gray-50 hover:text-gray-700",
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
                                "block px-4 py-2 text-sm transition-colors rounded-lg ml-4",
                                pathname === `/clients/${client.id}`
                                  ? "bg-orange-100 text-orange-700 font-medium"
                                  : "text-gray-500 hover:bg-gray-50 hover:text-orange-600",
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
