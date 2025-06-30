import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Supabase environment variables are not set. Check .env file.');
}

export const supabase = createClient(supabaseUrl, supabaseKey);

// Database types
export interface Client {
  id: string
  name: string
  email: string
  phone?: string
  company?: string
  payment_type: "monthly" | "weekly" | "per-post"
  monthly_rate?: number
  weekly_rate?: number
  next_payment?: string
  status: "active" | "inactive" | "pending"
  services: string[]
  per_post_rates?: Record<string, number>
  notes?: string
  created_at: string
  updated_at: string
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