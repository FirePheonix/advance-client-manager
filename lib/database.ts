import { supabase, type Client, type Payment, type Task, type TeamMember, type TieredPayment, type PostCount } from "./supabase"
import { getNextPaymentDate, getNextPaymentDateWithFixedDay } from './date-utils'

// Utility function to get monthYear from next_payment date
export function getMonthYearFromDate(dateStr: string): string {
  const date = new Date(dateStr)
  return `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`
}

// Helper function to calculate current payment rate from services
export function calculateServiceRate(services: Record<string, number>): number {
  return Object.values(services).reduce((sum, price) => sum + price, 0)
}

// Helper function to get current tiered payment rate and services
// Synchronous version for backward compatibility
export function getCurrentTieredRate(tieredPayments: TieredPayment[], clientStartDate: string): { baseAmount: number; services: Record<string, number> } {
  if (!tieredPayments || tieredPayments.length === 0) {
    return { baseAmount: 0, services: {} }
  }
  
  const startDate = new Date(clientStartDate)
  const currentDate = new Date()
  const monthsPassed = Math.floor((currentDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24 * 30))
  
  let totalMonths = 0
  for (const tier of tieredPayments) {
    totalMonths += tier.duration_months
    if (monthsPassed < totalMonths) {
      return { 
        baseAmount: tier.amount, 
        services: tier.services || {} 
      }
    }
  }
  
  // If we've passed all tiers, return empty (client should transition to normal payment)
  return { baseAmount: 0, services: {} }
}

// Helper function to get current tiered payment rate and services - async version
export async function getCurrentTieredRateByPaymentCount(tieredPayments: TieredPayment[], clientId: string, clientStartDate: string): Promise<{ baseAmount: number; services: Record<string, number> }> {
  if (!tieredPayments || tieredPayments.length === 0) {
    return { baseAmount: 0, services: {} }
  }
  
  // Get current tier based on payment count
  const tierInfo = await getCurrentTierInfoWithPayments(tieredPayments, clientStartDate, clientId)
  
  // If client has completed all tiers, return empty
  if (tierInfo.isComplete) {
    return { baseAmount: 0, services: {} }
  }
  
  // Return current tier based on payment count
  const currentTier = tieredPayments[tierInfo.currentTierIndex]
  return { 
    baseAmount: currentTier.amount, 
    services: currentTier.services || {} 
  }
}

// Helper function to check if client has completed all tiers
export function hasCompletedAllTiers(tieredPayments: TieredPayment[], clientStartDate: string): boolean {
  if (!tieredPayments || tieredPayments.length === 0) return true
  
  const startDate = new Date(clientStartDate)
  const currentDate = new Date()
  const monthsPassed = Math.floor((currentDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24 * 30))
  
  const totalTierMonths = tieredPayments.reduce((sum, tier) => sum + tier.duration_months, 0)
  return monthsPassed >= totalTierMonths
}

// Helper function to calculate total payment rate (handles both tiered and normal clients)
// Payment = Base payment amount + Sum of all service prices
export function calculateTotalPaymentRate(client: Client): number {
  // Check for per-post clients
  if (client.payment_type === 'per-post') {
    // For per-post clients, we need to get the total amount from post counts
    // This is a synchronous function, but we can't do async here, so we'll return 0
    // and use calculateTotalPaymentRateAsync instead for per-post clients
    return 0;
  }
  
  // Check if client has tiered payments
  if (client.tiered_payments && client.tiered_payments.length > 0) {
    const hasCompleted = hasCompletedAllTiers(client.tiered_payments, client.created_at)
    
    if (hasCompleted) {
      // Use final payment structure - base rate + final services
      const baseRate = client.payment_type === 'monthly' 
        ? (client.final_monthly_rate || 0)
        : (client.final_weekly_rate || 0)
      return baseRate + calculateServiceRate(client.final_services || {})
    } else {
      // Use current tier - tier base amount + tier services
      const currentTier = getCurrentTieredRate(client.tiered_payments, client.created_at)
      return currentTier.baseAmount + calculateServiceRate(currentTier.services)
    }
  }
  
  // Normal payment client - base rate + services
  const baseRate = client.payment_type === 'monthly' 
    ? (client.monthly_rate || 0)
    : (client.weekly_rate || 0)
  return baseRate + calculateServiceRate(client.services)
}

