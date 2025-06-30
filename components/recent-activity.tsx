"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Activity } from "lucide-react"
import { getRecentActivity } from "@/lib/database"

interface ActivityItem {
  id: string
  type: string
  message: string
  amount: string | null
  time: string
  status: string
}

export function RecentActivity() {
  const [activities, setActivities] = useState<ActivityItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadActivity() {
      try {
        const data = await getRecentActivity()
        setActivities(data)
      } catch (error) {
        console.error("Error loading recent activity:", error)
      } finally {
        setLoading(false)
      }
    }

    loadActivity()
  }, [])

  if (loading) {
    return (
      <Card className="bg-black border-gray-800">
        <CardHeader>
          <CardTitle className="text-white flex items-center">
            <Activity className="mr-2 h-5 w-5" />
            Recent Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="animate-pulse">
                <div className="h-4 bg-gray-700 rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-gray-700 rounded w-1/2"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="bg-black border-gray-800">
      <CardHeader>
        <CardTitle className="text-white flex items-center">
          <Activity className="mr-2 h-5 w-5" />
          Recent Activity
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {activities.map((activity) => (
            <div key={activity.id} className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-white text-sm">{activity.message}</p>
                <p className="text-gray-400 text-xs mt-1">{activity.time}</p>
              </div>
              <div className="flex items-center space-x-2">
                {activity.amount && <span className="text-green-400 font-medium text-sm">{activity.amount}</span>}
                <Badge
                  variant="outline"
                  className={`text-xs ${
                    activity.status === "success"
                      ? "border-green-600 text-green-400"
                      : activity.status === "warning"
                        ? "border-yellow-600 text-yellow-400"
                        : "border-blue-600 text-blue-400"
                  }`}
                >
                  {activity.type}
                </Badge>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
