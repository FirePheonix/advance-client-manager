"use client"

import { useState, useMemo, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Calendar, Filter, DollarSign, TrendingUp, Users, Search } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { getPayments, getClients, checkPaymentExists, calculateTotalPaymentRate } from "@/lib/database"
import { Badge } from "@/components/ui/badge"
import './timeline.css'

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
            amount: calculateTotalPaymentRate(client),
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
      <div className="timeline-loading-container">
        <div className="timeline-loading-header">
          <div className="timeline-loading-title">
            <h1>Revenue Timeline</h1>
            <p>Track revenue flow across all clients over time</p>
          </div>
        </div>
        <div className="timeline-loading-grid">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="timeline-loading-card">
              <div className="timeline-loading-skeleton">
                <div className="timeline-loading-line-wide"></div>
                <div className="timeline-loading-line-narrow"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="timeline-container">
      <div className="timeline-header">
        <div className="timeline-title-section">
          <h1>Revenue Timeline</h1>
          <p>Track revenue flow across all clients over time</p>
        </div>
        <button className="export-button">
          <Filter className="h-4 w-4" />
          Export Chart
        </button>
      </div>

      {/* Summary Stats */}
      <div className="timeline-stats-grid">
        <div className="timeline-stats-card">
          <div className="timeline-stats-header">
            <h3 className="timeline-stats-title">Total Revenue</h3>
            <DollarSign className="timeline-stats-icon" />
          </div>
          <div className="timeline-stats-value">₹{totalRevenue.toLocaleString()}</div>
          <p className="timeline-stats-subtitle completed">Completed payments</p>
        </div>

        <div className="timeline-stats-card">
          <div className="timeline-stats-header">
            <h3 className="timeline-stats-title">Pending Revenue</h3>
            <Calendar className="timeline-stats-icon pending" />
          </div>
          <div className="timeline-stats-value">₹{pendingAmount.toLocaleString()}</div>
          <p className="timeline-stats-subtitle pending">Awaiting payment</p>
        </div>

        <div className="timeline-stats-card">
          <div className="timeline-stats-header">
            <h3 className="timeline-stats-title">Overdue Amount</h3>
            <TrendingUp className="timeline-stats-icon overdue" />
          </div>
          <div className="timeline-stats-value">₹{overdueAmount.toLocaleString()}</div>
          <p className="timeline-stats-subtitle overdue">Overdue payments</p>
        </div>

        <div className="timeline-stats-card">
          <div className="timeline-stats-header">
            <h3 className="timeline-stats-title">Active Clients</h3>
            <Users className="timeline-stats-icon clients" />
          </div>
          <div className="timeline-stats-value">{uniqueClients.length}</div>
          <p className="timeline-stats-subtitle clients">Total clients</p>
        </div>
      </div>

      {/* Filters */}
      <div className="timeline-filters">
        <div className="timeline-search-container">
          <Search className="timeline-search-icon" />
          <input
            type="text"
            placeholder="Search by client, type, or status..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="timeline-search-input"
          />
        </div>

        <select 
          value={clientFilter} 
          onChange={(e) => setClientFilter(e.target.value)}
          className="timeline-select"
        >
          <option value="all">All Clients</option>
          {uniqueClients.map((client) => (
            <option key={client} value={client}>
              {client}
            </option>
          ))}
        </select>

        <select 
          value={statusFilter} 
          onChange={(e) => setStatusFilter(e.target.value)}
          className="timeline-select"
        >
          <option value="all">All Status</option>
          <option value="completed">Completed</option>
          <option value="pending">Pending</option>
          <option value="overdue">Overdue</option>
        </select>
      </div>

      {/* Chart */}
      <div className="timeline-chart-card">
        <div className="timeline-chart-header">
          <h2 className="timeline-chart-title">
            <TrendingUp className="h-5 w-5" />
            Revenue Timeline Chart ({filteredData.length} payments)
          </h2>
        </div>
        <div className="timeline-chart-content">
          <div className="relative">
            <svg width={chartWidth} height={chartHeight} className="timeline-chart-svg">
              {/* Grid lines */}
              {yGridLines.map((line, i) => (
                <g key={i}>
                  <line
                    x1={padding.left}
                    y1={line.y}
                    x2={chartWidth - padding.right}
                    y2={line.y}
                    stroke="#d9d9d9"
                    strokeWidth="1"
                    strokeDasharray="2,2"
                  />
                  <text x={padding.left - 10} y={line.y + 4} fill="#8c8c8c" fontSize="12" textAnchor="end">
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
                  fill="#8c8c8c"
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
                  stroke="#1890ff"
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
                    fill="#1890ff"
                    stroke="#fff"
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
                        fill="#ffffff"
                        stroke="#d9d9d9"
                        rx="4"
                      />
                      <text
                        x={point.x}
                        y={point.y - 35}
                        fill="#262626"
                        fontSize="12"
                        textAnchor="middle"
                        fontWeight="bold"
                      >
                        {formatDate(new Date(point.date))}
                      </text>
                      <text
                        x={point.x}
                        y={point.y - 20}
                        fill="#1890ff"
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
                stroke="#bfbfbf"
                strokeWidth="2"
              />
              <line
                x1={padding.left}
                y1={chartHeight - padding.bottom}
                x2={chartWidth - padding.right}
                y2={chartHeight - padding.bottom}
                stroke="#bfbfbf"
                strokeWidth="2"
              />

              {/* Axis labels */}
              <text
                x={chartWidth / 2}
                y={chartHeight - 10}
                fill="#8c8c8c"
                fontSize="14"
                textAnchor="middle"
                fontWeight="bold"
              >
                Date
              </text>
              <text
                x={20}
                y={chartHeight / 2}
                fill="#8c8c8c"
                fontSize="14"
                textAnchor="middle"
                fontWeight="bold"
                transform={`rotate(-90, 20, ${chartHeight / 2})`}
              >
                Revenue (₹)
              </text>
            </svg>
          </div>
        </div>
      </div>

      {/* Pending Revenue Section */}
      <div className="timeline-payment-card">
        <div className="timeline-payment-header">
          <h2 className="timeline-payment-title">
            <Calendar className="h-5 w-5" />
            Pending Revenue ({filteredPendingPayments.length})
          </h2>
        </div>
        <div className="timeline-payment-content">
          <div className="timeline-payment-list">
            {filteredPendingPayments
              .sort((a, b) => a.daysUntilDue - b.daysUntilDue)
              .map((payment) => (
                <div key={payment.id} className="timeline-payment-item">
                  <div className="timeline-payment-left">
                    <p className="timeline-payment-client">{payment.client}</p>
                    <p className="timeline-payment-date">Due: {payment.dueDate}</p>
                  </div>
                  <div className="timeline-payment-right">
                    <p className="timeline-payment-amount pending">₹{payment.amount.toLocaleString()}</p>
                    <span className="timeline-payment-badge pending">
                      Due in {payment.daysUntilDue}d
                    </span>
                  </div>
                </div>
              ))}
            
            {filteredPendingPayments.length === 0 && (
              <div className="timeline-empty-state">
                No pending payments
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Overdue Revenue Section */}
      <div className="timeline-payment-card">
        <div className="timeline-payment-header">
          <h2 className="timeline-payment-title">
            <Calendar className="h-5 w-5" />
            Overdue Revenue ({filteredOverduePayments.length})
          </h2>
        </div>
        <div className="timeline-payment-content">
          <div className="timeline-payment-list">
            {filteredOverduePayments
              .sort((a, b) => a.daysUntilDue - b.daysUntilDue) // Most overdue first (most negative)
              .map((payment) => (
                <div key={payment.id} className="timeline-payment-item">
                  <div className="timeline-payment-left">
                    <p className="timeline-payment-client">{payment.client}</p>
                    <p className="timeline-payment-date">Due: {payment.dueDate}</p>
                  </div>
                  <div className="timeline-payment-right">
                    <p className="timeline-payment-amount overdue">₹{payment.amount.toLocaleString()}</p>
                    <span className="timeline-payment-badge overdue">
                      Overdue by {Math.abs(payment.daysUntilDue)}d
                    </span>
                  </div>
                </div>
              ))}
            
            {filteredOverduePayments.length === 0 && (
              <div className="timeline-empty-state">
                No overdue payments
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Client Breakdown */}
      <div className="timeline-client-card">
        <div className="timeline-client-header">
          <h2 className="timeline-client-title">Client Revenue Breakdown</h2>
        </div>
        <div className="timeline-client-content">
          <div className="timeline-client-grid">
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
                <div key={client} className="timeline-client-item">
                  <div className="timeline-client-header-section">
                    <div className="timeline-client-color" style={{ backgroundColor: clientColor }}></div>
                    <div className="timeline-client-info">
                      <h4>{client}</h4>
                      <p>{totalPayments} payments</p>
                    </div>
                  </div>
                  
                  <div className="timeline-client-stats">
                    <div className="timeline-client-stat">
                      <span className="timeline-client-stat-label">Paid:</span>
                      <span className="timeline-client-stat-value paid">₹{clientRevenue.toLocaleString()}</span>
                    </div>
                    <div className="timeline-client-stat">
                      <span className="timeline-client-stat-label">Pending:</span>
                      <span className="timeline-client-stat-value pending">₹{pendingAmount.toLocaleString()}</span>
                    </div>
                    <div className="timeline-client-stat">
                      <span className="timeline-client-stat-label">Overdue:</span>
                      <span className="timeline-client-stat-value overdue">₹{overdueAmount.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}