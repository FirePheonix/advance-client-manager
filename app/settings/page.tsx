"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Separator } from "@/components/ui/separator"
import { Save, User, Bell, CreditCard, Shield } from "lucide-react"

export default function SettingsPage() {
  const [settings, setSettings] = useState({
    companyName: "Your Social Media Agency",
    email: "admin@agency.com",
    phone: "+1 (555) 123-4567",
    upiId: "agency@upi",
    address: "123 Business St, City, State 12345",
    emailNotifications: true,
    paymentReminders: true,
    clientUpdates: true,
    darkMode: true,
  })

  const handleSave = () => {
    // Save settings logic would go here
    console.log("Settings saved:", settings)
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white">Settings</h1>
        <p className="text-gray-400 mt-2">Manage your agency settings and preferences</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Company Information */}
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader>
            <CardTitle className="text-white flex items-center">
              <User className="mr-2 h-5 w-5" />
              Company Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="companyName" className="text-gray-300">
                Company Name
              </Label>
              <Input
                id="companyName"
                value={settings.companyName}
                onChange={(e) => setSettings((prev) => ({ ...prev, companyName: e.target.value }))}
                className="bg-gray-700 border-gray-600 text-white"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" className="text-gray-300">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                value={settings.email}
                onChange={(e) => setSettings((prev) => ({ ...prev, email: e.target.value }))}
                className="bg-gray-700 border-gray-600 text-white"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone" className="text-gray-300">
                Phone
              </Label>
              <Input
                id="phone"
                value={settings.phone}
                onChange={(e) => setSettings((prev) => ({ ...prev, phone: e.target.value }))}
                className="bg-gray-700 border-gray-600 text-white"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="address" className="text-gray-300">
                Address
              </Label>
              <Textarea
                id="address"
                value={settings.address}
                onChange={(e) => setSettings((prev) => ({ ...prev, address: e.target.value }))}
                className="bg-gray-700 border-gray-600 text-white"
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        {/* Payment Settings */}
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader>
            <CardTitle className="text-white flex items-center">
              <CreditCard className="mr-2 h-5 w-5" />
              Payment Settings
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="upiId" className="text-gray-300">
                UPI ID
              </Label>
              <Input
                id="upiId"
                value={settings.upiId}
                onChange={(e) => setSettings((prev) => ({ ...prev, upiId: e.target.value }))}
                className="bg-gray-700 border-gray-600 text-white"
              />
              <p className="text-xs text-gray-400">This will be included in payment reminder emails</p>
            </div>

            <Separator className="bg-gray-600" />

            <div className="space-y-4">
              <h4 className="text-white font-medium">Default Payment Terms</h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-gray-300">Monthly Due Date</Label>
                  <Input
                    type="number"
                    min="1"
                    max="31"
                    defaultValue="15"
                    className="bg-gray-700 border-gray-600 text-white"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-gray-300">Reminder Days</Label>
                  <Input
                    type="number"
                    min="1"
                    max="30"
                    defaultValue="3"
                    className="bg-gray-700 border-gray-600 text-white"
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Notification Settings */}
      <Card className="bg-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center">
            <Bell className="mr-2 h-5 w-5" />
            Notification Settings
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-white font-medium">Email Notifications</h4>
              <p className="text-sm text-gray-400">Receive email notifications for important events</p>
            </div>
            <Switch
              checked={settings.emailNotifications}
              onCheckedChange={(checked) => setSettings((prev) => ({ ...prev, emailNotifications: checked }))}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-white font-medium">Payment Reminders</h4>
              <p className="text-sm text-gray-400">Automatically send payment reminders to clients</p>
            </div>
            <Switch
              checked={settings.paymentReminders}
              onCheckedChange={(checked) => setSettings((prev) => ({ ...prev, paymentReminders: checked }))}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-white font-medium">Client Updates</h4>
              <p className="text-sm text-gray-400">Send monthly reports and updates to clients</p>
            </div>
            <Switch
              checked={settings.clientUpdates}
              onCheckedChange={(checked) => setSettings((prev) => ({ ...prev, clientUpdates: checked }))}
            />
          </div>
        </CardContent>
      </Card>

      {/* User Management */}
      <Card className="bg-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center">
            <Shield className="mr-2 h-5 w-5" />
            User Management
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-white font-medium">Co-founder Access</h4>
              <p className="text-sm text-gray-400">cofounder@agency.com</p>
            </div>
            <Button variant="outline" className="bg-gray-700 text-white hover:bg-gray-600">
              Manage Access
            </Button>
          </div>

          <Separator className="bg-gray-600" />

          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-white font-medium">Team Members</h4>
              <p className="text-sm text-gray-400">Manage intern and team member access</p>
            </div>
            <Button variant="outline" className="bg-gray-700 text-white hover:bg-gray-600">
              Add Member
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={handleSave} className="bg-white text-black hover:bg-gray-200">
          <Save className="mr-2 h-4 w-4" />
          Save Settings
        </Button>
      </div>
    </div>
  )
}
