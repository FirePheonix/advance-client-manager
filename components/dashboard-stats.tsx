"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { IndianRupee , TrendingUp, Calendar, AlertCircle } from "lucide-react"
import { 
  getPaymentsByPeriod, 
  getOtherExpensesByPeriod, 
  getTeamSalariesByPeriod,
  getUpcomingPaymentsPending,
  getUpcomingTeamPaymentsPending,
  getDashboardStats,
  getProjectedMRR
} from "@/lib/database"

interface DashboardStatsData {
  totalRevenue: number
  totalOtherExpenses: number
  totalTeamSalaries: number
  netExpenses: number // Revenue - (OtherExpenses + TeamSalaries)
  profitPercentage: number
  pendingClientPayments: number
  pendingTeamPayments: number
  totalPendingPayments: number
  projectedMRR: number // Projected Monthly Recurring Revenue from backend
}

type ViewMode = 'year' | 'month'

export function DashboardStats() {
  const [stats, setStats] = useState<DashboardStatsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState<ViewMode>('month')
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1) // 1-based month
  const [availableYears, setAvailableYears] = useState<number[]>([])

  // Generate available years (current year and 2 years back)
  useEffect(() => {
    const currentYear = new Date().getFullYear()
    const years = [currentYear - 2, currentYear - 1, currentYear, currentYear + 1]
    setAvailableYears(years)
  }, [])

  useEffect(() => {
    loadStats()
  }, [viewMode, selectedYear, selectedMonth])

  async function loadStats() {
    try {
      setLoading(true)
      
      let startDate: string
      let endDate: string
      let previousStartDate: string
      let previousEndDate: string

      if (viewMode === 'year') {
        // Current period: Selected year
        startDate = `${selectedYear}-01-01`
        endDate = `${selectedYear}-12-31`
        
        // Previous period: Previous year
        previousStartDate = `${selectedYear - 1}-01-01`
        previousEndDate = `${selectedYear - 1}-12-31`
      } else {
        // Current period: Selected month of selected year
        const daysInMonth = new Date(selectedYear, selectedMonth, 0).getDate()
        startDate = `${selectedYear}-${selectedMonth.toString().padStart(2, '0')}-01`
        endDate = `${selectedYear}-${selectedMonth.toString().padStart(2, '0')}-${daysInMonth}`
        
        // Previous period: Previous month (handling year rollover)
        const prevMonth = selectedMonth === 1 ? 12 : selectedMonth - 1
        const prevYear = selectedMonth === 1 ? selectedYear - 1 : selectedYear
        const daysInPrevMonth = new Date(prevYear, prevMonth, 0).getDate()
        
        previousStartDate = `${prevYear}-${prevMonth.toString().padStart(2, '0')}-01`
        previousEndDate = `${prevYear}-${prevMonth.toString().padStart(2, '0')}-${daysInPrevMonth}`
      }

      // Get current month for the projected MRR calculation
      const currentDate = new Date()
      const currentMonthStart = `${currentDate.getFullYear()}-${(currentDate.getMonth() + 1).toString().padStart(2, '0')}-01`
      const currentMonthEnd = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0)
        .toISOString().split('T')[0]

      // Fetch current period data
      const [
        currentRevenue,
        currentOtherExpenses,
        currentTeamSalaries,
        previousRevenue,
        previousOtherExpenses,
        previousTeamSalaries,
        pendingClientPayments,
        pendingTeamPayments,
        projectedMRRValue
      ] = await Promise.all([
        getPaymentsByPeriod(startDate, endDate),
        getOtherExpensesByPeriod(startDate, endDate),
        getTeamSalariesByPeriod(startDate, endDate),
        getPaymentsByPeriod(previousStartDate, previousEndDate),
        getOtherExpensesByPeriod(previousStartDate, previousEndDate),
        getTeamSalariesByPeriod(previousStartDate, previousEndDate),
        getUpcomingPaymentsPending(),
        getUpcomingTeamPaymentsPending(),
        getProjectedMRR()
      ])

      // Calculate current period metrics
      const totalRevenue = currentRevenue.reduce((sum, payment) => sum + Number(payment.amount), 0)
      const totalOtherExpenses = currentOtherExpenses.reduce((sum, expense) => sum + Number(expense.amount), 0)
      const totalTeamSalaries = currentTeamSalaries.reduce((sum, salary) => sum + Number(salary.amount), 0)
      const netExpenses = totalRevenue - (totalOtherExpenses + totalTeamSalaries)

      // Calculate previous period metrics for comparison
      const prevTotalRevenue = previousRevenue.reduce((sum, payment) => sum + Number(payment.amount), 0)
      const prevTotalOtherExpenses = previousOtherExpenses.reduce((sum, expense) => sum + Number(expense.amount), 0)
      const prevTotalTeamSalaries = previousTeamSalaries.reduce((sum, salary) => sum + Number(salary.amount), 0)
      const prevNetExpenses = prevTotalRevenue - (prevTotalOtherExpenses + prevTotalTeamSalaries)

      // Calculate profit percentage change
      let profitPercentage = 0
      if (prevNetExpenses !== 0) {
        profitPercentage = ((netExpenses - prevNetExpenses) / Math.abs(prevNetExpenses)) * 100
      } else if (netExpenses > 0) {
        profitPercentage = 100 // 100% increase from zero
      }

      // Calculate pending payments
      const pendingClientAmount = pendingClientPayments.reduce((sum, payment) => sum + Number(payment.amount), 0)
      const pendingTeamAmount = pendingTeamPayments.reduce((sum, payment) => sum + Number(payment.amount), 0)

      // Use the backend calculated projected MRR
      const projectedMRR = projectedMRRValue

      const statsData: DashboardStatsData = {
        totalRevenue,
        totalOtherExpenses,
        totalTeamSalaries,
        netExpenses,
        profitPercentage,
        pendingClientPayments: pendingClientAmount,
        pendingTeamPayments: pendingTeamAmount,
        totalPendingPayments: pendingClientAmount + pendingTeamAmount,
        projectedMRR
      }

      setStats(statsData)
    } catch (error) {
      console.error("Error loading dashboard stats:", error)
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', { 
      style: 'currency', 
      currency: 'INR',
      maximumFractionDigits: 0 
    }).format(amount)
  }

  const formatPercentage = (percentage: number) => {
    const sign = percentage >= 0 ? '+' : ''
    return `${sign}${percentage.toFixed(1)}%`
  }

  const getPeriodDisplayText = () => {
    if (viewMode === 'year') {
      return `Year ${selectedYear}`
    } else {
      const monthNames = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
      ]
      return `${monthNames[selectedMonth - 1]} ${selectedYear}`
    }
  }

  const getPreviousPeriodText = () => {
    if (viewMode === 'year') {
      return `vs ${selectedYear - 1}`
    } else {
      const prevMonth = selectedMonth === 1 ? 12 : selectedMonth - 1
      const prevYear = selectedMonth === 1 ? selectedYear - 1 : selectedYear
      const monthNames = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
      ]
      return `vs ${monthNames[prevMonth - 1]} ${prevYear}`
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        {/* Period Selector Skeleton */}
        <div className="flex items-center justify-between">
          <div className="h-6 bg-gray-700 rounded w-48 animate-pulse"></div>
          <div className="flex space-x-4">
            <div className="h-10 bg-gray-700 rounded w-20 animate-pulse"></div>
            <div className="h-10 bg-gray-700 rounded w-32 animate-pulse"></div>
          </div>
        </div>
        
        {/* Stats Cards Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
          {[1, 2, 3, 4, 5].map((i) => (
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
      </div>
    )
  }

  if (!stats) {
    return <div className="text-center text-gray-400 py-8">Failed to load dashboard statistics</div>
  }

  const statsData = [
    {
      title: "Projected MRR",
      value: formatCurrency(stats.projectedMRR),
      change: `Net Monthly Recurring Revenue`,
      icon: TrendingUp,
      color: stats.projectedMRR >= 0 ? "text-green-400" : "text-red-400",
      description: "Expected Client Payments - Expected Team Payments for current month"
    },
    {
      title: "Net Result",
      value: formatCurrency(stats.netExpenses),
      change: `${formatPercentage(stats.profitPercentage)} ${getPreviousPeriodText()}`,
      icon: IndianRupee,
      color: stats.netExpenses >= 0 ? "text-green-400" : "text-red-400",
      description: "Revenue - Total Expenses"
    },
    {
      title: "Total Revenue",
      value: formatCurrency(stats.totalRevenue),
      change: `From client payments`,
      icon: TrendingUp,
      color: "text-blue-400",
      description: "Income from all clients"
    },
    {
      title: "Total Expenses",
      value: formatCurrency(stats.totalOtherExpenses + stats.totalTeamSalaries),
      change: `Other: ${formatCurrency(stats.totalOtherExpenses)} | Salaries: ${formatCurrency(stats.totalTeamSalaries)}`,
      icon: AlertCircle,
      color: "text-orange-400",
      description: "Other expenses + Team salaries"
    },
    {
      title: "Pending Payments",
      value: formatCurrency(stats.totalPendingPayments),
      change: `Clients: ${formatCurrency(stats.pendingClientPayments)} | Team: ${formatCurrency(stats.pendingTeamPayments)}`,
      icon: Calendar,
      color: "text-yellow-400",
      description: "Awaiting payments"
    },
  ]

  return (
    <div className="space-y-6">
      {/* Period Selector */}
      <div className="flex items-center justify-between">
        <div className="text-lg font-medium text-white">
          Statistics for {getPeriodDisplayText()}
        </div>
        <div className="flex items-center space-x-4">
          {/* View Mode Toggle */}
          <div className="flex space-x-2">
            <Button
              size="sm"
              variant={viewMode === 'month' ? 'default' : 'outline'}
              onClick={() => setViewMode('month')}
              className={viewMode === 'month' ? 'bg-white text-black' : 'border-gray-600 text-gray-300'}
            >
              Month
            </Button>
            <Button
              size="sm"
              variant={viewMode === 'year' ? 'default' : 'outline'}
              onClick={() => setViewMode('year')}
              className={viewMode === 'year' ? 'bg-white text-black' : 'border-gray-600 text-gray-300'}
            >
              Year
            </Button>
          </div>

          {/* Year Selector */}
          <Select
            value={selectedYear.toString()}
            onValueChange={(value) => setSelectedYear(parseInt(value))}
          >
            <SelectTrigger className="w-24 bg-gray-800 border-gray-600 text-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {availableYears.map((year) => (
                <SelectItem key={year} value={year.toString()}>
                  {year}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Month Selector (only for month view) */}
          {viewMode === 'month' && (
            <Select
              value={selectedMonth.toString()}
              onValueChange={(value) => setSelectedMonth(parseInt(value))}
            >
              <SelectTrigger className="w-32 bg-gray-800 border-gray-600 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Array.from({ length: 12 }, (_, i) => i + 1).map((month) => (
                  <SelectItem key={month} value={month.toString()}>
                    {new Date(2024, month - 1).toLocaleDateString('en', { month: 'long' })}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
        {statsData.map((stat) => (
          <Card key={stat.title} className="bg-black border-gray-800">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-300">{stat.title}</CardTitle>
              <stat.icon className={`h-4 w-4 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">{stat.value}</div>
              <p className="text-xs text-gray-400 mt-1" title={stat.description}>
                {stat.change}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
