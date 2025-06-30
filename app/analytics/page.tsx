import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { BarChart3, TrendingUp, Users, DollarSign } from "lucide-react"

const analyticsData = {
  monthlyGrowth: [
    { month: "Jan", revenue: 15000, clients: 18 },
    { month: "Feb", revenue: 18500, clients: 20 },
    { month: "Mar", revenue: 22000, clients: 22 },
    { month: "Apr", revenue: 25500, clients: 24 },
    { month: "May", revenue: 28750, clients: 26 },
  ],
  clientBreakdown: [
    { type: "Monthly Retainer", count: 18, revenue: 24000 },
    { type: "Per Post", count: 8, revenue: 4750 },
  ],
  topClients: [
    { name: "TechStart Inc.", revenue: 12500, posts: 45 },
    { name: "E-commerce Store", revenue: 9000, posts: 32 },
    { name: "Fashion Forward", revenue: 3750, posts: 50 },
    { name: "Local Restaurant", revenue: 3600, posts: 28 },
  ],
}

export default function AnalyticsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white">Analytics</h1>
        <p className="text-gray-400 mt-2">Insights into your agency's performance</p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-300">Avg. Revenue/Client</CardTitle>
            <DollarSign className="h-4 w-4 text-green-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">$1,106</div>
            <p className="text-xs text-green-400 mt-1">+8.2% from last month</p>
          </CardContent>
        </Card>

        <Card className="bg-gray-800 border-gray-700">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-300">Client Retention</CardTitle>
            <Users className="h-4 w-4 text-blue-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">94%</div>
            <p className="text-xs text-blue-400 mt-1">+2% from last month</p>
          </CardContent>
        </Card>

        <Card className="bg-gray-800 border-gray-700">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-300">Posts This Month</CardTitle>
            <BarChart3 className="h-4 w-4 text-purple-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">155</div>
            <p className="text-xs text-purple-400 mt-1">+12 from last month</p>
          </CardContent>
        </Card>

        <Card className="bg-gray-800 border-gray-700">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-300">Growth Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-orange-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">+23%</div>
            <p className="text-xs text-orange-400 mt-1">Month over month</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Client Breakdown */}
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader>
            <CardTitle className="text-white">Client Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {analyticsData.clientBreakdown.map((item, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div>
                    <p className="text-white font-medium">{item.type}</p>
                    <p className="text-sm text-gray-400">{item.count} clients</p>
                  </div>
                  <div className="text-right">
                    <p className="text-green-400 font-medium">${item.revenue.toLocaleString()}</p>
                    <p className="text-xs text-gray-400">{((item.revenue / 28750) * 100).toFixed(1)}% of total</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Top Clients */}
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader>
            <CardTitle className="text-white">Top Clients</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {analyticsData.topClients.map((client, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div>
                    <p className="text-white font-medium">{client.name}</p>
                    <p className="text-sm text-gray-400">{client.posts} posts</p>
                  </div>
                  <div className="text-right">
                    <p className="text-green-400 font-medium">${client.revenue.toLocaleString()}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Monthly Growth Chart Placeholder */}
      <Card className="bg-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white">Monthly Growth</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 flex items-center justify-center text-gray-400">
            <div className="text-center">
              <BarChart3 className="h-12 w-12 mx-auto mb-4" />
              <p>Revenue and client growth chart would be displayed here</p>
              <p className="text-sm mt-2">Integration with charting library needed</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
