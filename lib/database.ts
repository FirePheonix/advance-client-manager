import { supabase, type Client, type Payment, type Task, type TeamMember } from "./supabase"
import { getNextPaymentDate } from './date-utils'

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
    .single()

  if (error && error.code !== 'PGRST116') { // Ignore "No rows found" error
    throw error
  }
  return !!data
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

  return {
    monthlyRevenue,
    activeClients: activeClients || 0,
    pendingAmount,
    monthlyExpenses,
    profitMargin: monthlyRevenue > 0 ? ((monthlyRevenue - monthlyExpenses) / monthlyRevenue) * 100 : 0,
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

  if (error) throw error
  return data
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
    .select("id, name, email, next_payment, monthly_rate, weekly_rate, payment_type")
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
      const amount = client.payment_type === "monthly" 
        ? client.monthly_rate || 0
        : client.payment_type === "weekly" 
          ? client.weekly_rate || 0
          : 0

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
    const clientId = payment.clients?.id || 'unknown'
    const clientName = payment.clients?.name || 'Unknown'
    
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