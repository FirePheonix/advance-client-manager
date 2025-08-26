"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Separator } from "@/components/ui/separator"
import { Save, Building, CreditCard, FileText, MessageSquare, Image, Settings as SettingsIcon } from "lucide-react"
import { getSettings, updateSettings } from "@/lib/database"
import { toast } from "sonner"

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
      toast.error("Failed to load settings")
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    try {
      setSaving(true)
      console.log("Attempting to save settings:", settings) // Debug log
      await updateSettings(settings)
      toast.success("Settings saved successfully!")
    } catch (error: any) {
      console.error("Error saving settings:", error)
      console.error("Error details:", {
        message: error?.message,
        code: error?.code,
        details: error?.details,
        hint: error?.hint
      })
      toast.error(`Failed to save settings: ${error?.message || 'Unknown error'}`)
    } finally {
      setSaving(false)
    }
  }

  const handleInputChange = (field: keyof SettingsForm, value: string | number) => {
    setSettings(prev => ({ ...prev, [field]: value }))
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-white">Settings</h1>
          <p className="text-gray-400 mt-2">Manage your invoice settings and business information</p>
        </div>
        <div className="text-white">Loading settings...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white">Settings</h1>
        <p className="text-gray-400 mt-2">Manage your invoice settings and business information</p>
      </div>

      <div className="space-y-6">
        {/* Business Information */}
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader>
            <CardTitle className="text-white flex items-center">
              <Building className="mr-2 h-5 w-5" />
              Business Information (FROM)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="fromName" className="text-gray-300">
                  Business Name
                </Label>
                <Input
                  id="fromName"
                  value={settings.fromName}
                  onChange={(e) => handleInputChange('fromName', e.target.value)}
                  className="bg-gray-700 border-gray-600 text-white"
                  placeholder="Janavi Sawadia"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="fromPhone" className="text-gray-300">
                  Business Phone
                </Label>
                <Input
                  id="fromPhone"
                  value={settings.fromPhone}
                  onChange={(e) => handleInputChange('fromPhone', e.target.value)}
                  className="bg-gray-700 border-gray-600 text-white"
                  placeholder="9915474100"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="fromAddress" className="text-gray-300">
                Business Address
              </Label>
              <Textarea
                id="fromAddress"
                value={settings.fromAddress}
                onChange={(e) => handleInputChange('fromAddress', e.target.value)}
                className="bg-gray-700 border-gray-600 text-white"
                rows={3}
                placeholder="403, Maruti Kunj, Mohaba bazaar, opposite Sinapore City, Raipur, Chhattisgarh- 492001"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="fromEmail" className="text-gray-300">
                Business Email
              </Label>
              <Input
                id="fromEmail"
                type="email"
                value={settings.fromEmail}
                onChange={(e) => handleInputChange('fromEmail', e.target.value)}
                className="bg-gray-700 border-gray-600 text-white"
                placeholder="sawadiajanavi@gmail.com"
              />
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="bankAccountName" className="text-gray-300">
                  Account Holder Name
                </Label>
                <Input
                  id="bankAccountName"
                  value={settings.bankAccountName}
                  onChange={(e) => handleInputChange('bankAccountName', e.target.value)}
                  className="bg-gray-700 border-gray-600 text-white"
                  placeholder="Janavi Sawadia"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="bankAccountNumber" className="text-gray-300">
                  Account Number
                </Label>
                <Input
                  id="bankAccountNumber"
                  value={settings.bankAccountNumber}
                  onChange={(e) => handleInputChange('bankAccountNumber', e.target.value)}
                  className="bg-gray-700 border-gray-600 text-white"
                  placeholder="50100613672509"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="bankIFSC" className="text-gray-300">
                IFSC Code
              </Label>
              <Input
                id="bankIFSC"
                value={settings.bankIFSC}
                onChange={(e) => handleInputChange('bankIFSC', e.target.value)}
                className="bg-gray-700 border-gray-600 text-white"
                placeholder="HDFC0000769"
              />
            </div>
          </CardContent>
        </Card>

        {/* UPI Information */}
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader>
            <CardTitle className="text-white flex items-center">
              <CreditCard className="mr-2 h-5 w-5" />
              UPI Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="upiId" className="text-gray-300">
                  UPI ID
                </Label>
                <Input
                  id="upiId"
                  value={settings.upiId}
                  onChange={(e) => handleInputChange('upiId', e.target.value)}
                  className="bg-gray-700 border-gray-600 text-white"
                  placeholder="7241113205@upi"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="upiPhone" className="text-gray-300">
                  UPI Phone
                </Label>
                <Input
                  id="upiPhone"
                  value={settings.upiPhone}
                  onChange={(e) => handleInputChange('upiPhone', e.target.value)}
                  className="bg-gray-700 border-gray-600 text-white"
                  placeholder="9915474100"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="contactEmail" className="text-gray-300">
                Contact Email
              </Label>
              <Input
                id="contactEmail"
                type="email"
                value={settings.contactEmail}
                onChange={(e) => handleInputChange('contactEmail', e.target.value)}
                className="bg-gray-700 border-gray-600 text-white"
                placeholder="sawadiajanavi@gmail.com"
              />
            </div>
          </CardContent>
        </Card>

        {/* Invoice Details */}
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader>
            <CardTitle className="text-white flex items-center">
              <FileText className="mr-2 h-5 w-5" />
              Invoice Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="businessTitle" className="text-gray-300">
                  Business Title
                </Label>
                <Input
                  id="businessTitle"
                  value={settings.businessTitle}
                  onChange={(e) => handleInputChange('businessTitle', e.target.value)}
                  className="bg-gray-700 border-gray-600 text-white"
                  placeholder="INVOICE"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="businessSubtitle" className="text-gray-300">
                  Business Subtitle
                </Label>
                <Input
                  id="businessSubtitle"
                  value={settings.businessSubtitle}
                  onChange={(e) => handleInputChange('businessSubtitle', e.target.value)}
                  className="bg-gray-700 border-gray-600 text-white"
                  placeholder="Business tagline or subtitle"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="invoiceNumber" className="text-gray-300">
                  Default Invoice Number
                </Label>
                <Input
                  id="invoiceNumber"
                  value={settings.invoiceNumber}
                  onChange={(e) => handleInputChange('invoiceNumber', e.target.value)}
                  className="bg-gray-700 border-gray-600 text-white"
                  placeholder="Auto-generated or custom invoice number"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="invoiceDate" className="text-gray-300">
                  Default Invoice Date
                </Label>
                <Input
                  id="invoiceDate"
                  type="date"
                  value={settings.invoiceDate}
                  onChange={(e) => handleInputChange('invoiceDate', e.target.value)}
                  className="bg-gray-700 border-gray-600 text-white"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Messages & Content */}
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader>
            <CardTitle className="text-white flex items-center">
              <MessageSquare className="mr-2 h-5 w-5" />
              Messages & Content
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="thankYouMessage" className="text-gray-300">
                Thank You Message
              </Label>
              <Textarea
                id="thankYouMessage"
                value={settings.thankYouMessage}
                onChange={(e) => handleInputChange('thankYouMessage', e.target.value)}
                className="bg-gray-700 border-gray-600 text-white"
                rows={2}
                placeholder="Thank you for your business!"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="paymentInstructions" className="text-gray-300">
                Payment Instructions
              </Label>
              <Textarea
                id="paymentInstructions"
                value={settings.paymentInstructions}
                onChange={(e) => handleInputChange('paymentInstructions', e.target.value)}
                className="bg-gray-700 border-gray-600 text-white"
                rows={3}
                placeholder="Please make payment using the bank details or UPI ID provided above."
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="termsAndConditions" className="text-gray-300">
                Terms & Conditions
              </Label>
              <Textarea
                id="termsAndConditions"
                value={settings.termsAndConditions}
                onChange={(e) => handleInputChange('termsAndConditions', e.target.value)}
                className="bg-gray-700 border-gray-600 text-white"
                rows={3}
                placeholder="Payment is due within 15 days of invoice date. Late payments may incur additional charges."
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="footerText" className="text-gray-300">
                Footer Text
              </Label>
              <Textarea
                id="footerText"
                value={settings.footerText}
                onChange={(e) => handleInputChange('footerText', e.target.value)}
                className="bg-gray-700 border-gray-600 text-white"
                rows={2}
                placeholder="Footer text"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes" className="text-gray-300">
                Default Notes
              </Label>
              <Textarea
                id="notes"
                value={settings.notes}
                onChange={(e) => handleInputChange('notes', e.target.value)}
                className="bg-gray-700 border-gray-600 text-white"
                rows={2}
                placeholder="Additional notes"
              />
            </div>
          </CardContent>
        </Card>

        {/* Financial Details */}
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader>
            <CardTitle className="text-white flex items-center">
              <SettingsIcon className="mr-2 h-5 w-5" />
              Financial Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="currencySymbol" className="text-gray-300">
                  Currency Symbol
                </Label>
                <Input
                  id="currencySymbol"
                  value={settings.currencySymbol}
                  onChange={(e) => handleInputChange('currencySymbol', e.target.value)}
                  className="bg-gray-700 border-gray-600 text-white"
                  placeholder="₹"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="taxRate" className="text-gray-300">
                  Default Tax Rate (%)
                </Label>
                <Input
                  id="taxRate"
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  value={settings.taxRate}
                  onChange={(e) => handleInputChange('taxRate', parseFloat(e.target.value) || 0)}
                  className="bg-gray-700 border-gray-600 text-white"
                  placeholder="0"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="discountAmount" className="text-gray-300">
                  Default Discount Amount
                </Label>
                <Input
                  id="discountAmount"
                  type="number"
                  step="0.01"
                  min="0"
                  value={settings.discountAmount}
                  onChange={(e) => handleInputChange('discountAmount', parseFloat(e.target.value) || 0)}
                  className="bg-gray-700 border-gray-600 text-white"
                  placeholder="0"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="discountReason" className="text-gray-300">
                Default Discount Reason
              </Label>
              <Input
                id="discountReason"
                value={settings.discountReason}
                onChange={(e) => handleInputChange('discountReason', e.target.value)}
                className="bg-gray-700 border-gray-600 text-white"
                placeholder="Reason for discount"
              />
            </div>
          </CardContent>
        </Card>

        {/* Media URLs */}
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader>
            <CardTitle className="text-white flex items-center">
              <Image className="mr-2 h-5 w-5" />
              Media URLs
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="logoUrl" className="text-gray-300">
                Logo URL
              </Label>
              <Input
                id="logoUrl"
                type="url"
                value={settings.logoUrl}
                onChange={(e) => handleInputChange('logoUrl', e.target.value)}
                className="bg-gray-700 border-gray-600 text-white"
                placeholder="https://example.com/logo.png"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="signatureUrl" className="text-gray-300">
                Signature URL
              </Label>
              <Input
                id="signatureUrl"
                type="url"
                value={settings.signatureUrl}
                onChange={(e) => handleInputChange('signatureUrl', e.target.value)}
                className="bg-gray-700 border-gray-600 text-white"
                placeholder="https://example.com/signature.png"
              />
            </div>
          </CardContent>
        </Card>

        {/* Custom Fields */}
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader>
            <CardTitle className="text-white flex items-center">
              <SettingsIcon className="mr-2 h-5 w-5" />
              Custom Fields
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {[1, 2, 3, 4, 5].map((num) => (
              <div key={num} className="space-y-2">
                <Label htmlFor={`customField${num}`} className="text-gray-300">
                  Custom Field {num}
                </Label>
                <Input
                  id={`customField${num}`}
                  value={settings[`customField${num}` as keyof SettingsForm] as string}
                  onChange={(e) => handleInputChange(`customField${num}` as keyof SettingsForm, e.target.value)}
                  className="bg-gray-700 border-gray-600 text-white"
                  placeholder={`Custom field ${num}`}
                />
              </div>
            ))}
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