// Helper function to calculate total payment rate asynchronously (for current/actual amounts)
// NOTE: For per-post clients, this returns the ACTUAL amount based on current post counts
// For PROJECTED MRR calculations, use calculateExpectedPerPostRevenue instead
export async function calculateTotalPaymentRateAsync(client: Client): Promise<number> {
  // Check for per-post clients
  if (client.payment_type === 'per-post') {
    // For per-post clients, use the next payment month if available
    const nextPaymentMonthYear = client.next_payment ? getMonthYearFromDate(client.next_payment) : undefined
    return await calculateTotalPerPostAmount(client.id, nextPaymentMonthYear);
  }
  
  // Check if client has tiered payments
  if (client.tiered_payments && client.tiered_payments.length > 0) {
    // Get payment count to determine tier
    const tierInfo = await getCurrentTierInfoWithPayments(
      client.tiered_payments, 
      client.created_at, 
      client.id
    )
    
    if (tierInfo.isComplete) {
      // Use final payment structure - base rate + final services
      const baseRate = client.payment_type === 'monthly' 
        ? (client.final_monthly_rate || 0)
        : (client.final_weekly_rate || 0)
      return baseRate + calculateServiceRate(client.final_services || {})
    } else {
      // Use current tier - tier base amount + tier services
      const currentTier = client.tiered_payments[tierInfo.currentTierIndex]
      return (currentTier.amount || 0) + calculateServiceRate(currentTier.services || {})
    }
  }
  
  // Normal payment client - base rate + services
  const baseRate = client.payment_type === 'monthly' 
    ? (client.monthly_rate || 0)
    : (client.weekly_rate || 0)
  return baseRate + calculateServiceRate(client.services)
}

// Client operations
export async function getClients() {
  const { data, error } = await supabase.from("clients").select("*").order("created_at", { ascending: false })

  if (error) throw error
  return data as Client[]
}

export async function getClientById(id: string) {
  const { data, error } = await supabase.from("clients").select("*").eq("id", id).single()

  if (error) throw error
  return data as Client
}

export async function createClient(client: Omit<Client, "id" | "created_at" | "updated_at">) {
  const { data, error } = await supabase.from("clients").insert(client).select().single()

  if (error) throw error
  return data as Client
}

export async function updateClient(id: string, updates: Partial<Client>) {
  const { data, error } = await supabase.from("clients").update(updates).eq("id", id).select().single()

  if (error) throw error
  return data as Client
}

export async function deleteClient(id: string) {
  const { error } = await supabase.from("clients").delete().eq("id", id)
  
  if (error) throw error
  return true
}

