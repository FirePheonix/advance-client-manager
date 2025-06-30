"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Calendar, DollarSign, Mail, Plus } from "lucide-react"
import { AddPostDialog } from "@/components/add-post-dialog"

interface ClientTimelineProps {
  client: any
  onBack: () => void
}

const mockTimelineEvents = [
  {
    id: 1,
    type: "payment",
    title: "Monthly Payment Received",
    amount: 2500,
    date: "2024-01-01",
    status: "completed",
  },
  {
    id: 2,
    type: "post",
    title: "LinkedIn Post - Product Launch",
    amount: 50,
    date: "2024-01-03",
    status: "completed",
    postType: "LinkedIn Post",
  },
  {
    id: 3,
    type: "post",
    title: "Instagram Story - Behind the Scenes",
    amount: 75,
    date: "2024-01-05",
    status: "completed",
    postType: "Instagram Post",
  },
  {
    id: 4,
    type: "payment",
    title: "Payment Reminder Sent",
    date: "2024-01-10",
    status: "pending",
  },
]

export function ClientTimeline({ client, onBack }: ClientTimelineProps) {
  const [timelineEvents, setTimelineEvents] = useState(mockTimelineEvents)
  const [showAddPostDialog, setShowAddPostDialog] = useState(false)

  const totalEarned = timelineEvents
    .filter((event) => event.type === "post" && event.status === "completed")
    .reduce((sum, event) => sum + (event.amount || 0), 0)

  const pendingAmount = timelineEvents
    .filter((event) => event.type === "post" && event.status === "pending")
    .reduce((sum, event) => sum + (event.amount || 0), 0)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" onClick={onBack} className="text-gray-300 hover:text-white">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Clients
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-white">{client.name}</h1>
            <p className="text-gray-400 mt-1">Client Timeline & Activity</p>
          </div>
        </div>
        {client.paymentType === "per-post" && (
          <Button onClick={() => setShowAddPostDialog(true)} className="bg-white text-black hover:bg-gray-200">
            <Plus className="mr-2 h-4 w-4" />
            Add Post
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader>
            <CardTitle className="text-white flex items-center">
              <Mail className="mr-2 h-4 w-4" />
              Contact
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-sm text-gray-300">{client.email}</p>
            <p className="text-sm text-gray-300">{client.phone}</p>
          </CardContent>
        </Card>

        <Card className="bg-gray-800 border-gray-700">
          <CardHeader>
            <CardTitle className="text-white flex items-center">
              <DollarSign className="mr-2 h-4 w-4" />
              Payment Info
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-sm text-gray-300">Type: {client.paymentType === "monthly" ? "Monthly" : "Per Post"}</p>
            {client.paymentType === "monthly" ? (
              <p className="text-sm text-gray-300">${client.monthlyRate}/month</p>
            ) : (
              <p className="text-sm text-gray-300">Variable rates</p>
            )}
          </CardContent>
        </Card>

        {client.paymentType === "per-post" && (
          <>
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle className="text-white">Total Earned</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-green-400">${totalEarned}</p>
              </CardContent>
            </Card>

            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle className="text-white">Pending</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-yellow-400">${pendingAmount}</p>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      <Card className="bg-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center">
            <Calendar className="mr-2 h-4 w-4" />
            Timeline
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {timelineEvents.map((event, index) => (
              <div key={event.id} className="flex items-start space-x-4">
                <div className="flex flex-col items-center">
                  <div
                    className={`w-3 h-3 rounded-full ${
                      event.status === "completed"
                        ? "bg-green-400"
                        : event.status === "pending"
                          ? "bg-yellow-400"
                          : "bg-gray-400"
                    }`}
                  />
                  {index < timelineEvents.length - 1 && <div className="w-px h-8 bg-gray-600 mt-2" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h4 className="text-white font-medium">{event.title}</h4>
                    <div className="flex items-center space-x-2">
                      {event.amount && <span className="text-green-400 font-medium">${event.amount}</span>}
                      <Badge
                        variant={event.status === "completed" ? "default" : "secondary"}
                        className={event.status === "completed" ? "bg-green-600" : "bg-yellow-600"}
                      >
                        {event.status}
                      </Badge>
                    </div>
                  </div>
                  <p className="text-sm text-gray-400 mt-1">{event.date}</p>
                  {event.postType && <p className="text-sm text-gray-300 mt-1">Type: {event.postType}</p>}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <AddPostDialog
        open={showAddPostDialog}
        onOpenChange={setShowAddPostDialog}
        client={client}
        onAddPost={(post) => {
          const newEvent = {
            id: timelineEvents.length + 1,
            type: "post",
            title: `${post.postType} - ${post.description}`,
            amount: post.amount,
            date: new Date().toISOString().split("T")[0],
            status: "completed",
            postType: post.postType,
          }
          setTimelineEvents([newEvent, ...timelineEvents])
          setShowAddPostDialog(false)
        }}
      />
    </div>
  )
}
