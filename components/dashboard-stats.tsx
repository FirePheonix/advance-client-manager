"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { DollarSign, Users, TrendingUp, Calendar } from "lucide-react"
import { getDashboardStats } from "@/lib/database"

interface DashboardStatsData {
  monthlyRevenue: number
  activeClients: number
  pendingAmount: number
  monthlyExpenses: number
  profitMargin: number
}

export function DashboardStats() {
  const [stats, setStats] = useState<DashboardStatsData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadStats() {
      try {
        const data = await getDashboardStats()
        setStats(data)
      } catch (error) {
        console.error("Error loading dashboard stats:", error)
      } finally {
        setLoading(false)
      }
    }

    loadStats()
  }, [])

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="bg-black border-gray-800">
            <CardContent className="p-6">
              <div className="animate-pulse">
                <div className="h-4 bg-gray-700 rounded w-3/4 mb-2"></div>
                <div className="h-8 bg-gray-700 rounded w-1/2"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  if (!stats) {
    return <div className="text-center text-gray-400 py-8">Failed to load dashboard statistics</div>
  }

  const statsData = [
    {
      title: "Monthly Revenue",
      value: `₹${stats.monthlyRevenue.toLocaleString()}`,
      change: "+12.5%",
      icon: DollarSign,
      color: "text-green-400",
    },
    {
      title: "Active Clients",
      value: stats.activeClients.toString(),
      change: "+3 this month",
      icon: Users,
      color: "text-blue-400",
    },
    {
      title: "Profit Margin",
      value: `${stats.profitMargin.toFixed(1)}%`,
      change: "+5.2%",
      icon: TrendingUp,
      color: "text-purple-400",
    },
    {
      title: "Pending Payments",
      value: `₹${stats.pendingAmount.toLocaleString()}`,
      change: "Awaiting payment",
      icon: Calendar,
      color: "text-orange-400",
    },
  ]

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {statsData.map((stat) => (
        <Card key={stat.title} className="bg-black border-gray-800">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-300">{stat.title}</CardTitle>
            <stat.icon className={`h-4 w-4 ${stat.color}`} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{stat.value}</div>
            <p className="text-xs text-gray-400 mt-1">{stat.change}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
