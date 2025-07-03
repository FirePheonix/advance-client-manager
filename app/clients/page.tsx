"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu"
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter 
} from "@/components/ui/dialog"
import { 
  AlertDialog, 
  AlertDialogAction, 
  AlertDialogCancel, 
  AlertDialogContent, 
  AlertDialogDescription, 
  AlertDialogFooter, 
  AlertDialogHeader, 
  AlertDialogTitle 
} from "@/components/ui/alert-dialog"
import { 
  Plus, 
  Search, 
  Phone, 
  Mail, 
  Calendar, 
  DollarSign, 
  MoreHorizontal, 
  Edit, 
  Trash2,
  Archive,
  ArchiveRestore
} from "lucide-react"
import { AddClientDialog } from "@/components/add-client-dialog"
import { 
  getClients, 
  createClient, 
  renameClient, 
  deleteClient,
  archiveClient,
  unarchiveClient,
  type Client 
} from "@/lib/database"
import Link from "next/link"
import { toast } from "sonner"

type ViewMode = 'active' | 'archived'

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [viewMode, setViewMode] = useState<ViewMode>('active')
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [showRenameDialog, setShowRenameDialog] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [showArchiveDialog, setShowArchiveDialog] = useState(false)
  const [selectedClient, setSelectedClient] = useState<Client | null>(null)
  const [newName, setNewName] = useState("")

  useEffect(() => {
    loadClients()
  }, [viewMode])

  async function loadClients() {
    try {
      const data = await getClients()
      // Filter clients based on view mode
      const filteredData = data.filter(client => {
        if (viewMode === 'active') {
          return client.status !== 'archived'
        } else {
          return client.status === 'archived'
        }
      })
      setClients(filteredData)
    } catch (error) {
      console.error("Error loading clients:", error)
      toast.error("Failed to load clients")
    } finally {
      setLoading(false)
    }
  }

  const filteredClients = clients.filter(
    (client) =>
      client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      client.email.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  const handleAddClient = async (clientData: any) => {
    try {
      const newClient = await createClient(clientData)
      if (viewMode === 'active' && newClient.status !== 'archived') {
        setClients([newClient, ...clients])
      }
      setShowAddDialog(false)
      toast.success("Client added successfully")
    } catch (error) {
      console.error("Error adding client:", error)
      toast.error("Failed to add client")
    }
  }

  const handleRenameClient = async () => {
    if (!selectedClient || !newName.trim()) return

    try {
      const updatedClient = await renameClient(selectedClient.id, newName.trim())
      setClients(clients.map(client => 
        client.id === selectedClient.id ? updatedClient : client
      ))
      setShowRenameDialog(false)
      setSelectedClient(null)
      setNewName("")
      toast.success("Client renamed successfully")
    } catch (error) {
      console.error("Error renaming client:", error)
      toast.error("Failed to rename client")
    }
  }

  const handleArchiveClient = async () => {
    if (!selectedClient) return

    try {
      await archiveClient(selectedClient.id)
      // Remove from current view if it's active view
      if (viewMode === 'active') {
        setClients(clients.filter(client => client.id !== selectedClient.id))
      }
      setShowArchiveDialog(false)
      setSelectedClient(null)
      toast.success("Client archived successfully")
    } catch (error) {
      console.error("Error archiving client:", error)
      toast.error("Failed to archive client")
    }
  }

  const handleUnarchiveClient = async (clientId: string) => {
    try {
      await unarchiveClient(clientId)
      // Remove from archived view
      if (viewMode === 'archived') {
        setClients(clients.filter(client => client.id !== clientId))
      }
      toast.success("Client unarchived successfully")
    } catch (error) {
      console.error("Error unarchiving client:", error)
      toast.error("Failed to unarchive client")
    }
  }

  const handleDeleteClient = async () => {
    if (!selectedClient) return

    try {
      await deleteClient(selectedClient.id)
      setClients(clients.filter(client => client.id !== selectedClient.id))
      setShowDeleteDialog(false)
      setSelectedClient(null)
      toast.success("Client deleted successfully")
    } catch (error) {
      console.error("Error deleting client:", error)
      toast.error("Failed to delete client")
    }
  }

  const openRenameDialog = (client: Client) => {
    setSelectedClient(client)
    setNewName(client.name)
    setShowRenameDialog(true)
  }

  const openDeleteDialog = (client: Client) => {
    setSelectedClient(client)
    setShowDeleteDialog(true)
  }

  const openArchiveDialog = (client: Client) => {
    setSelectedClient(client)
    setShowArchiveDialog(true)
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-white">Clients</h1>
            <p className="text-gray-400 mt-2">Manage your client relationships and projects</p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Card key={i} className="bg-gray-800 border-gray-700">
              <CardContent className="p-6">
                <div className="animate-pulse space-y-4">
                  <div className="h-6 bg-gray-700 rounded w-3/4"></div>
                  <div className="h-4 bg-gray-700 rounded w-1/2"></div>
                  <div className="h-4 bg-gray-700 rounded w-2/3"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-white">
            {viewMode === 'active' ? 'Active Clients' : 'Archived Clients'}
          </h1>
          <p className="text-gray-400 mt-2">
            {viewMode === 'active' 
              ? 'Manage your active client relationships and projects' 
              : 'View and manage archived clients'
            }
          </p>
        </div>
        <div className="flex items-center space-x-4">
          {/* View Mode Toggle */}
          <div className="flex space-x-2">
            <Button
              size="sm"
              variant={viewMode === 'active' ? 'default' : 'outline'}
              onClick={() => setViewMode('active')}
              className={viewMode === 'active' ? 'bg-white text-black' : 'border-gray-600 text-gray-300'}
            >
              Active
            </Button>
            <Button
              size="sm"
              variant={viewMode === 'archived' ? 'default' : 'outline'}
              onClick={() => setViewMode('archived')}
              className={viewMode === 'archived' ? 'bg-white text-black' : 'border-gray-600 text-gray-300'}
            >
              Archived
            </Button>
          </div>
          
          {viewMode === 'active' && (
            <Button onClick={() => setShowAddDialog(true)} className="bg-white text-black hover:bg-gray-200">
              <Plus className="mr-2 h-4 w-4" />
              Add New Client
            </Button>
          )}
        </div>
      </div>

      <div className="flex items-center space-x-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Search clients..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 bg-gray-800 border-gray-700 text-white placeholder-gray-400"
          />
        </div>
      </div>

      {/* Show info message for archived clients */}
      {viewMode === 'archived' && (
        <div className="bg-amber-900/20 border border-amber-700 rounded-lg p-4">
          <h3 className="text-amber-400 font-medium mb-2">Archived Clients</h3>
          <p className="text-amber-300 text-sm">
            These clients have been archived and won't appear in upcoming payments or active client lists. 
            Their data is preserved but their next payment date is set far in the future. 
            You can unarchive them to restore normal functionality.
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredClients.map((client) => (
          <Card key={client.id} className="bg-gray-800 border-gray-700 group relative">
            <CardHeader>
              <div className="flex justify-between items-start">
                <Link href={`/clients/${client.id}`} className="flex-1">
                  <CardTitle className="text-white cursor-pointer hover:text-blue-400 transition-colors">
                    {client.name}
                  </CardTitle>
                </Link>
                <div className="flex items-center space-x-2">
                  <Badge
                    variant={
                      client.status === "archived" 
                        ? "secondary" 
                        : client.status === "active" 
                          ? "default" 
                          : "secondary"
                    }
                    className={
                      client.status === "archived"
                        ? "bg-gray-600"
                        : client.status === "active" 
                          ? "bg-green-600" 
                          : "bg-yellow-600"
                    }
                  >
                    {client.status}
                  </Badge>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 text-gray-400 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                      <DropdownMenuItem onClick={() => openRenameDialog(client)}>
                        <Edit className="mr-2 h-4 w-4" />
                        Rename
                      </DropdownMenuItem>
                      {viewMode === 'active' ? (
                        <DropdownMenuItem onClick={() => openArchiveDialog(client)}>
                          <Archive className="mr-2 h-4 w-4" />
                          Archive
                        </DropdownMenuItem>
                      ) : (
                        <DropdownMenuItem onClick={() => handleUnarchiveClient(client.id)}>
                          <ArchiveRestore className="mr-2 h-4 w-4" />
                          Unarchive
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem 
                        onClick={() => openDeleteDialog(client)}
                        className="text-red-600 focus:text-red-600"
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </CardHeader>
            <Link href={`/clients/${client.id}`}>
              <CardContent className="space-y-4 cursor-pointer">
                <div className="space-y-2">
                  <div className="flex items-center text-sm text-gray-300">
                    <Mail className="mr-2 h-4 w-4" />
                    {client.email}
                  </div>
                  {client.phone && (
                    <div className="flex items-center text-sm text-gray-300">
                      <Phone className="mr-2 h-4 w-4" />
                      {client.phone}
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <div className="flex items-center text-sm text-gray-300">
                    <DollarSign className="mr-2 h-4 w-4" />
                    {client.payment_type === "monthly"
                      ? `₹${client.monthly_rate?.toLocaleString()}/month`
                      : client.payment_type === "weekly"
                        ? `₹${client.weekly_rate?.toLocaleString()}/week`
                        : "Per-post pricing"}
                  </div>
                  {client.next_payment && viewMode === 'active' && (
                    <div className="flex items-center text-sm text-gray-300">
                      <Calendar className="mr-2 h-4 w-4" />
                      Next payment: {client.next_payment}
                    </div>
                  )}
                </div>

                <div className="flex flex-wrap gap-1">
                  {client.services.map((service) => (
                    <Badge key={service} variant="outline" className="text-xs border-gray-600 text-gray-300">
                      {service}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Link>
          </Card>
        ))}
      </div>

      {filteredClients.length === 0 && (
        <div className="text-center py-8">
          <p className="text-gray-400">
            {viewMode === 'active' 
              ? 'No active clients found. Add a new client to get started.' 
              : 'No archived clients found.'
            }
          </p>
        </div>
      )}

      {/* Add Client Dialog */}
      <AddClientDialog 
        open={showAddDialog} 
        onOpenChange={setShowAddDialog} 
        onAddClient={handleAddClient} 
      />

      {/* Rename Client Dialog */}
      <Dialog open={showRenameDialog} onOpenChange={setShowRenameDialog}>
        <DialogContent className="bg-gray-800 border-gray-700">
          <DialogHeader>
            <DialogTitle className="text-white">Rename Client</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Enter new client name"
              className="bg-gray-700 border-gray-600 text-white"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleRenameClient()
                }
              }}
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowRenameDialog(false)}
              className="border-gray-600 text-gray-300"
            >
              Cancel
            </Button>
            <Button
              onClick={handleRenameClient}
              disabled={!newName.trim() || newName === selectedClient?.name}
              className="bg-white text-black hover:bg-gray-200"
            >
              Rename
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Archive Client Dialog */}
      <AlertDialog open={showArchiveDialog} onOpenChange={setShowArchiveDialog}>
        <AlertDialogContent className="bg-gray-800 border-gray-700">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Archive Client</AlertDialogTitle>
            <AlertDialogDescription className="text-gray-300">
              Are you sure you want to archive "{selectedClient?.name}"? 
              <br /><br />
              <strong>What happens when you archive a client:</strong>
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>They won't appear in upcoming payments</li>
                <li>They won't show in active client lists</li>
                <li>All their data (tasks, payments, etc.) is preserved</li>
                <li>You can unarchive them anytime to restore full functionality</li>
              </ul>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-gray-600 text-gray-300 hover:bg-gray-700">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleArchiveClient}
              className="bg-amber-600 hover:bg-amber-700 text-white"
            >
              Archive Client
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Client Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent className="bg-gray-800 border-gray-700">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Delete Client</AlertDialogTitle>
            <AlertDialogDescription className="text-gray-300">
              Are you sure you want to delete "{selectedClient?.name}"? This action cannot be undone.
              All associated tasks and payments will also be removed.
              <br /><br />
              <strong className="text-red-400">Consider archiving instead if you want to preserve data.</strong>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-gray-600 text-gray-300 hover:bg-gray-700">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteClient}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Delete Client
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}