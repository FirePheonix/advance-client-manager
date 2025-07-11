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
  DialogFooter,
  DialogDescription
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
import { Checkbox } from "@/components/ui/checkbox"
import { ArrowLeft, Mail, Phone, Building, DollarSign, Calendar, Users, Edit, Trash2, Archive, ArchiveRestore, Plus, X } from "lucide-react"
import { useRouter } from "next/navigation"
import { KanbanBoard } from "@/components/kanban-board"
import { PaymentTimelineGraph } from "@/components/payment-timeline-graph"
import { ManagePostCounts } from "@/components/manage-post-counts" // Add this import
import {
  getClientById,
  getTasksByClient,
  getPaymentsByClient,
  createTask,
  updateTask,
  createPayment,
  updateClient,
  deleteClient,
  archiveClient,
  unarchiveClient,
  calculateTotalPaymentRate,
  ensureClientPaymentRateUpToDate,
  updateClientTierByPaymentCount,
  forceUpdateNextPaymentDate,
} from "@/lib/database"
import { type Client, type Task, type Payment } from "@/lib/supabase"
import { toast } from "sonner"

interface ClientDetailPageProps {
  params: Promise<{ id: string }>
}

interface ServiceEntry {
  name: string
  price: number
}

interface TieredPaymentEntry {
  amount: number
  duration_months: number
  payment_type: "monthly" | "weekly"
  services: ServiceEntry[]
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

const postTypes = [
  "LinkedIn Post",
  "Instagram Post", 
  "Facebook Post",
  "WhatsApp Message",
  "Poster Design",
  "Story Design",
  "Reel Creation",
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
  const [showArchiveDialog, setShowArchiveDialog] = useState(false)
  const [editFormData, setEditFormData] = useState({
    name: "",
    email: "",
    phone: "",
    company: "",
    company_address: "",
    gst_number: "",
    poc_phone: "",
    paymentType: "monthly",
    monthlyRate: "",
    weeklyRate: "",
    nextPayment: "",
    fixedPaymentDay: 1, // Default to 1st of month
    services: [] as ServiceEntry[],
    perPostRates: {} as Record<string, number>,
    customPostTypes: [] as string[], // Array of custom post types
    tieredPayments: [] as TieredPaymentEntry[],
    finalMonthlyRate: "",
    finalWeeklyRate: "",
    finalServices: [] as ServiceEntry[],
    notes: "",
    status: "active",
    useTieredPayments: false,
  })
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
      
      // First, ensure client payment rate is up-to-date with tier transitions
      const updatedClient = await ensureClientPaymentRateUpToDate(clientId)
      if (updatedClient) {
        console.log(`Updated tier transition for client: ${updatedClient.name}`)
      }
      
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

  // Convert database tasks to KanbanBoard tasks format
  const convertToKanbanTasks = (dbTasks: Task[]) => {
    return dbTasks.map(task => ({
      id: task.id,
      title: task.title,
      description: task.description || '',
      priority: task.priority,
      platform: task.platform,
      dateRange: task.start_date && task.end_date ? 
        `${task.start_date} - ${task.end_date}` : 
        task.start_date || task.end_date || '',
      assignees: task.assignees,
      comments: task.comments_count,
      status: task.status
    }))
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
    
    // Convert client.services Record<string, number> to ServiceEntry[]
    const servicesArray = Object.entries(client.services || {}).map(([name, price]) => ({
      name,
      price
    }))
    
    // Convert client.final_services Record<string, number> to ServiceEntry[]
    const finalServicesArray = Object.entries(client.final_services || {}).map(([name, price]) => ({
      name,
      price
    }))
    
    // Convert client.tiered_payments to TieredPaymentEntry[]
    const tieredPaymentsArray = (client.tiered_payments || []).map(tier => ({
      amount: tier.amount,
      duration_months: tier.duration_months,
      payment_type: tier.payment_type || "monthly",
      services: Object.entries(tier.services || {}).map(([name, price]) => ({
        name,
        price
      }))
    }))
    
    // Extract custom post types from per_post_rates
    const customPostTypes = Object.keys(client.per_post_rates || {}).filter(
      type => !postTypes.includes(type)
    )
    
    setEditFormData({
      name: client.name,
      email: client.email,
      phone: client.phone || "",
      company: client.company || "",
      company_address: client.company_address || "",
      gst_number: client.gst_number || "",
      poc_phone: client.poc_phone || "",
      paymentType: client.payment_type,
      monthlyRate: client.monthly_rate?.toString() || "",
      weeklyRate: client.weekly_rate?.toString() || "",
      nextPayment: client.next_payment || "",
      fixedPaymentDay: client.fixed_payment_day || 1,
      services: servicesArray,
      perPostRates: client.per_post_rates || {},
      customPostTypes: customPostTypes,
      tieredPayments: tieredPaymentsArray,
      finalMonthlyRate: client.final_monthly_rate?.toString() || "",
      finalWeeklyRate: client.final_weekly_rate?.toString() || "",
      finalServices: finalServicesArray,
      notes: client.notes || "",
      status: client.status,
      useTieredPayments: (client.tiered_payments || []).length > 0,
    })
    setShowEditDialog(true)
  }

  const handleEditClient = async () => {
    if (!client || !editFormData.name?.trim() || !editFormData.email?.trim()) {
      toast.error("Name and email are required")
      return
    }

    try {
      // Convert services array to Record<string, number>
      const servicesRecord = editFormData.services.reduce((acc, service) => {
        if (service.name.trim()) {
          acc[service.name.trim()] = service.price
        }
        return acc
      }, {} as Record<string, number>)

      // Convert final services array to Record<string, number>
      const finalServicesRecord = editFormData.finalServices.reduce((acc, service) => {
        if (service.name.trim()) {
          acc[service.name.trim()] = service.price
        }
        return acc
      }, {} as Record<string, number>)

      // Convert tiered payments with services
      const tieredPaymentsData = editFormData.tieredPayments.map(tier => ({
        amount: tier.amount,
        duration_months: tier.duration_months,
        payment_type: tier.payment_type,
        services: tier.services.reduce((acc, service) => {
          if (service.name.trim()) {
            acc[service.name.trim()] = service.price
          }
          return acc
        }, {} as Record<string, number>)
      }))

      // If using tiered payments, ensure tieredPayments array is included
      // If not using tiered payments, set to empty array
      const finalTieredPayments = editFormData.useTieredPayments ? tieredPaymentsData : []

      const updatedClient = await updateClient(client.id, {
        name: editFormData.name,
        email: editFormData.email,
        phone: editFormData.phone || undefined,
        company: editFormData.company || undefined,
        company_address: editFormData.company_address || undefined,
        gst_number: editFormData.gst_number || undefined,
        poc_phone: editFormData.poc_phone || undefined,
        payment_type: editFormData.paymentType as "monthly" | "weekly" | "per-post",
        monthly_rate: editFormData.monthlyRate ? Number.parseFloat(editFormData.monthlyRate) : undefined,
        weekly_rate: editFormData.weeklyRate ? Number.parseFloat(editFormData.weeklyRate) : undefined,
        next_payment: editFormData.nextPayment || undefined,
        fixed_payment_day: editFormData.paymentType === 'per-post' ? editFormData.fixedPaymentDay : undefined,
        services: servicesRecord,
        per_post_rates: editFormData.perPostRates,
        tiered_payments: finalTieredPayments,
        final_monthly_rate: editFormData.finalMonthlyRate ? Number.parseFloat(editFormData.finalMonthlyRate) : undefined,
        final_weekly_rate: editFormData.finalWeeklyRate ? Number.parseFloat(editFormData.finalWeeklyRate) : undefined,
        final_services: finalServicesRecord,
        notes: editFormData.notes || undefined,
        status: editFormData.status as "active" | "pending" | "inactive" | "archived",
        updated_at: new Date().toISOString()
      })
      
      // After updating, ensure tier transitions are properly handled
      await ensureClientPaymentRateUpToDate(client.id)
      
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

  const handleArchiveClient = async () => {
    if (!client) return

    try {
      await archiveClient(client.id)
      toast.success("Client archived successfully")
      router.push("/clients") // Redirect to clients list
    } catch (error) {
      console.error("Error archiving client:", error)
      toast.error("Failed to archive client")
    }
  }

  const handleUnarchiveClient = async () => {
    if (!client) return

    try {
      await unarchiveClient(client.id)
      // Reload client data to show updated status
      await loadClientData()
      toast.success("Client unarchived successfully")
    } catch (error) {
      console.error("Error unarchiving client:", error)
      toast.error("Failed to unarchive client")
    }
  }

  // Service management functions
  const addService = () => {
    setEditFormData((prev) => ({
      ...prev,
      services: [...prev.services, { name: "", price: 0 }],
    }))
  }

  const removeService = (index: number) => {
    setEditFormData((prev) => ({
      ...prev,
      services: prev.services.filter((_, i) => i !== index),
    }))
  }

  const updateService = (index: number, field: keyof ServiceEntry, value: string | number) => {
    setEditFormData((prev) => ({
      ...prev,
      services: prev.services.map((service, i) => 
        i === index ? { ...service, [field]: value } : service
      ),
    }))
  }

  // Final service functions (for after tiers complete)
  const addFinalService = () => {
    setEditFormData((prev) => ({
      ...prev,
      finalServices: [...prev.finalServices, { name: "", price: 0 }],
    }))
  }

  const removeFinalService = (index: number) => {
    setEditFormData((prev) => ({
      ...prev,
      finalServices: prev.finalServices.filter((_, i) => i !== index),
    }))
  }

  const updateFinalService = (index: number, field: keyof ServiceEntry, value: string | number) => {
    setEditFormData((prev) => ({
      ...prev,
      finalServices: prev.finalServices.map((service, i) => 
        i === index ? { ...service, [field]: value } : service
      ),
    }))
  }

  // Tiered payment functions
  const addTieredPayment = () => {
    setEditFormData((prev) => ({
      ...prev,
      tieredPayments: [...prev.tieredPayments, { 
        amount: 0, 
        duration_months: 1, 
        payment_type: prev.paymentType === "weekly" ? "weekly" : "monthly",
        services: []
      }],
    }))
  }

  const removeTieredPayment = (index: number) => {
    setEditFormData((prev) => ({
      ...prev,
      tieredPayments: prev.tieredPayments.filter((_, i) => i !== index),
    }))
  }

  const updateTieredPayment = (index: number, field: keyof Omit<TieredPaymentEntry, 'services'>, value: string | number) => {
    setEditFormData((prev) => ({
      ...prev,
      tieredPayments: prev.tieredPayments.map((tier, i) => 
        i === index ? { ...tier, [field]: value } : tier
      ),
    }))
  }

  // Tier service functions
  const addTierService = (tierIndex: number) => {
    setEditFormData((prev) => ({
      ...prev,
      tieredPayments: prev.tieredPayments.map((tier, i) => 
        i === tierIndex ? { ...tier, services: [...tier.services, { name: "", price: 0 }] } : tier
      ),
    }))
  }

  const removeTierService = (tierIndex: number, serviceIndex: number) => {
    setEditFormData((prev) => ({
      ...prev,
      tieredPayments: prev.tieredPayments.map((tier, i) => 
        i === tierIndex ? { 
          ...tier, 
          services: tier.services.filter((_, j) => j !== serviceIndex) 
        } : tier
      ),
    }))
  }

  const updateTierService = (tierIndex: number, serviceIndex: number, field: keyof ServiceEntry, value: string | number) => {
    setEditFormData((prev) => ({
      ...prev,
      tieredPayments: prev.tieredPayments.map((tier, i) => 
        i === tierIndex ? { 
          ...tier, 
          services: tier.services.map((service, j) => 
            j === serviceIndex ? { ...service, [field]: value } : service
          ) 
        } : tier
      ),
    }))
  }

  const handlePerPostRateChange = (postType: string, rate: string) => {
    setEditFormData((prev) => ({
      ...prev,
      perPostRates: {
        ...prev.perPostRates,
        [postType]: Number.parseFloat(rate) || 0,
      },
    }))
  }

  // Custom post type functions
  const addCustomPostType = () => {
    setEditFormData((prev) => ({
      ...prev,
      customPostTypes: [...prev.customPostTypes, ""],
    }))
  }

  const removeCustomPostType = (index: number) => {
    setEditFormData((prev) => {
      const updatedCustomTypes = [...prev.customPostTypes]
      const removedType = updatedCustomTypes[index]
      
      // Also remove from perPostRates if it exists
      const updatedRates = { ...prev.perPostRates }
      if (removedType && removedType in updatedRates) {
        delete updatedRates[removedType]
      }
      
      return {
        ...prev,
        customPostTypes: updatedCustomTypes.filter((_, i) => i !== index),
        perPostRates: updatedRates
      }
    })
  }

  const updateCustomPostType = (index: number, value: string) => {
    setEditFormData((prev) => {
      const oldType = prev.customPostTypes[index]
      const updatedCustomTypes = [...prev.customPostTypes]
      updatedCustomTypes[index] = value
      
      // Transfer the rate from old type name to new type name
      const updatedRates = { ...prev.perPostRates }
      if (oldType && oldType in updatedRates) {
        const rate = updatedRates[oldType]
        delete updatedRates[oldType]
        updatedRates[value] = rate
      }
      
      return {
        ...prev,
        customPostTypes: updatedCustomTypes,
        perPostRates: updatedRates
      }
    })
  }

  // Function to manually force update client tier based on payment count
  const handleForceUpdateTier = async () => {
    if (!client) return
    
    try {
      toast.loading("Updating client tier...")
      
      // Call the function to update client tier based on payment count
      const updatedClient = await updateClientTierByPaymentCount(client.id)
      
      if (updatedClient) {
        setClient(updatedClient)
        toast.success("Client tier updated successfully")
        
        // Reload client data to reflect changes
        await loadClientData()
      } else {
        toast.error("Failed to update client tier")
      }
    } catch (error) {
      console.error("Error updating client tier:", error)
      toast.error("Failed to update client tier")
    }
  }

  const handleForceUpdateNextPaymentDate = async () => {
    if (!client || !client.next_payment) return
    
    try {
      toast.loading("Updating next payment date...")
      
      // Call the function to force update next payment date
      const updatedClient = await forceUpdateNextPaymentDate(client.id)
      
      if (updatedClient) {
        setClient(updatedClient)
        toast.success("Next payment date updated successfully")
        
        // Reload client data to reflect changes
        await loadClientData()
      } else {
        toast.error("Failed to update next payment date")
      }
    } catch (error) {
      console.error("Error updating next payment date:", error)
      toast.error("Failed to update next payment date")
    }
  }

  // Function to get the current tier label for display
  const getCurrentTierLabel = () => {
    if (!client || !client.tiered_payments || client.tiered_payments.length === 0) {
      return "No tiers"
    }
    
    if (client.current_tier_index === undefined) {
      return "Unknown tier"
    }
    
    // If client has passed all tiers
    if (client.current_tier_index >= client.tiered_payments.length) {
      return "Final tier (all tiers complete)"
    }
    
    return `Tier ${client.current_tier_index + 1} of ${client.tiered_payments.length}`
  }
  
  // Function to get payments remaining in current tier
  const getPaymentsRemainingInTier = () => {
    if (!client || 
        !client.tiered_payments || 
        client.tiered_payments.length === 0 || 
        client.current_tier_index === undefined || 
        client.payment_count === undefined) {
      return null
    }
    
    // If client has passed all tiers
    if (client.current_tier_index >= client.tiered_payments.length) {
      return 0
    }
    
    // Calculate total payments needed to complete all tiers up to and including current tier
    const paymentsNeededForCurrentTier = client.tiered_payments
      .slice(0, client.current_tier_index + 1)
      .reduce((sum, tier) => sum + tier.duration_months, 0)
    
    return Math.max(0, paymentsNeededForCurrentTier - client.payment_count)
  }

  // Total payments needed to complete all tiers
  const getTotalTierPayments = () => {
    if (!client || !client.tiered_payments || client.tiered_payments.length === 0) {
      return 0
    }
    
    return client.tiered_payments.reduce((sum, tier) => sum + tier.duration_months, 0)
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
    const totalRate = calculateTotalPaymentRate(client)
    
    if (client.payment_type === "monthly") {
      return `₹${totalRate.toLocaleString()}/month`
    } else if (client.payment_type === "weekly") {
      return `₹${totalRate.toLocaleString()}/week`
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
            {/* Archive Status Banner */}
            {client.status === 'archived' && (
              <div className="mb-2 p-2 bg-amber-900/20 border border-amber-700 rounded-lg">
                <div className="flex items-center space-x-2">
                  <Archive className="h-4 w-4 text-amber-400" />
                  <span className="text-amber-400 text-sm font-medium">
                    This client is archived
                  </span>
                </div>
                <p className="text-amber-300 text-xs mt-1">
                  Archived clients don't appear in upcoming payments and are hidden from active lists. 
                  All data is preserved and can be restored by unarchiving.
                </p>
              </div>
            )}
            
            <div className="flex items-center space-x-3">
              <h1 className="text-3xl font-bold text-white">{client.name}</h1>
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
              <Button
                variant="outline"
                size="sm"
                onClick={openEditDialog}
                className="border-gray-600 text-gray-300 hover:bg-gray-900"
              >
                <Edit className="mr-2 h-4 w-4" />
                Edit
              </Button>
              
              {/* Archive/Unarchive Button */}
              {client.status === 'archived' ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleUnarchiveClient}
                  className="border-green-600 text-green-400 hover:bg-green-900/20 hover:border-green-500"
                >
                  <ArchiveRestore className="mr-2 h-4 w-4" />
                  Unarchive
                </Button>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowArchiveDialog(true)}
                  className="border-amber-600 text-amber-400 hover:bg-amber-900/20 hover:border-amber-500"
                >
                  <Archive className="mr-2 h-4 w-4" />
                  Archive
                </Button>
              )}
              
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
                <div className="flex flex-col gap-1 mt-1">
                  <p className="text-xs text-gray-400 capitalize">{client.payment_type} billing</p>
                  {client.tiered_payments && client.tiered_payments.length > 0 && (
                    <>
                      <p className="text-xs text-blue-400">
                        <span className="font-medium">Tier:</span> {client.current_tier_index !== undefined ? client.current_tier_index + 1 : 'N/A'} of {client.tiered_payments.length}
                      </p>
                      <p className="text-xs text-blue-400">
                        <span className="font-medium">Payments made:</span> {client.payment_count || 0}
                      </p>
                    </>
                  )}
                </div>
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
                    {Object.entries(client.services).map(([service, price]) => (
                      <Badge key={service} variant="outline" className="border-gray-600 text-gray-300">
                        {service} (₹{price})
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
          
          {/* Tier Progress Section - Only show if using tiered payments */}
          {client.tiered_payments && client.tiered_payments.length > 0 && (
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle className="text-white">Payment Tier Progress</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-gray-900 p-4 rounded-lg">
                    <h4 className="text-sm font-medium text-gray-400 mb-2">Current Status</h4>
                    <p className="text-xl font-bold text-blue-400">{getCurrentTierLabel()}</p>
                    <p className="text-sm text-gray-300 mt-1">
                      {client.payment_count || 0} payments made total
                    </p>
                  </div>
                  
                  <div className="bg-gray-900 p-4 rounded-lg">
                    <h4 className="text-sm font-medium text-gray-400 mb-2">Tier Progress</h4>
                    {getPaymentsRemainingInTier() !== null ? (
                      <>
                        <p className="text-xl font-bold text-green-400">
                          {getPaymentsRemainingInTier()} payments remaining
                        </p>
                        <p className="text-sm text-gray-300 mt-1">
                          in current tier
                        </p>
                      </>
                    ) : (
                      <p className="text-xl font-bold text-gray-400">No tier data</p>
                    )}
                  </div>
                  
                  <div className="bg-gray-900 p-4 rounded-lg">
                    <h4 className="text-sm font-medium text-gray-400 mb-2">Final Tier</h4>
                    <p className="text-xl font-bold text-purple-400">
                      After {getTotalTierPayments()} payments
                    </p>
                    <p className="text-sm text-gray-300 mt-1">
                      ₹{client.final_monthly_rate || client.final_weekly_rate || 0} per {client.payment_type === "monthly" ? "month" : "week"}
                    </p>
                  </div>
                </div>
                
                {/* Actions section */}
              </CardContent>
            </Card>
          )}

          {/* Per Post Client Post Counts - Only show for per-post clients */}
          {client.payment_type === "per-post" && (
            <div className="mt-6">
              <ManagePostCounts 
                clientId={client.id} 
                clientName={client.name} 
                perPostRates={client.per_post_rates || {}} 
                nextPayment={client.next_payment}
              />
            </div>
          )}
        </div>
      )}

      {activeTab === "board" && (
        <KanbanBoard 
          clientName={client.name} 
          tasks={convertToKanbanTasks(tasks)} 
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
        <DialogContent className="bg-black border-gray-800 text-white max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Client</DialogTitle>
            <DialogDescription className="text-gray-400">
              Update client information and payment structure. Tier transitions are triggered automatically by payment count.
            </DialogDescription>
            {client?.current_tier_index !== undefined && (
              <div className="mt-2 p-2 bg-blue-900/20 border border-blue-700 rounded-lg">
                <p className="text-blue-300 text-sm">
                  <span className="font-bold">Current Tier:</span> {client.current_tier_index + 1} of {(client.tiered_payments || []).length}
                  {client.current_tier_index >= 0 && client.tiered_payments && client.tiered_payments.length > 0 && (
                    <span> ({client.tiered_payments[client.current_tier_index]?.amount} per {client.tiered_payments[client.current_tier_index]?.payment_type})</span>
                  )}
                </p>
                <p className="text-blue-300 text-sm">
                  <span className="font-bold">Payments Made:</span> {client.payment_count || 0}
                </p>
                <p className="text-blue-300 text-sm">
                  <span className="font-bold">Next Payment:</span> {client.next_payment || 'Not scheduled'}
                </p>
              </div>
            )}
          </DialogHeader>

          <div className="space-y-6">
            {/* Basic Information */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Client Name *</Label>
                <Input
                  id="name"
                  value={editFormData.name}
                  onChange={(e) => setEditFormData((prev) => ({ ...prev, name: e.target.value }))}
                  className="bg-black border-gray-800"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  value={editFormData.email}
                  onChange={(e) => setEditFormData((prev) => ({ ...prev, email: e.target.value }))}
                  className="bg-black border-gray-800"
                  required
                />
              </div>
            </div>

            {/* Contact Information */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  value={editFormData.phone}
                  onChange={(e) => setEditFormData((prev) => ({ ...prev, phone: e.target.value }))}
                  className="bg-black border-gray-800"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="company">Company</Label>
                <Input
                  id="company"
                  value={editFormData.company}
                  onChange={(e) => setEditFormData((prev) => ({ ...prev, company: e.target.value }))}
                  className="bg-black border-gray-800"
                />
              </div>
            </div>

            {/* Additional Company Information */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="company_address">Company Address</Label>
                <Input
                  id="company_address"
                  value={editFormData.company_address}
                  onChange={(e) => setEditFormData((prev) => ({ ...prev, company_address: e.target.value }))}
                  className="bg-black border-gray-800"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="gst_number">GST Number</Label>
                <Input
                  id="gst_number"
                  value={editFormData.gst_number}
                  onChange={(e) => setEditFormData((prev) => ({ ...prev, gst_number: e.target.value }))}
                  className="bg-black border-gray-800"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="poc_phone">POC Phone</Label>
                <Input
                  id="poc_phone"
                  value={editFormData.poc_phone}
                  onChange={(e) => setEditFormData((prev) => ({ ...prev, poc_phone: e.target.value }))}
                  className="bg-black border-gray-800"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select
                  value={editFormData.status}
                  onValueChange={(value) => setEditFormData((prev) => ({ ...prev, status: value }))}
                >
                  <SelectTrigger className="bg-black border-gray-800">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent className="bg-black border-gray-800">
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="archived">Archived</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Payment Configuration */}
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="paymentType">Payment Type</Label>
                  <Select
                    value={editFormData.paymentType}
                    onValueChange={(value) => setEditFormData((prev) => ({ ...prev, paymentType: value }))}
                  >
                    <SelectTrigger className="bg-black border-gray-800">
                      <SelectValue placeholder="Select payment type" />
                    </SelectTrigger>
                    <SelectContent className="bg-black border-gray-800">
                      <SelectItem value="monthly">Monthly</SelectItem>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="per-post">Per Post</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {editFormData.paymentType === "per-post" ? (
                  <div className="space-y-2">
                    <Label htmlFor="fixedPaymentDay">Fixed Payment Day (Monthly)</Label>
                    <div className="flex items-center space-x-2">
                      <Select
                        value={editFormData.fixedPaymentDay.toString()}
                        onValueChange={(value) => setEditFormData(prev => ({ ...prev, fixedPaymentDay: parseInt(value) }))}
                      >
                        <SelectTrigger className="bg-black border-gray-800 text-white">
                          <SelectValue placeholder="Select day of month" />
                        </SelectTrigger>
                        <SelectContent>
                          {Array.from({ length: 28 }, (_, i) => i + 1).map((day) => (
                            <SelectItem key={day} value={day.toString()}>
                              {day}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <span className="text-gray-400">of every month</span>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Label htmlFor="nextPayment">Next Payment Date</Label>
                    <Input
                      id="nextPayment"
                      type="date"
                      value={editFormData.nextPayment}
                      onChange={(e) => setEditFormData((prev) => ({ ...prev, nextPayment: e.target.value }))}
                      className="bg-black border-gray-800"
                    />
                  </div>
                )}
              </div>

              {/* Tiered Payment Structure Toggle */}
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="useTieredPayments"
                  checked={editFormData.useTieredPayments}
                  onCheckedChange={(checked) => setEditFormData((prev) => ({ ...prev, useTieredPayments: !!checked }))}
                />
                <Label htmlFor="useTieredPayments" className="text-sm">Use Tiered Payments</Label>
              </div>

              {/* Tiered Payments Structure */}
              {editFormData.useTieredPayments ? (
                <div className="space-y-6 p-4 border border-gray-700 rounded-lg bg-gray-900/50">
                  <div className="flex justify-between items-center">
                    <h4 className="text-lg font-medium text-white">Tiered Payment Structure</h4>
                    {client?.current_tier_index !== undefined && client.tiered_payments && client.tiered_payments.length > 0 && (
                      <div className="px-3 py-1 bg-blue-900/30 border border-blue-700 rounded-full">
                        <span className="text-sm text-blue-300">Current Tier: {client.current_tier_index + 1}</span>
                      </div>
                    )}
                  </div>
                  
                  {/* Add Tier Button */}
                  <div className="flex justify-end">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={addTieredPayment}
                      className="flex items-center space-x-2"
                    >
                      <Plus className="h-4 w-4" />
                      <span>Add Payment Tier</span>
                    </Button>
                  </div>

                  {/* Tiers */}
                  {editFormData.tieredPayments.map((tier, tierIndex) => (
                    <div key={tierIndex} className="space-y-4 p-4 border border-gray-600 rounded-lg bg-gray-800/50">
                      <div className="flex items-center justify-between">
                        <h5 className="font-medium text-white">
                          Tier {tierIndex + 1} - {tierIndex === 0 ? 'Initial Period' : `After ${editFormData.tieredPayments.slice(0, tierIndex).reduce((sum, t) => sum + t.duration_months, 0)} months`}
                        </h5>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeTieredPayment(tierIndex)}
                          className="text-red-400 hover:text-red-300"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                      
                      {/* Duration and Base Rate */}
                      <div className="grid grid-cols-3 gap-4">
                        <div className="space-y-2">
                          <Label>Duration</Label>
                          <Input
                            type="number"
                            placeholder="Number"
                            value={tier.duration_months || ""}
                            onChange={(e) => updateTieredPayment(tierIndex, "duration_months", Number.parseInt(e.target.value) || 1)}
                            className="bg-black border-gray-800"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Period Type</Label>
                          <Select
                            value={tier.payment_type}
                            onValueChange={(value) => updateTieredPayment(tierIndex, "payment_type", value)}
                          >
                            <SelectTrigger className="bg-black border-gray-800">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-black border-gray-800">
                              <SelectItem value="monthly">Months</SelectItem>
                              <SelectItem value="weekly">Weeks</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>Base Rate (₹)</Label>
                          <Input
                            type="number"
                            placeholder="Amount"
                            value={tier.amount || ""}
                            onChange={(e) => updateTieredPayment(tierIndex, "amount", Number.parseFloat(e.target.value) || 0)}
                            className="bg-black border-gray-800"
                          />
                        </div>
                      </div>

                      {/* Services for this tier */}
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <Label>Services for this tier</Label>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => addTierService(tierIndex)}
                            className="flex items-center space-x-2"
                          >
                            <Plus className="h-4 w-4" />
                            <span>Add Service</span>
                          </Button>
                        </div>
                        {tier.services.map((service, serviceIndex) => (
                          <div key={serviceIndex} className="flex items-center space-x-2">
                            <Input
                              placeholder="Service name (e.g., LinkedIn)"
                              value={service.name}
                              onChange={(e) => updateTierService(tierIndex, serviceIndex, "name", e.target.value)}
                              className="bg-black border-gray-800"
                            />
                            <Input
                              type="number"
                              placeholder="Additional Price"
                              value={service.price || ""}
                              onChange={(e) => updateTierService(tierIndex, serviceIndex, "price", Number.parseFloat(e.target.value) || 0)}
                              className="bg-black border-gray-800 w-32"
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => removeTierService(tierIndex, serviceIndex)}
                              className="text-red-400 hover:text-red-300"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}

                  {/* Final Payment Structure (After Tiers) */}
                  <div className="space-y-4 p-4 border border-green-600 rounded-lg bg-green-900/10">
                    <h4 className="text-lg font-medium text-green-400">Final Payment Structure (After Tiers Complete)</h4>
                    
                    <div className="grid grid-cols-2 gap-4">
                      {editFormData.paymentType === "monthly" && (
                        <div className="space-y-2">
                          <Label>Final Monthly Rate (₹)</Label>
                          <Input
                            type="number"
                            placeholder="Final monthly rate"
                            value={editFormData.finalMonthlyRate}
                            onChange={(e) => setEditFormData((prev) => ({ ...prev, finalMonthlyRate: e.target.value }))}
                            className="bg-black border-gray-800"
                          />
                        </div>
                      )}
                      {editFormData.paymentType === "weekly" && (
                        <div className="space-y-2">
                          <Label>Final Weekly Rate (₹)</Label>
                          <Input
                            type="number"
                            placeholder="Final weekly rate"
                            value={editFormData.finalWeeklyRate}
                            onChange={(e) => setEditFormData((prev) => ({ ...prev, finalWeeklyRate: e.target.value }))}
                            className="bg-black border-gray-800"
                          />
                        </div>
                      )}
                    </div>

                    {/* Final Services */}
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <Label>Final Services</Label>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={addFinalService}
                          className="flex items-center space-x-2"
                        >
                          <Plus className="h-4 w-4" />
                          <span>Add Service</span>
                        </Button>
                      </div>
                      {editFormData.finalServices.map((service, index) => (
                        <div key={index} className="flex items-center space-x-2">
                          <Input
                            placeholder="Service name"
                            value={service.name}
                            onChange={(e) => updateFinalService(index, "name", e.target.value)}
                            className="bg-black border-gray-800"
                          />
                          <Input
                            type="number"
                            placeholder="Additional Price"
                            value={service.price || ""}
                            onChange={(e) => updateFinalService(index, "price", Number.parseFloat(e.target.value) || 0)}
                            className="bg-black border-gray-800 w-32"
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeFinalService(index)}
                            className="text-red-400 hover:text-red-300"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                /* Normal Payment Structure */
                <div className="space-y-4">
                  {/* Regular Rate Fields */}
                  <div className="grid grid-cols-2 gap-4">
                    {editFormData.paymentType === "monthly" && (
                      <div className="space-y-2">
                        <Label>Monthly Rate (₹)</Label>
                        <Input
                          type="number"
                          placeholder="Monthly rate"
                          value={editFormData.monthlyRate}
                          onChange={(e) => setEditFormData((prev) => ({ ...prev, monthlyRate: e.target.value }))}
                          className="bg-black border-gray-800"
                        />
                      </div>
                    )}
                    {editFormData.paymentType === "weekly" && (
                      <div className="space-y-2">
                        <Label>Weekly Rate (₹)</Label>
                        <Input
                          type="number"
                          placeholder="Weekly rate"
                          value={editFormData.weeklyRate}
                          onChange={(e) => setEditFormData((prev) => ({ ...prev, weeklyRate: e.target.value }))}
                          className="bg-black border-gray-800"
                        />
                      </div>
                    )}
                  </div>

                  {/* Services */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <Label>Services</Label>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={addService}
                        className="flex items-center space-x-2"
                      >
                        <Plus className="h-4 w-4" />
                        <span>Add Service</span>
                      </Button>
                    </div>
                    {editFormData.services.map((service, index) => (
                      <div key={index} className="flex items-center space-x-2">
                        <Input
                          placeholder="Service name"
                          value={service.name}
                          onChange={(e) => updateService(index, "name", e.target.value)}
                          className="bg-black border-gray-800"
                        />
                        <Input
                          type="number"
                          placeholder="Additional Price"
                          value={service.price || ""}
                          onChange={(e) => updateService(index, "price", Number.parseFloat(e.target.value) || 0)}
                          className="bg-black border-gray-800 w-32"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeService(index)}
                          className="text-red-400 hover:text-red-300"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>

                  {/* Per-Post Rates */}
                  {editFormData.paymentType === "per-post" && (
                    <div className="space-y-4">
                      <Label className="text-lg font-medium mb-2 block">Per Post Rates (₹)</Label>
                      <p className="text-sm text-gray-400 mb-4">
                        Set the rate for each type of post. The client will be billed based on the number of posts created each month.
                      </p>
                      
                      {/* Default post types */}
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        {postTypes.map((postType) => (
                          <div key={postType} className="flex items-center space-x-2 border border-gray-800 rounded-md p-3">
                            <Label className="text-sm flex-1">{postType}</Label>
                            <div className="relative">
                              <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">₹</span>
                              <Input
                                type="number"
                                placeholder="0"
                                value={editFormData.perPostRates[postType] || ""}
                                onChange={(e) => handlePerPostRateChange(postType, e.target.value)}
                                className="bg-black border-gray-800 w-24 pl-7"
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                      
                      {/* Custom post types */}
                      {editFormData.customPostTypes.length > 0 && (
                        <div className="mt-4">
                          <Label className="text-base font-medium mb-2 block">Custom Post Types</Label>
                          <div className="space-y-3">
                            {editFormData.customPostTypes.map((postType, index) => (
                              <div key={index} className="flex items-center space-x-2 border border-gray-800 rounded-md p-3">
                                <Input
                                  placeholder="Custom post type"
                                  value={postType}
                                  onChange={(e) => updateCustomPostType(index, e.target.value)}
                                  className="bg-black border-gray-800 flex-1"
                                />
                                <div className="relative flex-shrink-0">
                                  <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">₹</span>
                                  <Input
                                    type="number"
                                    placeholder="0"
                                    value={editFormData.perPostRates[postType] || ""}
                                    onChange={(e) => handlePerPostRateChange(postType, e.target.value)}
                                    className="bg-black border-gray-800 w-24 pl-7"
                                  />
                                </div>
                                <Button
                                  type="button"
                                  variant="destructive"
                                  size="sm"
                                  onClick={() => removeCustomPostType(index)}
                                  className="flex-shrink-0"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {/* Add custom post type button */}
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={addCustomPostType}
                        className="mt-4 border-blue-600 text-blue-400 hover:bg-blue-900/20"
                      >
                        <Plus className="h-4 w-4 mr-2" /> Add Custom Post Type
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={editFormData.notes}
                onChange={(e) => setEditFormData((prev) => ({ ...prev, notes: e.target.value }))}
                className="bg-black border-gray-800"
                placeholder="Additional notes..."
                rows={3}
              />
            </div>
          </div>

          <DialogFooter className="flex justify-between">
            <div></div>
            <div className="flex space-x-2">
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
            </div>
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

      {/* Archive Client Confirmation Dialog */}
      <Dialog open={showArchiveDialog} onOpenChange={setShowArchiveDialog}>
        <DialogContent className="bg-gray-800 border-gray-700">
          <DialogHeader>
            <DialogTitle className="text-white">Archive Client</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-gray-300 mb-4">
              Are you sure you want to archive <span className="font-semibold text-white">{client?.name}</span>?
            </p>
            <div className="bg-amber-900/20 border border-amber-700 rounded-lg p-3">
              <h4 className="text-amber-400 font-medium mb-2">What happens when you archive:</h4>
              <ul className="text-amber-300 text-sm space-y-1">
                <li>• Won't appear in upcoming payments</li>
                <li>• Hidden from active client lists</li>
                <li>• All data (tasks, payments) is preserved</li>
                <li>• Can be unarchived anytime</li>
              </ul>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowArchiveDialog(false)}
              className="border-gray-600 text-gray-300"
            >
              Cancel
            </Button>
            <Button
              onClick={handleArchiveClient}
              className="bg-amber-600 hover:bg-amber-700 text-white"
            >
              Archive Client
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}