"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "@/hooks/use-toast"
import { getSettings, updateSettings } from "@/lib/database"
import { Building, CreditCard, Save, Phone, Mail } from "lucide-react"

interface SettingsForm {
  from_name: string
  from_address: string
  from_phone: string
  from_email: string
  bank_account_name: string
  bank_account_number: string
  bank_ifsc: string
  upi_id: string
  upi_phone: string
  contact_email: string
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<SettingsForm>({
    from_name: '',
    from_address: '',
    from_phone: '',
    from_email: '',
    bank_account_name: '',
    bank_account_number: '',
    bank_ifsc: '',
    upi_id: '',
    upi_phone: '',
    contact_email: '',
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    loadSettings()
  }, [])

  const loadSettings = async () => {
    try {
      setLoading(true)
      const data = await getSettings()
      setSettings({
        from_name: data.from_name || '',
        from_address: data.from_address || '',
        from_phone: data.from_phone || '',
        from_email: data.from_email || '',
        bank_account_name: data.bank_account_name || '',
        bank_account_number: data.bank_account_number || '',
        bank_ifsc: data.bank_ifsc || '',
        upi_id: data.upi_id || '',
        upi_phone: data.upi_phone || '',
        contact_email: data.contact_email || '',
      })
    } catch (error) {
      console.error("Error loading settings:", error)
      toast({
        title: "Error",
        description: "Failed to load settings",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    try {
      setSaving(true)
      console.log("Attempting to save settings:", settings)
      await updateSettings(settings)
      toast({
        title: "Success",
        description: "Settings saved successfully!"
      })
    } catch (error: any) {
      console.error("Error saving settings:", error)
      toast({
        title: "Error",
        description: `Failed to save settings: ${error?.message || 'Unknown error'}`,
        variant: "destructive"
      })
    } finally {
      setSaving(false)
    }
  }

  const handleInputChange = (field: keyof SettingsForm, value: string) => {
    setSettings(prev => ({ ...prev, [field]: value }))
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-white">Settings</h1>
          <p className="text-gray-400 mt-2">Manage your business information and payment details</p>
        </div>
        <div className="text-white">Loading settings...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white">Settings</h1>
        <p className="text-gray-400 mt-2">Manage your business information and payment details</p>
      </div>

      <div className="space-y-6">
        {/* Business Information */}
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader>
            <CardTitle className="text-white flex items-center">
              <Building className="mr-2 h-5 w-5" />
              Business Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="from_name" className="text-white">From Name</Label>
              <Input
                id="from_name"
                value={settings.from_name}
                onChange={(e) => handleInputChange('from_name', e.target.value)}
                className="bg-gray-700 border-gray-600 text-white"
                placeholder="Janavi Sawadia"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="from_address" className="text-white">From Address</Label>
              <Textarea
                id="from_address"
                value={settings.from_address}
                onChange={(e) => handleInputChange('from_address', e.target.value)}
                className="bg-gray-700 border-gray-600 text-white"
                rows={3}
                placeholder="403, Maruti Kunj, Mohaba bazaar, opposite Sinapore City, Raipur, Chhattisgarh- 492001"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="from_phone" className="text-white">From Phone</Label>
                <Input
                  id="from_phone"
                  value={settings.from_phone}
                  onChange={(e) => handleInputChange('from_phone', e.target.value)}
                  className="bg-gray-700 border-gray-600 text-white"
                  placeholder="9915474100"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="from_email" className="text-white">From Email</Label>
                <Input
                  id="from_email"
                  type="email"
                  value={settings.from_email}
                  onChange={(e) => handleInputChange('from_email', e.target.value)}
                  className="bg-gray-700 border-gray-600 text-white"
                  placeholder="sawadiajanavi@gmail.com"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Bank Information */}
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader>
            <CardTitle className="text-white flex items-center">
              <CreditCard className="mr-2 h-5 w-5" />
              Bank Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="bank_account_name" className="text-white">Bank Account Name</Label>
              <Input
                id="bank_account_name"
                value={settings.bank_account_name}
                onChange={(e) => handleInputChange('bank_account_name', e.target.value)}
                className="bg-gray-700 border-gray-600 text-white"
                placeholder="Janavi Sawadia"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="bank_account_number" className="text-white">Bank Account Number</Label>
                <Input
                  id="bank_account_number"
                  value={settings.bank_account_number}
                  onChange={(e) => handleInputChange('bank_account_number', e.target.value)}
                  className="bg-gray-700 border-gray-600 text-white"
                  placeholder="50100613672509"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="bank_ifsc" className="text-white">Bank IFSC</Label>
                <Input
                  id="bank_ifsc"
                  value={settings.bank_ifsc}
                  onChange={(e) => handleInputChange('bank_ifsc', e.target.value)}
                  className="bg-gray-700 border-gray-600 text-white"
                  placeholder="HDFC0000769"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* UPI Information */}
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader>
            <CardTitle className="text-white flex items-center">
              <Phone className="mr-2 h-5 w-5" />
              UPI Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="upi_id" className="text-white">UPI ID</Label>
                <Input
                  id="upi_id"
                  value={settings.upi_id}
                  onChange={(e) => handleInputChange('upi_id', e.target.value)}
                  className="bg-gray-700 border-gray-600 text-white"
                  placeholder="7241113205@upi"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="upi_phone" className="text-white">UPI Phone</Label>
                <Input
                  id="upi_phone"
                  value={settings.upi_phone}
                  onChange={(e) => handleInputChange('upi_phone', e.target.value)}
                  className="bg-gray-700 border-gray-600 text-white"
                  placeholder="9915474100"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="contact_email" className="text-white">Contact Email</Label>
              <Input
                id="contact_email"
                type="email"
                value={settings.contact_email}
                onChange={(e) => handleInputChange('contact_email', e.target.value)}
                className="bg-gray-700 border-gray-600 text-white"
                placeholder="sawadiajanavi@gmail.com"
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button 
          onClick={handleSave} 
          disabled={saving}
          className="bg-white text-black hover:bg-gray-200"
        >
          <Save className="mr-2 h-4 w-4" />
          {saving ? 'Saving...' : 'Save Settings'}
        </Button>
      </div>
    </div>
  )
}
