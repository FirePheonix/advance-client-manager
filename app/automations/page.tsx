import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ExternalLink, Calendar, Mail, Zap, Settings } from "lucide-react"

const automationIntegrations = [
  {
    name: "Cal.com",
    description: "Schedule client calls and meetings automatically",
    status: "connected",
    icon: Calendar,
    url: "https://cal.com",
    features: ["Automatic scheduling", "Calendar sync", "Meeting reminders"],
  },
  {
    name: "Email Automation",
    description: "Send automated payment reminders and updates",
    status: "active",
    icon: Mail,
    features: ["Payment reminders", "Project updates", "Welcome emails"],
  },
]

const activeAutomations = [
  {
    name: "Payment Reminder Emails",
    trigger: "Due date approaching",
    action: "Send email with UPI details",
    status: "active",
    lastRun: "2024-01-15",
  },
  {
    name: "New Client Welcome",
    trigger: "Client added",
    action: "Send welcome email and onboarding",
    status: "active",
    lastRun: "2024-01-14",
  },
  {
    name: "Monthly Report Generation",
    trigger: "End of month",
    action: "Generate and send client reports",
    status: "active",
    lastRun: "2024-01-01",
  },
]

export default function AutomationsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white">Automations</h1>
        <p className="text-gray-400 mt-2">Streamline your workflow with automated processes</p>
      </div>

      {/* Integration Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {automationIntegrations.map((integration) => (
          <Card key={integration.name} className="bg-black border-gray-800">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <integration.icon className="h-8 w-8 text-white" />
                  <div>
                    <CardTitle className="text-white">{integration.name}</CardTitle>
                    <Badge
                      variant={
                        integration.status === "connected" || integration.status === "active" ? "default" : "secondary"
                      }
                      className={
                        integration.status === "connected" || integration.status === "active"
                          ? "bg-green-600"
                          : "bg-gray-600"
                      }
                    >
                      {integration.status}
                    </Badge>
                  </div>
                </div>
                {integration.url && (
                  <Button size="sm" variant="ghost" asChild className="hover:bg-gray-900">
                    <a href={integration.url} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-gray-300 text-sm mb-4">{integration.description}</p>
              <div className="space-y-2">
                <h4 className="text-white font-medium text-sm">Features:</h4>
                <ul className="space-y-1">
                  {integration.features.map((feature, index) => (
                    <li key={index} className="text-gray-400 text-sm">
                      • {feature}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="mt-4">
                <Button
                  size="sm"
                  className={
                    integration.status === "available"
                      ? "bg-white text-black hover:bg-gray-200"
                      : "bg-gray-900 text-white hover:bg-gray-800"
                  }
                >
                  {integration.status === "available" ? "Connect" : "Configure"}
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Active Automations */}
      <Card className="bg-black border-gray-800">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-white flex items-center">
              <Settings className="mr-2 h-5 w-5" />
              Active Automations
            </CardTitle>
            <Button className="bg-white text-black hover:bg-gray-200">Create New Automation</Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {activeAutomations.map((automation, index) => (
              <div key={index} className="flex items-center justify-between p-4 bg-gray-900 rounded-lg">
                <div className="flex-1">
                  <h4 className="text-white font-medium">{automation.name}</h4>
                  <p className="text-sm text-gray-300 mt-1">
                    <span className="text-blue-400">Trigger:</span> {automation.trigger}
                  </p>
                  <p className="text-sm text-gray-300">
                    <span className="text-green-400">Action:</span> {automation.action}
                  </p>
                </div>
                <div className="text-right">
                  <Badge variant="default" className="bg-green-600 mb-2">
                    {automation.status}
                  </Badge>
                  <p className="text-xs text-gray-400">Last run: {automation.lastRun}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Email Template Configuration */}
      <Card className="bg-black border-gray-800">
        <CardHeader>
          <CardTitle className="text-white">Payment Reminder Email Template</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="p-4 bg-gray-900 rounded-lg">
              <h4 className="text-white font-medium mb-2">Current Template:</h4>
              <div className="text-sm text-gray-300 space-y-2">
                <p>
                  <strong>Subject:</strong> Payment Reminder - Invoice Due
                </p>
                <p>
                  <strong>Body:</strong>
                </p>
                <div className="bg-gray-800 p-3 rounded text-xs">
                  <p>Dear {"{{client_name}}"},</p>
                  <br />
                  <p>
                    This is a friendly reminder that your payment of ${"{{amount}}"} is due on {"{{due_date}}"}.
                  </p>
                  <br />
                  <p>
                    You can make the payment using our UPI ID: <strong>agency@upi</strong>
                  </p>
                  <br />
                  <p>Thank you for your business!</p>
                  <br />
                  <p>
                    Best regards,
                    <br />
                    Your Social Media Agency
                  </p>
                </div>
              </div>
            </div>
            <Button variant="outline" className="bg-black border-gray-800 text-white hover:bg-gray-900">
              Edit Template
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