export async function renameClient(id: string, name: string) {
  const { data, error } = await supabase
    .from("clients")
    .update({ name, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single()

  if (error) throw error
  return data as Client
}

// Archive functions
export async function archiveClient(clientId: string) {
  const { data, error } = await supabase
    .from("clients")
    .update({ 
      status: 'archived',
      next_payment: '2125-01-01', // Set far future date
      updated_at: new Date().toISOString()
    })
    .eq("id", clientId)
    .select()
    .single()

  if (error) throw error
  return data as Client
}

export async function unarchiveClient(clientId: string) {
  // Calculate next reasonable payment date (next month from today)
  const today = new Date()
  const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, today.getDate())
  const nextPaymentDate = nextMonth.toISOString().split('T')[0]

  const { data, error } = await supabase
    .from("clients")
    .update({ 
      status: 'active',
      next_payment: nextPaymentDate,
      updated_at: new Date().toISOString()
    })
    .eq("id", clientId)
    .select()
    .single()

  if (error) throw error
  return data as Client
}

// Payment operations
export async function getPayments() {
  const { data, error } = await supabase
    .from("payments")
    .select(`
      *,
      clients (
        name,
        email
      )
    `)
    .order("payment_date", { ascending: false })

  if (error) throw error
  return data
}

export async function getPaymentsByClient(clientId: string) {
  const { data, error } = await supabase
    .from("payments")
    .select("*")
    .eq("client_id", clientId)
    .order("payment_date", { ascending: false })

  if (error) throw error
  return data as Payment[]
}

export async function createPayment(payment: Omit<Payment, "id" | "created_at">) {
  const { data, error } = await supabase.from("payments").insert(payment).select().single()

  if (error) throw error
  
  // If payment is completed, trigger tier transition update and next payment date update
  if (data.status === 'completed') {
    try {
      // The database trigger should handle this automatically via the trigger_tier_update_on_payment function
      // But we'll also ensure it via JavaScript
      await ensureClientPaymentRateUpToDate(data.client_id)
      
      // Update next payment date
      await updateClientNextPayment(data.client_id, data.payment_date)
    } catch (updateError) {
      console.error('Error updating client after payment:', updateError)
    }
  }
  
  return data as Payment
}

export async function checkPaymentExists(clientId: string, dueDate: string) {
  const { data, error } = await supabase
    .from('payments')
    .select('*')
    .eq('client_id', clientId)
    .gte('payment_date', new Date(dueDate).toISOString().split('T')[0])
    .lte('payment_date', new Date(dueDate).toISOString().split('T')[0])
    .eq('status', 'completed')

  if (error) {
    throw error
  }
  return data && data.length > 0
}

// Task operations
export async function getTasks() {
  const { data, error } = await supabase
    .from("tasks")
    .select(`
      *,
      clients (
        name
      )
    `)
    .order("created_at", { ascending: false })

  if (error) throw error
  return data
}

export async function getTasksByClient(clientId: string) {
  const { data, error } = await supabase
    .from("tasks")
    .select("*")
    .eq("client_id", clientId)
    .order("created_at", { ascending: false })

  if (error) throw error
  return data as Task[]
}

export async function createTask(task: Omit<Task, "id" | "created_at" | "updated_at">) {
  const { data, error } = await supabase.from("tasks").insert(task).select().single()

  if (error) throw error
  return data as Task
}

export async function updateTask(id: string, updates: Partial<Task>) {
  const { data, error } = await supabase.from("tasks").update(updates).eq("id", id).select().single()

  if (error) throw error
  return data as Task
}

// Team member operations
export async function getTeamMembers() {
  const { data, error } = await supabase.from("team_members").select("*").order("created_at", { ascending: false })

  if (error) throw error
  return data as TeamMember[]
}

export async function createTeamMember(member: Omit<TeamMember, "id" | "created_at">) {
  const { data, error } = await supabase
    .from("team_members")
    .insert(member)
    .select()
    .single()

  if (error) {
    throw new Error(error.message || "Failed to create team member")
  }
  return data as TeamMember
}

export async function updateTeamMember(id: string, updates: Partial<TeamMember>) {
  const { data, error } = await supabase
    .from("team_members")
    .update(updates)
    .eq("id", id)
    .select()
    .single()

  if (error) {
    throw new Error(error.message || "Failed to update team member")
  }
  return data as TeamMember
}

export async function deleteTeamMember(id: string) {
  const { error } = await supabase
    .from("team_members")
    .delete()
    .eq("id", id)

  if (error) {
    throw new Error(error.message || "Failed to delete team member")
  }
  return true
}

// Other expenses operations
export async function getOtherExpenses() {
  const { data, error } = await supabase
    .from("other_expenses")
    .select("*")
    .order("date", { ascending: false })

  if (error) throw error
  return data
}

export async function createOtherExpense(expense: {
  title: string
  amount: number
  date: string
  description?: string | null
}) {
  const { data, error } = await supabase
    .from("other_expenses")
    .insert({
      title: expense.title.trim(),
      amount: expense.amount,
      date: expense.date,
      description: expense.description || null
    })
    .select()
    .single()

  if (error) {
    console.error("Supabase error:", error)
    throw new Error("Failed to create expense")
  }
  
  return data
}

export async function updateOtherExpense(id: string, updates: {
  title?: string
  amount?: number
  date?: string
  description?: string | null
}) {
  const { data, error } = await supabase
    .from("other_expenses")
    .update(updates)
    .eq("id", id)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function deleteOtherExpense(id: string) {
  const { error } = await supabase
    .from("other_expenses")
    .delete()
    .eq("id", id)

  if (error) throw error
  return true
}

// Analytics functions
export async function getDashboardStats() {
  // Get current month start and end dates properly
  const now = new Date()
  const currentYear = now.getFullYear()
  const currentMonth = now.getMonth() // 0-based month

  // First day of current month
  const monthStart = new Date(currentYear, currentMonth, 1)
  const monthStartStr = monthStart.toISOString().split("T")[0]

  // First day of next month (to use as exclusive end date)
  const nextMonth = new Date(currentYear, currentMonth + 1, 1)
  const nextMonthStr = nextMonth.toISOString().split("T")[0]

  const { data: monthlyPayments, error: paymentsError } = await supabase
    .from("payments")
    .select("amount")
    .eq("status", "completed")
    .gte("payment_date", monthStartStr)
    .lt("payment_date", nextMonthStr)

  if (paymentsError) throw paymentsError

  const monthlyRevenue = monthlyPayments?.reduce((sum, p) => sum + Number(p.amount), 0) || 0

  // Get active clients count
  const { count: activeClients, error: clientsError } = await supabase
    .from("clients")
    .select("*", { count: "exact", head: true })
    .eq("status", "active")

  if (clientsError) throw clientsError

  // Get pending payments
  const { data: pendingPayments, error: pendingError } = await supabase
    .from("payments")
    .select("amount")
    .eq("status", "pending")

  if (pendingError) throw pendingError

  const pendingAmount = pendingPayments?.reduce((sum, p) => sum + Number(p.amount), 0) || 0

  // Get total expenses (team salaries)
  const { data: teamMembers, error: teamError } = await supabase
    .from("team_members")
    .select("salary")
    .eq("status", "active")

  if (teamError) throw teamError

  const monthlyExpenses = teamMembers?.reduce((sum, m) => sum + Number(m.salary), 0) || 0

  // Calculate projected MRR (total expected revenue from all active clients)
  const projectedMRR = await getProjectedMRR()

  return {
    monthlyRevenue, // Actual completed payments this month
    projectedMRR, // Total expected monthly revenue from all active clients
    activeClients: activeClients || 0,
    pendingAmount,
    monthlyExpenses,
    profitMargin: projectedMRR > 0 ? ((projectedMRR - monthlyExpenses) / projectedMRR) * 100 : 0,
  }
}

export async function getRecentActivity() {
  const { data, error } = await supabase
    .from("payments")
    .select(`
      *,
      clients (
        name
      )
    `)
    .order("created_at", { ascending: false })
    .limit(10)

  if (error) throw error

  return (
    data?.map((payment) => ({
      id: payment.id,
      type: payment.type,
      message:
        payment.type === "payment"
          ? `Payment ${payment.status} from ${payment.clients?.name}`
          : `${payment.post_count} posts completed for ${payment.clients?.name}`,
      amount: payment.type === "payment" ? `₹${payment.amount}` : null,
      time: new Date(payment.created_at).toLocaleString(),
      status: payment.status === "completed" ? "success" : payment.status === "pending" ? "warning" : "info",
    })) || []
  )
}

export async function getUpcomingPayments() {
  const today = new Date().toISOString().split("T")[0]
  const futureDate = new Date()
  futureDate.setDate(futureDate.getDate() + 30)
  const future = futureDate.toISOString().split("T")[0]

  const { data, error } = await supabase
    .from("payments")
    .select(`
      *,
      clients (
        name
      )
    `)
    .in("status", ["pending", "overdue"])
    .gte("payment_date", today)
    .lte("payment_date", future)
    .order("payment_date", { ascending: true })
    .limit(10)

  if (error) throw error

  return (
    data?.map((payment) => ({
      id: payment.id,
      client: payment.clients?.name || "Unknown",
      amount: Number(payment.amount),
      dueDate: payment.payment_date,
      status: payment.status,
      daysUntilDue: Math.ceil(
        (new Date(payment.payment_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24),
      ),
    })) || []
  )
}

// Payment date update functions
export async function updateClientNextPayment(clientId: string, currentPaymentDate: string) {
  // First, get the client to determine payment type
  const { data: client, error: clientError } = await supabase
    .from("clients")
    .select("payment_type, fixed_payment_day")
    .eq("id", clientId)
    .single()
  
  if (clientError) {
    console.error('Error getting client for payment update:', clientError)
    return null
  }
  
  // Handle per-post clients with fixed payment day differently
  if (client?.payment_type === 'per-post') {
    const fixedDay = client.fixed_payment_day || 1
    const nextPaymentDate = getNextPaymentDateWithFixedDay(fixedDay)
    
    console.log(`Updating per-post client next payment date to: ${nextPaymentDate} (fixed day: ${fixedDay})`)
    
    const { data, error } = await supabase
      .from("clients")
      .update({ 
        next_payment: nextPaymentDate,
        updated_at: new Date().toISOString()
      })
      .eq("id", clientId)
      .select()
      .single()

    if (error) {
      console.error('Error updating per-post client next payment:', error)
      throw error
    }
    return data
  }
  
  // Handle regular clients - calculate next payment date manually instead of using SQL function
  try {
    const nextPaymentDate = getNextPaymentDate(currentPaymentDate)
    
    const { data, error } = await supabase
      .from("clients")
      .update({ 
        next_payment: nextPaymentDate,
        updated_at: new Date().toISOString()
      })
      .eq("id", clientId)
      .select()
      .single()

    if (error) {
      console.error('Error updating client next payment:', error)
      throw error
    }
    return data
  } catch (error) {
    console.error("Error calculating next payment date:", error)
    throw error
  }
}

export async function updateTeamMemberNextPayment(memberId: string, currentPaymentDate: string) {
  const nextPaymentDate = getNextPaymentDate(currentPaymentDate)
  
  const { data, error } = await supabase
    .from("team_members")
    .update({ 
      payment_date: nextPaymentDate
    })
    .eq("id", memberId)
    .select()
    .single()

  if (error) throw error
  return data
}

// Dashboard stats functions
export async function getPaymentsByPeriod(startDate: string, endDate: string) {
  const { data, error } = await supabase
    .from("payments")
    .select("amount, payment_date, status")
    .eq("status", "completed")
    .gte("payment_date", startDate)
    .lte("payment_date", endDate)

  if (error) throw error
  return data || []
}

export async function getOtherExpensesByPeriod(startDate: string, endDate: string) {
  const { data, error } = await supabase
    .from("other_expenses")
    .select("amount, date, title")
    .gte("date", startDate)
    .lte("date", endDate)
    // Exclude salary payments to avoid double counting
    .not("title", "like", "Salary -%")

  if (error) throw error
  return data || []
}

export async function getTeamSalariesByPeriod(startDate: string, endDate: string) {
  const { data, error } = await supabase
    .from("other_expenses")
    .select("amount, date, title")
    .gte("date", startDate)
    .lte("date", endDate)
    // Only include salary payments
    .like("title", "Salary -%")

  if (error) throw error
  return data || []
}

export async function getUpcomingPaymentsPending() {
  const today = new Date().toISOString().split("T")[0]
  const futureDate = new Date()
  futureDate.setDate(futureDate.getDate() + 30)
  const future = futureDate.toISOString().split("T")[0]

  // Get clients with upcoming payments that haven't been paid yet (excluding archived)
  const { data: clients, error: clientsError } = await supabase
    .from("clients")
    .select("*")
    .neq("status", "archived") // Exclude archived clients
    .eq("status", "active")
    .not("next_payment", "is", null)
    .gte("next_payment", today)
    .lte("next_payment", future)

  if (clientsError) throw clientsError

  // Check which clients haven't been paid yet
  const pendingPayments = []
  
  for (const client of clients || []) {
    const paymentExists = await checkPaymentExists(client.id, client.next_payment!)
    
    if (!paymentExists) {
      // Calculate payment rate using async method for accuracy
      const amount = await calculateTotalPaymentRateAsync(client)

      pendingPayments.push({
        client_id: client.id,
        client_name: client.name,
        amount: amount,
        due_date: client.next_payment
      })
    }
  }

  return pendingPayments
}

export async function getUpcomingTeamPaymentsPending() {
  const today = new Date()
  
  // Get all active team members
  const { data: teamMembers, error } = await supabase
    .from("team_members")
    .select("id, name, salary, payment_date")
    .eq("status", "active")

  if (error) throw error

  const pendingPayments = []

  for (const member of teamMembers || []) {
    // Parse payment_date and calculate next payment
    const paymentDate = new Date(member.payment_date)
    const paymentDay = paymentDate.getDate()
    
    // Create a date for this month's payment
    const thisMonthPayment = new Date(today.getFullYear(), today.getMonth(), paymentDay)
    
    // If today is past this month's payment date, look at next month
    const nextPaymentDate = today > thisMonthPayment 
      ? new Date(today.getFullYear(), today.getMonth() + 1, paymentDay)
      : thisMonthPayment

    // Check if payment is due within next 7 days
    const daysUntilDue = Math.ceil(
      (nextPaymentDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
    )

    if (daysUntilDue <= 7 && daysUntilDue >= 0) {
      // Check if this payment has already been made
      const monthStart = new Date(nextPaymentDate.getFullYear(), nextPaymentDate.getMonth(), 1)
      const monthEnd = new Date(nextPaymentDate.getFullYear(), nextPaymentDate.getMonth() + 1, 0)
      
      const { data: expenses } = await supabase
        .from("other_expenses")
        .select("*")
        .like("title", `Salary - ${member.name}`)
        .gte("date", monthStart.toISOString().split("T")[0])
        .lte("date", monthEnd.toISOString().split("T")[0])

      // If no salary payment found for this month, add to pending
      if (!expenses || expenses.length === 0) {
        pendingPayments.push({
          member_id: member.id,
          member_name: member.name,
          amount: member.salary,
          due_date: nextPaymentDate.toISOString().split("T")[0]
        })
      }
    }
  }

  return pendingPayments
}

// Advanced analytics functions
export async function getPaymentsGroupedByTime(range: 'day' | 'week' | 'month' = 'month', limit = 12) {
  // Determine the date truncation based on range
  const dateTrunc = range === 'day' ? 'day' : range === 'week' ? 'week' : 'month'
  
  const { data, error } = await supabase.rpc('get_payments_by_time_period', {
    date_trunc: dateTrunc,
    limit_count: limit
  })

  if (error) throw error
  return data as Array<{
    period: string
    total_amount: number
    completed_amount: number
    pending_amount: number
    overdue_amount: number
  }>
}

export async function getPaymentStats() {
  const { data, error } = await supabase.rpc('get_payment_stats')

  if (error) throw error
  return data as {
    total_revenue: number
    completed_revenue: number
    pending_revenue: number
    overdue_revenue: number
    avg_payment: number
    payment_count: number
  }
}

export async function getRevenueTrends(period: 'week' | 'month' | 'quarter' | 'year' = 'month') {
  const { data, error } = await supabase.rpc('get_revenue_trends', {
    period_type: period
  })

  if (error) throw error
  return data as {
    current_period: string
    current_amount: number
    previous_period: string
    previous_amount: number
    percentage_change: number
  }[]
}

export async function getClientPaymentDistribution(limit = 10) {
  const { data, error } = await supabase
    .from('payments')
    .select(`
      amount,
      status,
      clients (
        id,
        name
      )
    `)
    .order('amount', { ascending: false })
    .limit(limit)

  if (error) throw error
  
  // Process the data to group by client
  const clientMap = new Map<string, {
    client_id: string
    client_name: string
    total_payments: number
    completed_payments: number
    pending_payments: number
    overdue_payments: number
  }>()

  data.forEach(payment => {
    const clientInfo = payment.clients as any
    const clientId = clientInfo?.id || 'unknown'
    const clientName = clientInfo?.name || 'Unknown'
    
    if (!clientMap.has(clientId)) {
      clientMap.set(clientId, {
        client_id: clientId,
        client_name: clientName,
        total_payments: 0,
        completed_payments: 0,
        pending_payments: 0,
        overdue_payments: 0
      })
    }

    const clientData = clientMap.get(clientId)!
    clientData.total_payments += Number(payment.amount)
    
    if (payment.status === 'completed') {
      clientData.completed_payments += Number(payment.amount)
    } else if (payment.status === 'pending') {
      clientData.pending_payments += Number(payment.amount)
    } else if (payment.status === 'overdue') {
      clientData.overdue_payments += Number(payment.amount)
    }
  })

  return Array.from(clientMap.values())
}

// Post count related functions
export async function getPostCountsForClient(clientId: string, monthYear?: string) {
  // If no month specified, use current month
  const currentDate = new Date()
  const currentMonthYear = monthYear || 
    `${currentDate.getFullYear()}-${(currentDate.getMonth() + 1).toString().padStart(2, '0')}`
  
  const { data, error } = await supabase
    .from("post_counts")
    .select("*")
    .eq("client_id", clientId)
    .eq("month_year", currentMonthYear)
  
  if (error) throw error
  return data as PostCount[]
}

export async function updatePostCount(
  clientId: string, 
  platform: string, 
  count: number,
  monthYear?: string
) {
  // If no month specified, use current month
  const currentDate = new Date()
  const currentMonthYear = monthYear || 
    `${currentDate.getFullYear()}-${(currentDate.getMonth() + 1).toString().padStart(2, '0')}`
  
  // Check if a record already exists
  const { data: existingRecord } = await supabase
    .from("post_counts")
    .select("id, count")
    .eq("client_id", clientId)
    .eq("platform", platform)
    .eq("month_year", currentMonthYear)
    .single()
  
  if (existingRecord) {
    // Update existing record
    const { data, error } = await supabase
      .from("post_counts")
      .update({ 
        count: count,
        updated_at: new Date().toISOString()
      })
      .eq("id", existingRecord.id)
      .select()
      .single()
    
    if (error) throw error
    return data as PostCount
  } else {
    // Create new record
    const { data, error } = await supabase
      .from("post_counts")
      .insert({
        client_id: clientId,
        platform,
        count,
        month_year: currentMonthYear
      })
      .select()
      .single()
    
    if (error) throw error
    return data as PostCount
  }
}

export async function resetPostCounts(clientId: string, monthYear?: string) {
  // If no month specified, use current month
  const currentDate = new Date()
  const currentMonthYear = monthYear || 
    `${currentDate.getFullYear()}-${(currentDate.getMonth() + 1).toString().padStart(2, '0')}`
  
  // Get current counts before resetting (for payment record)
  const { data: currentCounts } = await supabase
    .from("post_counts")
    .select("platform, count")
    .eq("client_id", clientId)
    .eq("month_year", currentMonthYear)
  
  // Reset all post counts for the client in the current month
  const { error } = await supabase
    .from("post_counts")
    .update({ count: 0, updated_at: new Date().toISOString() })
    .eq("client_id", clientId)
    .eq("month_year", currentMonthYear)
  
  if (error) throw error
  
  // Return the previous counts before reset
  return currentCounts || []
}

export async function calculateTotalPerPostAmount(clientId: string, monthYear?: string) {
  // Get the client to get per_post_rates
  const { data: client, error: clientError } = await supabase
    .from("clients")
    .select("per_post_rates")
    .eq("id", clientId)
    .single()
  
  if (clientError) throw clientError
  
  // Get current post counts
  const postCounts = await getPostCountsForClient(clientId, monthYear)
  
  // Calculate total amount
  let totalAmount = 0
  
  postCounts.forEach(postCount => {
    const ratePerPost = client.per_post_rates?.[postCount.platform] || 0
    totalAmount += postCount.count * ratePerPost
  })
  
  return totalAmount
}

export async function createPerPostPayment(clientId: string, amount: number, postCounts: any[], monthYear?: string) {
  const today = new Date().toISOString().split('T')[0]
  
  // Convert post counts to platform breakdown
  const platformBreakdown = postCounts.reduce((acc, item) => {
    acc[item.platform] = item.count
    return acc
  }, {} as Record<string, number>)
  
  // Create payment record
  const { data, error } = await supabase
    .from("payments")
    .insert({
      client_id: clientId,
      amount,
      payment_date: today,
      status: "completed",
      description: "Per-post payment",
      type: "post",
      post_count: postCounts.reduce((sum, item) => sum + item.count, 0),
      platform_breakdown: platformBreakdown
    })
    .select()
    .single()
  
  if (error) throw error
  
  // Reset post counts for the specific month
  await resetPostCounts(clientId, monthYear)
  
  // Update client's next payment date using the consistent method
  await updateClientNextPayment(clientId, today)
  
  return data
}

// Function to calculate projected Monthly Recurring Revenue (MRR)
export async function getProjectedMRR(): Promise<number> {
  // Get all active clients (not archived)
  const { data: activeClients, error } = await supabase
    .from("clients")
    .select("*")
    .neq("status", "archived")

  if (error) throw error

  let projectedMRR = 0

  for (const client of activeClients || []) {
    if (client.payment_type === "per-post") {
      // For per-post clients, use expected revenue
      const expectedRevenue = await calculateExpectedPerPostRevenue(client.id)
      projectedMRR += expectedRevenue
    } else {
      // For monthly/weekly clients, calculate their current payment rate
      const clientRate = await calculateTotalPaymentRateAsync(client)
      
      // Convert to monthly rate if needed
      if (client.payment_type === "weekly") {
        // Convert weekly to monthly (4.33 weeks in a month on average)
        projectedMRR += clientRate * 4.33
      } else if (client.payment_type === "monthly") {
        projectedMRR += clientRate
      }
    }
  }

  return Math.round(projectedMRR)
}

// Function to calculate expected monthly revenue for per-post clients (for Projected MRR)
export async function calculateExpectedPerPostRevenue(clientId: string): Promise<number> {
  // Get the client to get per_post_rates and next_payment date
  const { data: client, error: clientError } = await supabase
    .from("clients")
    .select("per_post_rates, next_payment")
    .eq("id", clientId)
    .single()
  
  if (clientError) throw clientError
  
  if (!client.per_post_rates || !client.next_payment) return 0
  
  // Get the month-year for the next payment
  const nextPaymentMonthYear = getMonthYearFromDate(client.next_payment)
  
  // Calculate total amount based on current post counts for the next payment month
  const totalAmount = await calculateTotalPerPostAmount(clientId, nextPaymentMonthYear)
  
  return totalAmount
}

// Helper function to get current tier based on payment count
export async function getCurrentTierInfoWithPayments(
  tieredPayments: TieredPayment[],
  clientStartDate: string,
  clientId: string
): Promise<{ currentTierIndex: number; isComplete: boolean; paymentsInCurrentTier: number; totalPayments: number }> {
  if (!tieredPayments || tieredPayments.length === 0) {
    return { 
      currentTierIndex: -1, 
      isComplete: true,
      paymentsInCurrentTier: 0,
      totalPayments: 0
    }
  }
  
  // Get completed payments count for this client
  const { data: payments } = await supabase
    .from("payments")
    .select("id")
    .eq("client_id", clientId)
    .eq("status", "completed")
  
  const paymentCount = payments?.length || 0
  
  // Find current tier based on payment count
  let totalDuration = 0
  for (let i = 0; i < tieredPayments.length; i++) {
    const tier = tieredPayments[i]
    const previousTotalDuration = totalDuration
    
    // Add the current tier's duration
    totalDuration += tier.duration_months
    
    // If payment count is less than total duration, we're in this tier
    if (paymentCount < totalDuration) {
      return {
        currentTierIndex: i,
        isComplete: false,
        paymentsInCurrentTier: paymentCount - previousTotalDuration,
        totalPayments: paymentCount
      }
    }
  }
  
  // If we've reached here, all tiers are complete
  return {
    currentTierIndex: tieredPayments.length - 1,
    isComplete: true,
    paymentsInCurrentTier: 0,
    totalPayments: paymentCount
  }
}

// Alias for backward compatibility
export const getCurrentTierInfo = getCurrentTierInfoWithPayments;

// Ensure client payment rate is up to date with tier transitions
export async function ensureClientPaymentRateUpToDate(clientId: string) {
  try {
    // Get client details
    const { data: client, error: clientError } = await supabase
      .from("clients")
      .select("*")
      .eq("id", clientId)
      .single()
    
    if (clientError) throw clientError
    if (!client) return null
    
    // If client has tiered payments, check if we need to update
    if (client.tiered_payments && client.tiered_payments.length > 0) {
      const tierInfo = await getCurrentTierInfoWithPayments(
        client.tiered_payments,
        client.created_at,
        client.id
      )
      
      // If client tier index is different from what we calculated, update it
      if (client.current_tier_index !== tierInfo.currentTierIndex || 
          client.payment_count !== tierInfo.totalPayments) {
        
        const updates: Partial<Client> = {
          current_tier_index: tierInfo.currentTierIndex,
          payment_count: tierInfo.totalPayments,
          updated_at: new Date().toISOString()
        }
        
        const { data, error } = await supabase
          .from("clients")
          .update(updates)
          .eq("id", clientId)
          .select()
          .single()
        
        if (error) throw error
        return data as Client
      }
    }
    
    return null // No update needed
  } catch (error) {
    console.error("Error ensuring client payment rate is up to date:", error)
    return null
  }
}

// Update client tier based on payment count
export async function updateClientTierByPaymentCount(clientId: string) {
  return await ensureClientPaymentRateUpToDate(clientId)
}

// Force update next payment date based on payment type
export async function forceUpdateNextPaymentDate(clientId: string) {
  try {
    // Get client details
    const { data: client, error: clientError } = await supabase
      .from("clients")
      .select("*")
      .eq("id", clientId)
      .single()
    
    if (clientError) throw clientError
    if (!client) return null
    
    // Calculate next payment date using the current payment date
    const today = new Date().toISOString().split('T')[0]
    
    // Use the existing updateClientNextPayment function for consistency
    return await updateClientNextPayment(clientId, today)
  } catch (error) {
    console.error("Error updating next payment date:", error)
    return null
  }
}

// Ensure automatic tier updates for all clients
export async function ensureAutomaticTierUpdates() {
  try {
    // Get all clients with tiered payments
    const { data: clients, error } = await supabase
      .from("clients")
      .select("id, tiered_payments")
      .eq("status", "active")
      .not("tiered_payments", "is", null)
    
    if (error) throw error
    
    // Filter out clients with empty tiered_payments arrays
    const clientsWithTiers = clients?.filter(client => 
      client.tiered_payments && 
      Array.isArray(client.tiered_payments) && 
      client.tiered_payments.length > 0
    ) || []
    
    // Update each client
    const results = []
    for (const client of clientsWithTiers) {
      const result = await ensureClientPaymentRateUpToDate(client.id)
      if (result) {
        results.push(result)
      }
    }
    
    return results
  } catch (error) {
    console.error("Error in automatic tier updates:", error)
    return []
  }
}

// Alias for backward compatibility
export const updateAllTierTransitions = ensureAutomaticTierUpdates;