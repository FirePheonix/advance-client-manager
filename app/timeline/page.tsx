"use client"

import { useState, useMemo, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Calendar, Filter, DollarSign, TrendingUp, Users, Search } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { getPayments, getClients, checkPaymentExists } from "@/lib/database"
import { Badge } from "@/components/ui/badge"

interface TimelinePayment {
  id: string
  client: string
  clientId: string
  type: string
  amount: number
  date: string
  status: string
  daysUntilDue: number
  paymentDone: boolean
}

interface PendingPayment {
  id: string
  client: string
  clientEmail: string
  amount: number
  dueDate: string
  status: string
  daysUntilDue: number
  paymentDone: boolean
}

const clientColors = {
  "TechStart Inc.": "#3B82F6",
  "Fashion Forward": "#EC4899",
  "Local Restaurant": "#10B981",
  "E-commerce Store": "#F59E0B",
  "Digital Agency": "#8B5CF6",
}

export default function TimelinePage() {
  const [allTimelineData, setAllTimelineData] = useState<TimelinePayment[]>([])
  const [pendingPayments, setPendingPayments] = useState<PendingPayment[]>([])
  const [overduePayments, setOverduePayments] = useState<PendingPayment[]>([])
  const [clients, setClients] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [clientFilter, setClientFilter] = useState("all")
  const [statusFilter, setStatusFilter] = useState("all")
  const [searchTerm, setSearchTerm] = useState("")
  const [hoveredPoint, setHoveredPoint] = useState<any>(null)

  useEffect(() => {
    loadTimelineData()
  }, [])

  async function loadTimelineData() {
    try {
      const [paymentsData, clientsData] = await Promise.all([getPayments(), getClients()])

      // Process completed payments for timeline chart
      const timelineData = paymentsData.map((payment: any) => ({
        id: payment.id,
        client: payment.clients?.name || "Unknown Client",
        clientId: payment.client_id,
        type: payment.type,
        amount: Number(payment.amount),
        date: payment.payment_date,
        status: payment.status,
        daysUntilDue: 0,
        paymentDone: true
      }))

      // Process pending/overdue payments from clients (same logic as upcoming-payments.tsx)
      const today = new Date()
      
      const upcomingPaymentsPromises = clientsData
        .filter(client => client.next_payment)
        .map(async (client) => {
          const dueDate = new Date(client.next_payment!)
          const daysUntilDue = Math.floor((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
          
          // Check if payment already exists for this due date
          const paymentExists = await checkPaymentExists(client.id, client.next_payment!)
          
          return {
            id: client.id,
            client: client.name,
            clientEmail: client.email,
            amount: client.payment_type === "monthly" 
              ? client.monthly_rate || 0
              : client.payment_type === "weekly" 
                ? client.weekly_rate || 0
                : 0,
            dueDate: dueDate.toLocaleDateString(),
            status: paymentExists ? "paid" : (daysUntilDue < 0 ? "overdue" : "pending"),
            daysUntilDue,
            paymentDone: paymentExists
          }
        })

      // Wait for all payment status checks to complete
      const upcomingPayments = await Promise.all(upcomingPaymentsPromises)
      
      // Separate pending and overdue payments
      const pending = upcomingPayments.filter(payment => !payment.paymentDone && payment.daysUntilDue >= 0)
      const overdue = upcomingPayments.filter(payment => !payment.paymentDone && payment.daysUntilDue < 0)

      setAllTimelineData(timelineData)
      setPendingPayments(pending)
      setOverduePayments(overdue)
      setClients(clientsData)
    } catch (error) {
      console.error("Error loading timeline data:", error)
    } finally {
      setLoading(false)
    }
  }

  // Filter data based on search and filters
  const filteredData = useMemo(() => {
    return allTimelineData.filter((item) => {
      const clientMatch = clientFilter === "all" || item.client === clientFilter
      const statusMatch = statusFilter === "all" || item.status === statusFilter
      const searchMatch =
        searchTerm === "" ||
        item.client.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.type.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.status.toLowerCase().includes(searchTerm.toLowerCase())

      return clientMatch && statusMatch && searchMatch
    })
  }, [allTimelineData, clientFilter, statusFilter, searchTerm])

  // Filter pending payments based on search and filters
  const filteredPendingPayments = useMemo(() => {
    return pendingPayments.filter((item) => {
      const clientMatch = clientFilter === "all" || item.client === clientFilter
      const searchMatch =
        searchTerm === "" ||
        item.client.toLowerCase().includes(searchTerm.toLowerCase())

      return clientMatch && searchMatch
    })
  }, [pendingPayments, clientFilter, searchTerm])

  // Filter overdue payments based on search and filters
  const filteredOverduePayments = useMemo(() => {
    return overduePayments.filter((item) => {
      const clientMatch = clientFilter === "all" || item.client === clientFilter
      const searchMatch =
        searchTerm === "" ||
        item.client.toLowerCase().includes(searchTerm.toLowerCase())

      return clientMatch && searchMatch
    })
  }, [overduePayments, clientFilter, searchTerm])

  // Group data by date for chart (only completed payments)
  const chartData = useMemo(() => {
    const groupedData: { [key: string]: { date: string; total: number; clients: { [key: string]: number } } } = {}

    filteredData.forEach((item) => {
      if (item.status === "completed") {
        if (!groupedData[item.date]) {
          groupedData[item.date] = {
            date: item.date,
            total: 0,
            clients: {},
          }
        }

        groupedData[item.date].total += item.amount
        groupedData[item.date].clients[item.client] = (groupedData[item.date].clients[item.client] || 0) + item.amount
      }
    })

    return Object.values(groupedData).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
  }, [filteredData])

  // Calculate chart dimensions and scales
  const chartWidth = 1000
  const chartHeight = 400
  const padding = { top: 20, right: 20, bottom: 60, left: 80 }
  const innerWidth = chartWidth - padding.left - padding.right
  const innerHeight = chartHeight - padding.top - padding.bottom

  const maxAmount = Math.max(...chartData.map((d) => d.total), 100000)
  const minDate = chartData.length > 0 ? new Date(chartData[0].date) : new Date()
  const maxDate = chartData.length > 0 ? new Date(chartData[chartData.length - 1].date) : new Date()
  const dateRange = maxDate.getTime() - minDate.getTime()

  // Generate chart points
  const chartPoints = chartData.map((d) => {
    const x = dateRange > 0 ? ((new Date(d.date).getTime() - minDate.getTime()) / dateRange) * innerWidth : 0
    const y = innerHeight - (d.total / maxAmount) * innerHeight
    return { ...d, x: x + padding.left, y: y + padding.top }
  })

  // Generate grid lines
  const yGridLines = []
  const ySteps = 5
  for (let i = 0; i <= ySteps; i++) {
    const y = padding.top + (i / ySteps) * innerHeight
    const value = maxAmount - (i / ySteps) * maxAmount
    yGridLines.push({ y, value })
  }

  // Generate date labels
  const dateLabels = []
  const dateSteps = Math.min(10, chartData.length)
  for (let i = 0; i < dateSteps; i++) {
    const ratio = dateSteps > 1 ? i / (dateSteps - 1) : 0
    const date = new Date(minDate.getTime() + ratio * dateRange)
    const x = padding.left + ratio * innerWidth
    dateLabels.push({ x, date })
  }

  const uniqueClients = [...new Set([
    ...allTimelineData.map((item) => item.client),
    ...pendingPayments.map((item) => item.client),
    ...overduePayments.map((item) => item.client)
  ])]

  // Calculate summary stats
  const totalRevenue = filteredData
    .filter((item) => item.status === "completed")
    .reduce((sum, item) => sum + item.amount, 0)

  const pendingAmount = filteredPendingPayments
    .reduce((sum, item) => sum + item.amount, 0)

  const overdueAmount = filteredOverduePayments
    .reduce((sum, item) => sum + item.amount, 0)

  const formatCurrency = (amount: number) => {
    return `₹${(amount / 1000).toFixed(0)}K`
  }

  const formatDate = (date: Date) => {
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" })
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-white">Revenue Timeline</h1>
            <p className="text-gray-400 mt-2">Track revenue flow across all clients over time</p>
          </div>
        </div>
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
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-white">Revenue Timeline</h1>
          <p className="text-gray-400 mt-2">Track revenue flow across all clients over time</p>
        </div>
        <Button className="bg-white text-black hover:bg-gray-200">
          <Filter className="mr-2 h-4 w-4" />
          Export Chart
        </Button>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="bg-black border-gray-800">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-300">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-green-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">₹{totalRevenue.toLocaleString()}</div>
            <p className="text-xs text-green-400 mt-1">Completed payments</p>
          </CardContent>
        </Card>

        <Card className="bg-black border-gray-800">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-300">Pending Revenue</CardTitle>
            <Calendar className="h-4 w-4 text-yellow-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">₹{pendingAmount.toLocaleString()}</div>
            <p className="text-xs text-yellow-400 mt-1">Awaiting payment</p>
          </CardContent>
        </Card>

        <Card className="bg-black border-gray-800">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-300">Overdue Amount</CardTitle>
            <TrendingUp className="h-4 w-4 text-red-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">₹{overdueAmount.toLocaleString()}</div>
            <p className="text-xs text-red-400 mt-1">Overdue payments</p>
          </CardContent>
        </Card>

        <Card className="bg-black border-gray-800">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-300">Active Clients</CardTitle>
            <Users className="h-4 w-4 text-purple-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{uniqueClients.length}</div>
            <p className="text-xs text-purple-400 mt-1">Total clients</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex items-center space-x-4 flex-wrap gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Search by client, type, or status..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 bg-black border-gray-800 text-white placeholder-gray-400"
          />
        </div>

        <Select value={clientFilter} onValueChange={setClientFilter}>
          <SelectTrigger className="w-48 bg-black border-gray-800 text-white">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-black border-gray-800">
            <SelectItem value="all">All Clients</SelectItem>
            {uniqueClients.map((client) => (
              <SelectItem key={client} value={client}>
                {client}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40 bg-black border-gray-800 text-white">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-black border-gray-800">
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="overdue">Overdue</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Chart */}
      <Card className="bg-black border-gray-800">
        <CardHeader>
          <CardTitle className="text-white flex items-center">
            <TrendingUp className="mr-2 h-5 w-5" />
            Revenue Timeline Chart ({filteredData.length} payments)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative">
            <svg width={chartWidth} height={chartHeight} className="bg-gray-900 rounded-lg">
              {/* Grid lines */}
              {yGridLines.map((line, i) => (
                <g key={i}>
                  <line
                    x1={padding.left}
                    y1={line.y}
                    x2={chartWidth - padding.right}
                    y2={line.y}
                    stroke="#374151"
                    strokeWidth="1"
                    strokeDasharray="2,2"
                  />
                  <text x={padding.left - 10} y={line.y + 4} fill="#9CA3AF" fontSize="12" textAnchor="end">
                    {formatCurrency(line.value)}
                  </text>
                </g>
              ))}

              {/* Date labels */}
              {dateLabels.map((label, i) => (
                <text
                  key={i}
                  x={label.x}
                  y={chartHeight - padding.bottom + 20}
                  fill="#9CA3AF"
                  fontSize="12"
                  textAnchor="middle"
                >
                  {formatDate(label.date)}
                </text>
              ))}

              {/* Chart line */}
              {chartPoints.length > 1 && (
                <path
                  d={`M ${chartPoints.map((p) => `${p.x},${p.y}`).join(" L ")}`}
                  fill="none"
                  stroke="#10B981"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              )}

              {/* Data points */}
              {chartPoints.map((point, i) => (
                <g key={i}>
                  <circle
                    cx={point.x}
                    cy={point.y}
                    r="6"
                    fill="#10B981"
                    stroke="#000"
                    strokeWidth="2"
                    className="cursor-pointer hover:r-8 transition-all"
                    onMouseEnter={() => setHoveredPoint(point)}
                    onMouseLeave={() => setHoveredPoint(null)}
                  />

                  {/* Tooltip */}
                  {hoveredPoint === point && (
                    <g>
                      <rect
                        x={point.x - 80}
                        y={point.y - 60}
                        width="160"
                        height="50"
                        fill="#1F2937"
                        stroke="#374151"
                        rx="4"
                      />
                      <text
                        x={point.x}
                        y={point.y - 35}
                        fill="#FFFFFF"
                        fontSize="12"
                        textAnchor="middle"
                        fontWeight="bold"
                      >
                        {formatDate(new Date(point.date))}
                      </text>
                      <text
                        x={point.x}
                        y={point.y - 20}
                        fill="#10B981"
                        fontSize="14"
                        textAnchor="middle"
                        fontWeight="bold"
                      >
                        ₹{point.total.toLocaleString()}
                      </text>
                    </g>
                  )}
                </g>
              ))}

              {/* Axes */}
              <line
                x1={padding.left}
                y1={padding.top}
                x2={padding.left}
                y2={chartHeight - padding.bottom}
                stroke="#6B7280"
                strokeWidth="2"
              />
              <line
                x1={padding.left}
                y1={chartHeight - padding.bottom}
                x2={chartWidth - padding.right}
                y2={chartHeight - padding.bottom}
                stroke="#6B7280"
                strokeWidth="2"
              />

              {/* Axis labels */}
              <text
                x={chartWidth / 2}
                y={chartHeight - 10}
                fill="#9CA3AF"
                fontSize="14"
                textAnchor="middle"
                fontWeight="bold"
              >
                Date
              </text>
              <text
                x={20}
                y={chartHeight / 2}
                fill="#9CA3AF"
                fontSize="14"
                textAnchor="middle"
                fontWeight="bold"
                transform={`rotate(-90, 20, ${chartHeight / 2})`}
              >
                Revenue (₹)
              </text>
            </svg>
          </div>
        </CardContent>
      </Card>

      {/* Pending Revenue Section */}
      <Card className="bg-black border-gray-800">
        <CardHeader>
          <CardTitle className="text-white flex items-center">
            <Calendar className="mr-2 h-5 w-5" />
            Pending Revenue ({filteredPendingPayments.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredPendingPayments
              .sort((a, b) => a.daysUntilDue - b.daysUntilDue)
              .map((payment) => (
                <div key={payment.id} className="flex items-center justify-between p-3 bg-gray-900 rounded-lg">
                  <div>
                    <p className="text-white font-medium">{payment.client}</p>
                    <p className="text-gray-400 text-sm">Due: {payment.dueDate}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-yellow-400 font-medium">₹{payment.amount.toLocaleString()}</p>
                    <Badge variant="secondary" className="bg-yellow-600 text-xs mt-1">
                      Due in {payment.daysUntilDue}d
                    </Badge>
                  </div>
                </div>
              ))}
            
            {filteredPendingPayments.length === 0 && (
              <div className="text-center py-4 text-gray-400">
                No pending payments
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Overdue Revenue Section */}
      <Card className="bg-black border-gray-800">
        <CardHeader>
          <CardTitle className="text-white flex items-center">
            <Calendar className="mr-2 h-5 w-5" />
            Overdue Revenue ({filteredOverduePayments.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredOverduePayments
              .sort((a, b) => a.daysUntilDue - b.daysUntilDue) // Most overdue first (most negative)
              .map((payment) => (
                <div key={payment.id} className="flex items-center justify-between p-3 bg-gray-900 rounded-lg">
                  <div>
                    <p className="text-white font-medium">{payment.client}</p>
                    <p className="text-gray-400 text-sm">Due: {payment.dueDate}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-red-400 font-medium">₹{payment.amount.toLocaleString()}</p>
                    <Badge variant="destructive" className="bg-red-600 text-xs mt-1">
                      Overdue by {Math.abs(payment.daysUntilDue)}d
                    </Badge>
                  </div>
                </div>
              ))}
            
            {filteredOverduePayments.length === 0 && (
              <div className="text-center py-4 text-gray-400">
                No overdue payments
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Client Breakdown */}
      <Card className="bg-black border-gray-800">
        <CardHeader>
          <CardTitle className="text-white">Client Revenue Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            {uniqueClients.map((client) => {
              const clientRevenue = filteredData
                .filter((item) => item.client === client && item.status === "completed")
                .reduce((sum, item) => sum + item.amount, 0)

              const pendingAmount = filteredPendingPayments
                .filter((item) => item.client === client)
                .reduce((sum, item) => sum + item.amount, 0)

              const overdueAmount = filteredOverduePayments
                .filter((item) => item.client === client)
                .reduce((sum, item) => sum + item.amount, 0)

              const clientColor = clientColors[client as keyof typeof clientColors] || "#6B7280"

              const totalPayments = filteredData.filter((item) => item.client === client).length +
                                   filteredPendingPayments.filter((item) => item.client === client).length +
                                   filteredOverduePayments.filter((item) => item.client === client).length

              return (
                <div key={client} className="p-4 bg-gray-900 rounded-lg">
                  <div className="flex items-center space-x-3 mb-3">
                    <div className="w-4 h-4 rounded-full" style={{ backgroundColor: clientColor }}></div>
                    <div>
                      <p className="text-white font-medium text-sm">{client}</p>
                      <p className="text-gray-400 text-xs">
                        {totalPayments} payments
                      </p>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-400 text-xs">Paid:</span>
                      <span className="text-green-400 text-sm font-medium">₹{clientRevenue.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400 text-xs">Pending:</span>
                      <span className="text-yellow-400 text-sm font-medium">₹{pendingAmount.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400 text-xs">Overdue:</span>
                      <span className="text-red-400 text-sm font-medium">₹{overdueAmount.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}