"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Calendar, DollarSign, TrendingUp } from "lucide-react"

interface PaymentEvent {
  id: string
  date: string
  type: "payment" | "posts" | "reminder"
  amount?: number
  postCount?: number
  platform?: string
  description: string
  status: "completed" | "pending" | "overdue"
}

interface PaymentTimelineProps {
  client: {
    name: string
    paymentType: "monthly" | "weekly" | "per-post"
    monthlyRate?: number
    weeklyRate?: number
  }
  events: PaymentEvent[]
}

export function PaymentTimeline({ client, events }: PaymentTimelineProps) {
  const getEventIcon = (type: string) => {
    switch (type) {
      case "payment":
        return <DollarSign className="h-4 w-4 text-green-400" />
      case "posts":
        return <TrendingUp className="h-4 w-4 text-blue-400" />
      case "reminder":
        return <Calendar className="h-4 w-4 text-yellow-400" />
      default:
        return <Calendar className="h-4 w-4 text-gray-400" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-green-600"
      case "pending":
        return "bg-yellow-600"
      case "overdue":
        return "bg-red-600"
      default:
        return "bg-gray-600"
    }
  }

  return (
    <Card className="bg-black border-gray-800">
      <CardHeader>
        <CardTitle className="text-white flex items-center">
          <Calendar className="mr-2 h-5 w-5" />
          Payment Timeline
        </CardTitle>
        <div className="text-sm text-gray-400">
          {client.paymentType === "monthly" && `Monthly Rate: $${client.monthlyRate}`}
          {client.paymentType === "weekly" && `Weekly Rate: $${client.weeklyRate}`}
          {client.paymentType === "per-post" && "Per-post billing"}
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {events.map((event, index) => (
            <div key={event.id} className="flex items-start space-x-4">
              <div className="flex flex-col items-center">
                <div className="w-8 h-8 bg-gray-900 rounded-full flex items-center justify-center">
                  {getEventIcon(event.type)}
                </div>
                {index < events.length - 1 && <div className="w-px h-8 bg-gray-600 mt-2" />}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <h4 className="text-white font-medium text-sm">{event.description}</h4>
                    <p className="text-xs text-gray-400">{event.date}</p>
                  </div>
                  <div className="flex items-center space-x-2">
                    {event.amount && <span className="text-green-400 font-medium text-sm">${event.amount}</span>}
                    {event.postCount && (
                      <span className="text-blue-400 font-medium text-sm">{event.postCount} posts</span>
                    )}
                    <Badge className={getStatusColor(event.status)} variant="default">
                      {event.status}
                    </Badge>
                  </div>
                </div>
                {event.platform && <p className="text-xs text-gray-300">Platform: {event.platform}</p>}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
