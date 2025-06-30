"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter 
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select"
import { ArrowLeft, Mail, Phone, Building, DollarSign, Calendar, Users, Edit, Trash2 } from "lucide-react"
import { useRouter } from "next/navigation"
import { KanbanBoard } from "@/components/kanban-board"
import { PaymentTimelineGraph } from "@/components/payment-timeline-graph"
import {
  getClientById,
  getTasksByClient,
  getPaymentsByClient,
  createTask,
  updateTask,
  createPayment,
  updateClient,
  deleteClient,
  type Client,
  type Task,
  type Payment,
} from "@/lib/database"
import { toast } from "sonner"

interface ClientDetailPageProps {
  params: Promise<{ id: string }>
}

const SERVICE_OPTIONS = [
  "Social Media Management",
  "Content Creation",
  "SEO",
  "Digital Marketing",
  "Website Development",
  "Graphic Design",
  "Video Production",
  "Email Marketing",
  "Analytics & Reporting",
  "Consulting"
]

export default function ClientDetailPage({ params }: ClientDetailPageProps) {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<"overview" | "board" | "timeline">("overview")
  const [client, setClient] = useState<Client | null>(null)
  const [tasks, setTasks] = useState<Task[]>([])
  const [paymentEvents, setPaymentEvents] = useState<Payment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [editFormData, setEditFormData] = useState<Partial<Client>>({})
  const [clientId, setClientId] = useState<string | null>(null)

  useEffect(() => {
    async function initializeParams() {
      const resolvedParams = await params
      setClientId(resolvedParams.id)
    }
    initializeParams()
  }, [params])

  useEffect(() => {
    if (clientId) {
      loadClientData()
    }
  }, [clientId])

  async function loadClientData() {
    if (!clientId) return
    
    try {
      setLoading(true)
      setError(null)
      
      const [clientData, clientTasks, clientPayments] = await Promise.all([
        getClientById(clientId),
        getTasksByClient(clientId),
        getPaymentsByClient(clientId),
      ])

      setClient(clientData)
      setTasks(clientTasks)
      setPaymentEvents(clientPayments)
    } catch (error) {
      console.error("Error loading client data:", error)
      setError("Failed to load client data. Please try again.")
      toast.error("Failed to load client data")
    } finally {
      setLoading(false)
    }
  }

  const handleTaskMove = async (taskId: string, newStatus: Task["status"]) => {
    try {
      const updatedTask = await updateTask(taskId, { 
        status: newStatus,
        updated_at: new Date().toISOString()
      })
      setTasks((prev) => prev.map((task) => (task.id === taskId ? updatedTask : task)))
      toast.success("Task updated successfully")
    } catch (error) {
      console.error("Error updating task:", error)
      toast.error("Failed to update task")
    }
  }

  const handleAddTask = async (taskData: Omit<Task, "id" | "created_at" | "updated_at" | "client_id" | "comments_count">) => {
    if (!clientId) return
    
    try {
      const newTask = await createTask({
        client_id: clientId,
        title: taskData.title,
        description: taskData.description,
        priority: taskData.priority,
        platform: taskData.platform,
        start_date: taskData.start_date,
        end_date: taskData.end_date,
        assignees: taskData.assignees,
        status: taskData.status,
        comments_count: 0,
      })
      setTasks((prev) => [newTask, ...prev])
      toast.success("Task created successfully")
    } catch (error) {
      console.error("Error adding task:", error)
      toast.error("Failed to create task")
    }
  }

  const handleAddPost = async (post: { date: string; platform: string; count: number; amount?: number }) => {
    if (!clientId) return
    
    try {
      const newPayment = await createPayment({
        client_id: clientId,
        amount: post.amount || 0,
        payment_date: post.date,
        status: "completed",
        type: "post",
        post_count: post.count,
        platform_breakdown: { [post.platform]: post.count },
        description: `${post.count} ${post.platform} posts`,
      })

      setPaymentEvents((prev) =>
        [...prev, newPayment].sort((a, b) => new Date(a.payment_date).getTime() - new Date(b.payment_date).getTime()),
      )
      toast.success("Post activity added successfully")
    } catch (error) {
      console.error("Error adding post:", error)
      toast.error("Failed to add post activity")
    }
  }

  const handleAddPayment = async (payment: { date: string; amount: number; description: string }) => {
    if (!clientId) return
    
    try {
      const newPayment = await createPayment({
        client_id: clientId,
        amount: payment.amount,
        payment_date: payment.date,
        status: "completed",
        type: "payment",
        description: payment.description,
      })

      setPaymentEvents((prev) =>
        [...prev, newPayment].sort((a, b) => new Date(a.payment_date).getTime() - new Date(b.payment_date).getTime()),
      )
      toast.success("Payment added successfully")
    } catch (error) {
      console.error("Error adding payment:", error)
      toast.error("Failed to add payment")
    }
  }

  const openEditDialog = () => {
    if (!client) return
    setEditFormData({
      name: client.name,
      email: client.email,
      phone: client.phone || "",
      company: client.company || "",
      payment_type: client.payment_type,
      monthly_rate: client.monthly_rate || 0,
      weekly_rate: client.weekly_rate || 0,
      next_payment: client.next_payment || "",
      status: client.status,
      services: client.services,
      notes: client.notes || "",
    })
    setShowEditDialog(true)
  }

  const handleEditClient = async () => {
    if (!client || !editFormData.name?.trim() || !editFormData.email?.trim()) {
      toast.error("Name and email are required")
      return
    }

    try {
      const updatedClient = await updateClient(client.id, {
        ...editFormData,
        updated_at: new Date().toISOString()
      })
      setClient(updatedClient)
      setShowEditDialog(false)
      toast.success("Client updated successfully")
    } catch (error) {
      console.error("Error updating client:", error)
      toast.error("Failed to update client")
    }
  }

  const handleDeleteClient = async () => {
    if (!client) return

    try {
      await deleteClient(client.id)
      toast.success("Client deleted successfully")
      router.push("/clients") // Redirect to clients list
    } catch (error) {
      console.error("Error deleting client:", error)
      toast.error("Failed to delete client")
    }
  }

  const handleServiceToggle = (service: string) => {
    const currentServices = editFormData.services || []
    const updatedServices = currentServices.includes(service)
      ? currentServices.filter(s => s !== service)
      : [...currentServices, service]
    
    setEditFormData(prev => ({ ...prev, services: updatedServices }))
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" className="text-gray-300">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          <div className="space-y-2">
            <div className="h-8 bg-gray-700 rounded w-64 animate-pulse"></div>
            <div className="h-4 bg-gray-700 rounded w-48 animate-pulse"></div>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="bg-gray-800 border-gray-700">
              <CardContent className="p-6">
                <div className="animate-pulse space-y-4">
                  <div className="h-6 bg-gray-700 rounded w-3/4"></div>
                  <div className="h-4 bg-gray-700 rounded w-1/2"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  if (error || !client) {
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-4">
        <div className="text-white text-xl">{error || "Client not found"}</div>
        <Button onClick={() => router.back()} className="bg-white text-black hover:bg-gray-200">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Go Back
        </Button>
      </div>
    )
  }

  const getPaymentRateDisplay = () => {
    if (client.payment_type === "monthly" && client.monthly_rate) {
      return `₹${client.monthly_rate.toLocaleString()}/month`
    } else if (client.payment_type === "weekly" && client.weekly_rate) {
      return `₹${client.weekly_rate.toLocaleString()}/week`
    } else if (client.payment_type === "per-post") {
      return "Per-post pricing"
    }
    return "Rate not set"
  }

  const completedTasks = tasks.filter(task => task.status === "completed").length
  const totalTasks = tasks.length
  const completedPayments = paymentEvents.filter(payment => payment.status === "completed").length
  const totalRevenue = paymentEvents
    .filter(payment => payment.status === "completed")
    .reduce((sum, payment) => sum + payment.amount, 0)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button
            variant="ghost"
            onClick={() => router.back()}
            className="text-gray-300 hover:text-white hover:bg-gray-900"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          <div>
            <div className="flex items-center space-x-3">
              <h1 className="text-3xl font-bold text-white">{client.name}</h1>
              <Badge
                variant={client.status === "active" ? "default" : "secondary"}
                className={client.status === "active" ? "bg-green-600" : "bg-yellow-600"}
              >
                {client.status}
              </Badge>
              <Button
                variant="outline"
                size="sm"
                onClick={openEditDialog}
                className="border-gray-600 text-gray-300 hover:bg-gray-900"
              >
                <Edit className="mr-2 h-4 w-4" />
                Edit
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowDeleteDialog(true)}
                className="border-red-600 text-red-400 hover:bg-red-900/20 hover:border-red-500"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </Button>
            </div>
            <p className="text-gray-400 mt-1">Client Management & Analytics</p>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center space-x-2">
          <Button
            variant={activeTab === "overview" ? "default" : "outline"}
            onClick={() => setActiveTab("overview")}
            className={
              activeTab === "overview" 
                ? "bg-white text-black" 
                : "bg-black border-gray-800 text-white hover:bg-gray-900"
            }
          >
            Overview
          </Button>
          <Button
            variant={activeTab === "board" ? "default" : "outline"}
            onClick={() => setActiveTab("board")}
            className={
              activeTab === "board" 
                ? "bg-white text-black" 
                : "bg-black border-gray-800 text-white hover:bg-gray-900"
            }
          >
            Board
          </Button>
          <Button
            variant={activeTab === "timeline" ? "default" : "outline"}
            onClick={() => setActiveTab("timeline")}
            className={
              activeTab === "timeline" 
                ? "bg-white text-black" 
                : "bg-black border-gray-800 text-white hover:bg-gray-900"
            }
          >
            Timeline
          </Button>
        </div>
      </div>

      {/* Content based on active tab */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          {/* Client Info Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-gray-400">Tasks Completed</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-white">
                  {completedTasks}/{totalTasks}
                </div>
                <p className="text-xs text-gray-400 mt-1">
                  {totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0}% completion rate
                </p>
              </CardContent>
            </Card>

            <Card className="bg-gray-800 border-gray-700">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-gray-400">Total Revenue</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-white">₹{totalRevenue.toLocaleString()}</div>
                <p className="text-xs text-gray-400 mt-1">{completedPayments} payments received</p>
              </CardContent>
            </Card>

            <Card className="bg-gray-800 border-gray-700">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-gray-400">Payment Rate</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-white">{getPaymentRateDisplay()}</div>
                <p className="text-xs text-gray-400 mt-1 capitalize">{client.payment_type} billing</p>
              </CardContent>
            </Card>

            <Card className="bg-gray-800 border-gray-700">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-gray-400">Services</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-white">{client.services.length}</div>
                <p className="text-xs text-gray-400 mt-1">Active services</p>
              </CardContent>
            </Card>
          </div>

          {/* Client Details */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle className="text-white">Contact Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center text-sm text-gray-300">
                  <Mail className="mr-3 h-4 w-4" />
                  {client.email}
                </div>
                {client.phone && (
                  <div className="flex items-center text-sm text-gray-300">
                    <Phone className="mr-3 h-4 w-4" />
                    {client.phone}
                  </div>
                )}
                {client.company && (
                  <div className="flex items-center text-sm text-gray-300">
                    <Building className="mr-3 h-4 w-4" />
                    {client.company}
                  </div>
                )}
                <div className="flex items-center text-sm text-gray-300">
                  <DollarSign className="mr-3 h-4 w-4" />
                  {getPaymentRateDisplay()}
                </div>
                {client.next_payment && (
                  <div className="flex items-center text-sm text-gray-300">
                    <Calendar className="mr-3 h-4 w-4" />
                    Next payment: {client.next_payment}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle className="text-white">Services & Notes</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="text-sm font-medium text-gray-400 mb-2">Services</h4>
                  <div className="flex flex-wrap gap-2">
                    {client.services.map((service) => (
                      <Badge key={service} variant="outline" className="border-gray-600 text-gray-300">
                        {service}
                      </Badge>
                    ))}
                  </div>
                </div>
                {client.notes && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-400 mb-2">Notes</h4>
                    <p className="text-sm text-gray-300 bg-gray-900 p-3 rounded">{client.notes}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {activeTab === "board" && (
        <KanbanBoard 
          clientName={client.name} 
          tasks={tasks} 
          onTaskMove={handleTaskMove} 
          onAddTask={handleAddTask} 
        />
      )}

      {activeTab === "timeline" && (
        <PaymentTimelineGraph
          client={client}
          events={paymentEvents}
          onAddPost={handleAddPost}
          onAddPayment={handleAddPayment}
        />
      )}

      {/* Edit Client Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="bg-gray-800 border-gray-700 max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-white">Edit Client</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-gray-300">Name *</Label>
                <Input
                  id="name"
                  value={editFormData.name || ""}
                  onChange={(e) => setEditFormData(prev => ({ ...prev, name: e.target.value }))}
                  className="bg-gray-700 border-gray-600 text-white"
                  placeholder="Client name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email" className="text-gray-300">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  value={editFormData.email || ""}
                  onChange={(e) => setEditFormData(prev => ({ ...prev, email: e.target.value }))}
                  className="bg-gray-700 border-gray-600 text-white"
                  placeholder="client@example.com"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="phone" className="text-gray-300">Phone</Label>
                <Input
                  id="phone"
                  value={editFormData.phone || ""}
                  onChange={(e) => setEditFormData(prev => ({ ...prev, phone: e.target.value }))}
                  className="bg-gray-700 border-gray-600 text-white"
                  placeholder="Phone number"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="company" className="text-gray-300">Company</Label>
                <Input
                  id="company"
                  value={editFormData.company || ""}
                  onChange={(e) => setEditFormData(prev => ({ ...prev, company: e.target.value }))}
                  className="bg-gray-700 border-gray-600 text-white"
                  placeholder="Company name"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="payment_type" className="text-gray-300">Payment Type</Label>
                <Select
                  value={editFormData.payment_type}
                  onValueChange={(value: "monthly" | "weekly" | "per-post") => 
                    setEditFormData(prev => ({ ...prev, payment_type: value }))
                  }
                >
                  <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                    <SelectValue placeholder="Select payment type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="per-post">Per Post</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="status" className="text-gray-300">Status</Label>
                <Select
                  value={editFormData.status}
                  onValueChange={(value: "active" | "inactive" | "pending") => 
                    setEditFormData(prev => ({ ...prev, status: value }))
                  }
                >
                  <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {editFormData.payment_type === "monthly" && (
              <div className="space-y-2">
                <Label htmlFor="monthly_rate" className="text-gray-300">Monthly Rate (₹)</Label>
                <Input
                  id="monthly_rate"
                  type="number"
                  value={editFormData.monthly_rate || ""}
                  onChange={(e) => setEditFormData(prev => ({ ...prev, monthly_rate: Number(e.target.value) }))}
                  className="bg-gray-700 border-gray-600 text-white"
                  placeholder="Monthly rate"
                />
              </div>
            )}

            {editFormData.payment_type === "weekly" && (
              <div className="space-y-2">
                <Label htmlFor="weekly_rate" className="text-gray-300">Weekly Rate (₹)</Label>
                <Input
                  id="weekly_rate"
                  type="number"
                  value={editFormData.weekly_rate || ""}
                  onChange={(e) => setEditFormData(prev => ({ ...prev, weekly_rate: Number(e.target.value) }))}
                  className="bg-gray-700 border-gray-600 text-white"
                  placeholder="Weekly rate"
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="next_payment" className="text-gray-300">Next Payment Date</Label>
              <Input
                id="next_payment"
                type="date"
                value={editFormData.next_payment || ""}
                onChange={(e) => setEditFormData(prev => ({ ...prev, next_payment: e.target.value }))}
                className="bg-gray-700 border-gray-600 text-white"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-gray-300">Services</Label>
              <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto">
                {SERVICE_OPTIONS.map((service) => (
                  <div key={service} className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id={`service-${service}`}
                      checked={(editFormData.services || []).includes(service)}
                      onChange={() => handleServiceToggle(service)}
                      className="rounded border-gray-600"
                    />
                    <Label 
                      htmlFor={`service-${service}`} 
                      className="text-sm text-gray-300 cursor-pointer"
                    >
                      {service}
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes" className="text-gray-300">Notes</Label>
              <Textarea
                id="notes"
                value={editFormData.notes || ""}
                onChange={(e) => setEditFormData(prev => ({ ...prev, notes: e.target.value }))}
                className="bg-gray-700 border-gray-600 text-white"
                placeholder="Additional notes..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowEditDialog(false)}
              className="border-gray-600 text-gray-300"
            >
              Cancel
            </Button>
            <Button
              onClick={handleEditClient}
              disabled={!editFormData.name?.trim() || !editFormData.email?.trim()}
              className="bg-white text-black hover:bg-gray-200"
            >
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Client Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="bg-gray-800 border-gray-700">
          <DialogHeader>
            <DialogTitle className="text-white">Delete Client</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-gray-300">
              Are you sure you want to delete <span className="font-semibold text-white">{client?.name}</span>?
            </p>
            <p className="text-sm text-gray-400 mt-2">
              This action cannot be undone. All associated tasks and payment records will also be deleted.
            </p>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowDeleteDialog(false)}
              className="border-gray-600 text-gray-300"
            >
              Cancel
            </Button>
            <Button
              onClick={handleDeleteClient}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Delete Client
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}