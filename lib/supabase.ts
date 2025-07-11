import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Supabase environment variables are not set. Check .env file.');
}

export const supabase = createClient(supabaseUrl, supabaseKey);

// Database types
export interface TieredPayment {
  amount: number // Base amount for this tier
  duration_months: number
  payment_type: "monthly" | "weekly"
  services: Record<string, number> // Services specific to this tier
}

export interface Client {
  id: string
  name: string
  email: string
  phone?: string
  company?: string
  company_address?: string
  gst_number?: string
  poc_phone?: string
  payment_type: "monthly" | "weekly" | "per-post"
  monthly_rate?: number // Used for normal payment clients
  weekly_rate?: number // Used for normal payment clients
  next_payment?: string
  fixed_payment_day?: number // Day of month for per-post clients (1-31)
  status: "active" | "inactive" | "pending" | "archived"
  services: Record<string, number> // Service name -> price mapping (for normal payment clients)
  per_post_rates?: Record<string, number> // Platform -> rate per post mapping
  tiered_payments: TieredPayment[] // For tiered payment clients
  // Final normal payment structure after tiers complete
  final_monthly_rate?: number
  final_weekly_rate?: number
  final_services?: Record<string, number>
  notes?: string
  created_at: string
  updated_at: string
  // Tier tracking properties
  current_tier_index?: number // Current tier the client is on (0-based)
  payment_count?: number // Number of payments made so far
}

export interface Payment {
  id: string
  client_id: string
  amount: number
  payment_date: string
  status: "completed" | "pending" | "overdue"
  description?: string
  type: "payment" | "post" | "reminder"
  post_count?: number
  platform_breakdown?: Record<string, number>
  created_at: string
}

export interface Task {
  id: string
  client_id: string
  title: string
  description?: string
  priority: "low" | "medium" | "high"
  platform: string
  start_date?: string
  end_date?: string
  assignees: string[]
  status: "todo" | "in-progress" | "review" | "completed"
  comments_count: number
  created_at: string
  updated_at: string
}

export type TeamMember = {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: string;
  salary: number;
  status: 'active' | 'inactive' | 'on_leave';
  payment_date: string; // This should be ISO string format
  notes?: string;
  created_at: string;
}

export interface OtherExpense {
  id: string
  title: string
  amount: number  // Can be negative (income) or positive (expense)
  expense_date: string
  category?: string
  description?: string
  created_at: string
  updated_at: string
}

export interface PostCount {
  id: string
  client_id: string
  platform: string
  count: number
  month_year: string // Format: YYYY-MM
  created_at: string
  updated_at: string
}