import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { DollarSign, TrendingUp, Calendar, AlertCircle, Download } from "lucide-react"

const mockFinancialData = {
  monthlyRevenue: 28750,
  totalProfit: 19525,
  pendingPayments: 5200,
  expenses: 9225,
  recentTransactions: [
    { id: 1, client: "TechStart Inc.", amount: 2500, type: "income", date: "2024-01-15", status: "completed" },
    { id: 2, client: "Fashion Forward", amount: 150, type: "income", date: "2024-01-14", status: "completed" },
    { id: 3, client: "Office Rent", amount: 1200, type: "expense", date: "2024-01-01", status: "completed" },
    { id: 4, client: "Local Restaurant", amount: 1200, type: "income", date: "2024-01-20", status: "pending" },
  ],
  upcomingPayments: [
    { client: "TechStart Inc.", amount: 2500, dueDate: "2024-02-15" },
    { client: "E-commerce Store", amount: 1800, dueDate: "2024-02-20" },
    { client: "Local Restaurant", amount: 1200, dueDate: "2024-02-20" },
  ],
}

export default function FinancesPage() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-white">Finances</h1>
          <p className="text-gray-400 mt-2">Track your agency's financial performance</p>
        </div>
        <Button className="bg-white text-black hover:bg-gray-200">
          <Download className="mr-2 h-4 w-4" />
          Export Report
        </Button>
      </div>

      {/* Financial Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-300">Monthly Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-green-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">${mockFinancialData.monthlyRevenue.toLocaleString()}</div>
            <p className="text-xs text-green-400 mt-1">+12.5% from last month</p>
          </CardContent>
        </Card>

        <Card className="bg-gray-800 border-gray-700">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-300">Total Profit</CardTitle>
            <TrendingUp className="h-4 w-4 text-blue-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">${mockFinancialData.totalProfit.toLocaleString()}</div>
            <p className="text-xs text-blue-400 mt-1">68% profit margin</p>
          </CardContent>
        </Card>

        <Card className="bg-gray-800 border-gray-700">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-300">Pending Payments</CardTitle>
            <AlertCircle className="h-4 w-4 text-yellow-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">${mockFinancialData.pendingPayments.toLocaleString()}</div>
            <p className="text-xs text-yellow-400 mt-1">8 invoices pending</p>
          </CardContent>
        </Card>

        <Card className="bg-gray-800 border-gray-700">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-300">Monthly Expenses</CardTitle>
            <Calendar className="h-4 w-4 text-red-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">${mockFinancialData.expenses.toLocaleString()}</div>
            <p className="text-xs text-red-400 mt-1">32% of revenue</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Transactions */}
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader>
            <CardTitle className="text-white">Recent Transactions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {mockFinancialData.recentTransactions.map((transaction) => (
                <div key={transaction.id} className="flex items-center justify-between">
                  <div>
                    <p className="text-white font-medium">{transaction.client}</p>
                    <p className="text-sm text-gray-400">{transaction.date}</p>
                  </div>
                  <div className="text-right">
                    <p className={`font-medium ${transaction.type === "income" ? "text-green-400" : "text-red-400"}`}>
                      {transaction.type === "income" ? "+" : "-"}${transaction.amount}
                    </p>
                    <Badge
                      variant={transaction.status === "completed" ? "default" : "secondary"}
                      className={transaction.status === "completed" ? "bg-green-600" : "bg-yellow-600"}
                    >
                      {transaction.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Upcoming Payments */}
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader>
            <CardTitle className="text-white">Upcoming Payments</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {mockFinancialData.upcomingPayments.map((payment, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div>
                    <p className="text-white font-medium">{payment.client}</p>
                    <p className="text-sm text-gray-400">Due: {payment.dueDate}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-green-400 font-medium">${payment.amount}</p>
                    <Button size="sm" variant="outline" className="mt-1 text-xs">
                      Send Reminder
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
