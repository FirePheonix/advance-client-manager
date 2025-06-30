import { supabase, type Client, type Payment, type Task, type TeamMember } from "./supabase"

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

// Add these new functions to your existing database.ts file

/**
 * Get payments grouped by time period for chart visualization
 * @param range - Time range to group by ('day', 'week', 'month')
 * @param limit - Number of periods to return
 */
export async function getPaymentsGroupedByTime(range: 'day' | 'week' | 'month' = 'month', limit = 12) {
  // Determine the date truncation based on range
  const dateTrunc = range === 'day' ? 'day' : range === 'week' ? 'week' : 'month';
  
  const { data, error } = await supabase.rpc('get_payments_by_time_period', {
    date_trunc: dateTrunc,
    limit_count: limit
  });

  if (error) throw error;
  return data as Array<{
    period: string;
    total_amount: number;
    completed_amount: number;
    pending_amount: number;
    overdue_amount: number;
  }>;
}

/**
 * Get payment statistics summary
 */
export async function getPaymentStats() {
  const { data, error } = await supabase.rpc('get_payment_stats');

  if (error) throw error;
  return data as {
    total_revenue: number;
    completed_revenue: number;
    pending_revenue: number;
    overdue_revenue: number;
    avg_payment: number;
    payment_count: number;
  };
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

// Add to database.ts
export async function checkPaymentExists(clientId: string, dueDate: string) {
  const { data, error } = await supabase
    .from('payments')
    .select('*')
    .eq('client_id', clientId)
    .gte('payment_date', new Date(dueDate).toISOString().split('T')[0])
    .lte('payment_date', new Date(dueDate).toISOString().split('T')[0])
    .eq('status', 'completed')
    .single();

  if (error && error.code !== 'PGRST116') { // Ignore "No rows found" error
    throw error;
  }
  return !!data;
}

/**
 * Get revenue trends comparing current vs previous period
 * @param period - Time period to compare ('week', 'month', 'quarter', 'year')
 */
export async function getRevenueTrends(period: 'week' | 'month' | 'quarter' | 'year' = 'month') {
  const { data, error } = await supabase.rpc('get_revenue_trends', {
    period_type: period
  });

  if (error) throw error;
  return data as {
    current_period: string;
    current_amount: number;
    previous_period: string;
    previous_amount: number;
    percentage_change: number;
  }[];
}

/**
 * Get client payment distribution
 */
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
    .limit(limit);

  if (error) throw error;
  
  // Process the data to group by client
  const clientMap = new Map<string, {
    client_id: string;
    client_name: string;
    total_payments: number;
    completed_payments: number;
    pending_payments: number;
    overdue_payments: number;
  }>();

  data.forEach(payment => {
    const clientId = payment.clients?.id || 'unknown';
    const clientName = payment.clients?.name || 'Unknown';
    
    if (!clientMap.has(clientId)) {
      clientMap.set(clientId, {
        client_id: clientId,
        client_name: clientName,
        total_payments: 0,
        completed_payments: 0,
        pending_payments: 0,
        overdue_payments: 0
      });
    }

    const clientData = clientMap.get(clientId)!;
    clientData.total_payments += Number(payment.amount);
    
    if (payment.status === 'completed') {
      clientData.completed_payments += Number(payment.amount);
    } else if (payment.status === 'pending') {
      clientData.pending_payments += Number(payment.amount);
    } else if (payment.status === 'overdue') {
      clientData.overdue_payments += Number(payment.amount);
    }
  });

  return Array.from(clientMap.values());
}