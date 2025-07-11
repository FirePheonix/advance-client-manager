"use client"

import type React from "react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Plus, Trash2 } from "lucide-react"

interface AddClientDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onAddClient: (client: any) => void
}

interface ServiceEntry {
  name: string
  price: number
}

interface TieredPaymentEntry {
  amount: number
  duration_months: number
  payment_type: "monthly" | "weekly"
  services: ServiceEntry[]
}

const postTypes = [
  "LinkedIn Post",
  "Instagram Post", 
  "Facebook Post",
  "WhatsApp Message",
  "Poster Design",
  "Story Design",
  "Reel Creation",
]

export function AddClientDialog({ open, onOpenChange, onAddClient }: AddClientDialogProps) {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    company: "",
    company_address: "",
    gst_number: "",
    poc_phone: "",
    paymentType: "monthly",
    monthlyRate: "",
    weeklyRate: "",
    nextPayment: "",
    services: [] as ServiceEntry[], // For normal payment clients
    perPostRates: {} as Record<string, number>,
    tieredPayments: [] as TieredPaymentEntry[],
    // Final payment structure (after tiers complete) 
    finalMonthlyRate: "",
    finalWeeklyRate: "",
    finalServices: [] as ServiceEntry[],
    notes: "",
    useTieredPayments: false,
  })

  // Normal service functions
  const addService = () => {
    setFormData((prev) => ({
      ...prev,
      services: [...prev.services, { name: "", price: 0 }],
    }))
  }

  const removeService = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      services: prev.services.filter((_, i) => i !== index),
    }))
  }

  const updateService = (index: number, field: keyof ServiceEntry, value: string | number) => {
    setFormData((prev) => ({
      ...prev,
      services: prev.services.map((service, i) => 
        i === index ? { ...service, [field]: value } : service
      ),
    }))
  }

  // Final service functions (for after tiers complete)
  const addFinalService = () => {
    setFormData((prev) => ({
      ...prev,
      finalServices: [...prev.finalServices, { name: "", price: 0 }],
    }))
  }

  const removeFinalService = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      finalServices: prev.finalServices.filter((_, i) => i !== index),
    }))
  }

  const updateFinalService = (index: number, field: keyof ServiceEntry, value: string | number) => {
    setFormData((prev) => ({
      ...prev,
      finalServices: prev.finalServices.map((service, i) => 
        i === index ? { ...service, [field]: value } : service
      ),
    }))
  }

  // Tiered payment functions
  const addTieredPayment = () => {
    setFormData((prev) => ({
      ...prev,
      tieredPayments: [...prev.tieredPayments, { 
        amount: 0, 
        duration_months: 1, 
        payment_type: prev.paymentType === "weekly" ? "weekly" : "monthly",
        services: []
      }],
    }))
  }

  const removeTieredPayment = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      tieredPayments: prev.tieredPayments.filter((_, i) => i !== index),
    }))
  }

  const updateTieredPayment = (index: number, field: keyof Omit<TieredPaymentEntry, 'services'>, value: string | number) => {
    setFormData((prev) => ({
      ...prev,
      tieredPayments: prev.tieredPayments.map((tier, i) => 
        i === index ? { ...tier, [field]: value } : tier
      ),
    }))
  }

  // Tier service functions
  const addTierService = (tierIndex: number) => {
    setFormData((prev) => ({
      ...prev,
      tieredPayments: prev.tieredPayments.map((tier, i) => 
        i === tierIndex ? { ...tier, services: [...tier.services, { name: "", price: 0 }] } : tier
      ),
    }))
  }

  const removeTierService = (tierIndex: number, serviceIndex: number) => {
    setFormData((prev) => ({
      ...prev,
      tieredPayments: prev.tieredPayments.map((tier, i) => 
        i === tierIndex ? { 
          ...tier, 
          services: tier.services.filter((_, j) => j !== serviceIndex) 
        } : tier
      ),
    }))
  }

  const updateTierService = (tierIndex: number, serviceIndex: number, field: keyof ServiceEntry, value: string | number) => {
    setFormData((prev) => ({
      ...prev,
      tieredPayments: prev.tieredPayments.map((tier, i) => 
        i === tierIndex ? { 
          ...tier, 
          services: tier.services.map((service, j) => 
            j === serviceIndex ? { ...service, [field]: value } : service
          ) 
        } : tier
      ),
    }))
  }

  const handlePerPostRateChange = (postType: string, rate: string) => {
    setFormData((prev) => ({
      ...prev,
      perPostRates: {
        ...prev.perPostRates,
        [postType]: Number.parseFloat(rate) || 0,
      },
    }))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    // Convert services array to Record<string, number>
    const servicesRecord = formData.services.reduce((acc, service) => {
      if (service.name.trim()) {
        acc[service.name.trim()] = service.price
      }
      return acc
    }, {} as Record<string, number>)

    // Convert final services array to Record<string, number>
    const finalServicesRecord = formData.finalServices.reduce((acc, service) => {
      if (service.name.trim()) {
        acc[service.name.trim()] = service.price
      }
      return acc
    }, {} as Record<string, number>)

    // Convert tiered payments with services
    const tieredPaymentsData = formData.tieredPayments.map(tier => ({
      amount: tier.amount,
      duration_months: tier.duration_months,
      payment_type: tier.payment_type,
      services: tier.services.reduce((acc, service) => {
        if (service.name.trim()) {
          acc[service.name.trim()] = service.price
        }
        return acc
      }, {} as Record<string, number>)
    }))

    // Prepare the client data
    const clientData = {
      name: formData.name,
      email: formData.email,
      phone: formData.phone || null,
      company: formData.company || null,
      company_address: formData.company_address || null,
      gst_number: formData.gst_number || null,
      poc_phone: formData.poc_phone || null,
      payment_type: formData.paymentType,
      monthly_rate: formData.monthlyRate ? Number.parseFloat(formData.monthlyRate) : null,
      weekly_rate: formData.weeklyRate ? Number.parseFloat(formData.weeklyRate) : null,
      next_payment: formData.nextPayment || null,
      services: servicesRecord,
      per_post_rates: Object.keys(formData.perPostRates).length > 0 ? formData.perPostRates : {},
      tiered_payments: tieredPaymentsData,
      final_monthly_rate: formData.finalMonthlyRate ? Number.parseFloat(formData.finalMonthlyRate) : null,
      final_weekly_rate: formData.finalWeeklyRate ? Number.parseFloat(formData.finalWeeklyRate) : null,
      final_services: finalServicesRecord,
      notes: formData.notes || null,
      status: "active",
    }

    onAddClient(clientData)

    // Reset form
    setFormData({
      name: "",
      email: "",
      phone: "",
      company: "",
      company_address: "",
      gst_number: "",
      poc_phone: "",
      paymentType: "monthly",
      monthlyRate: "",
      weeklyRate: "",
      nextPayment: "",
      services: [],
      perPostRates: {},
      tieredPayments: [],
      finalMonthlyRate: "",
      finalWeeklyRate: "",
      finalServices: [],
      notes: "",
      useTieredPayments: false,
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-black border-gray-800 text-white max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New Client</DialogTitle>
          <DialogDescription className="text-gray-400">
            Add a new client with tiered or normal payment structure.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Client Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                className="bg-black border-gray-800"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="company">Company</Label>
              <Input
                id="company"
                value={formData.company}
                onChange={(e) => setFormData((prev) => ({ ...prev, company: e.target.value }))}
                className="bg-black border-gray-800"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData((prev) => ({ ...prev, email: e.target.value }))}
                className="bg-black border-gray-800"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => setFormData((prev) => ({ ...prev, phone: e.target.value }))}
                className="bg-black border-gray-800"
              />
            </div>
          </div>

          {/* Additional Information */}
          <div className="space-y-2">
            <Label htmlFor="company_address">Company Address</Label>
            <Input
              id="company_address"
              value={formData.company_address}
              onChange={(e) => setFormData((prev) => ({ ...prev, company_address: e.target.value }))}
              className="bg-black border-gray-800"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="gst_number">GST Number</Label>
              <Input
                id="gst_number"
                value={formData.gst_number}
                onChange={(e) => setFormData((prev) => ({ ...prev, gst_number: e.target.value }))}
                className="bg-black border-gray-800"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="poc_phone">POC Phone</Label>
              <Input
                id="poc_phone"
                value={formData.poc_phone}
                onChange={(e) => setFormData((prev) => ({ ...prev, poc_phone: e.target.value }))}
                className="bg-black border-gray-800"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="paymentType">Payment Type</Label>
            <Select
              value={formData.paymentType}
              onValueChange={(value) => setFormData((prev) => ({ ...prev, paymentType: value }))}
            >
              <SelectTrigger className="bg-black border-gray-800">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-black border-gray-800">
                <SelectItem value="monthly">Monthly Retainer</SelectItem>
                <SelectItem value="weekly">Weekly Retainer</SelectItem>
                <SelectItem value="per-post">Per Post</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Payment Structure Toggle */}
          {formData.paymentType !== "per-post" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>Payment Structure</Label>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="useTieredPayments"
                    checked={formData.useTieredPayments}
                    onCheckedChange={(checked) => 
                      setFormData((prev) => ({ 
                        ...prev, 
                        useTieredPayments: !!checked,
                        tieredPayments: checked ? [] : [],
                        finalServices: checked ? [] : []
                      }))
                    }
                  />
                  <Label htmlFor="useTieredPayments" className="text-sm">Use Tiered Payments</Label>
                </div>
              </div>

              {/* Tiered Payments Structure */}
              {formData.useTieredPayments ? (
                <div className="space-y-6 p-4 border border-gray-700 rounded-lg bg-gray-900/50">
                  <h4 className="text-lg font-medium text-white">Tiered Payment Structure</h4>
                  
                  {/* Add Tier Button */}
                  <div className="flex justify-end">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={addTieredPayment}
                      className="flex items-center space-x-2"
                    >
                      <Plus className="h-4 w-4" />
                      <span>Add Payment Tier</span>
                    </Button>
                  </div>

                  {/* Tiers */}
                  {formData.tieredPayments.map((tier, tierIndex) => (
                    <div key={tierIndex} className="space-y-4 p-4 border border-gray-600 rounded-lg bg-gray-800/50">
                      <div className="flex items-center justify-between">
                        <h5 className="font-medium text-white">
                          Tier {tierIndex + 1} - {tierIndex === 0 ? 'Initial Period' : `After ${formData.tieredPayments.slice(0, tierIndex).reduce((sum, t) => sum + t.duration_months, 0)} months`}
                        </h5>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeTieredPayment(tierIndex)}
                          className="text-red-400 hover:text-red-300"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                      
                      {/* Duration and Base Rate */}
                      <div className="grid grid-cols-3 gap-4">
                        <div className="space-y-2">
                          <Label>Duration</Label>
                          <Input
                            type="number"
                            placeholder="Number"
                            value={tier.duration_months || ""}
                            onChange={(e) => updateTieredPayment(tierIndex, "duration_months", Number.parseInt(e.target.value) || 1)}
                            className="bg-black border-gray-800"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Period Type</Label>
                          <Select
                            value={tier.payment_type}
                            onValueChange={(value) => updateTieredPayment(tierIndex, "payment_type", value)}
                          >
                            <SelectTrigger className="bg-black border-gray-800">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-black border-gray-800">
                              <SelectItem value="monthly">Months</SelectItem>
                              <SelectItem value="weekly">Weeks</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>Base Rate (₹)</Label>
                          <Input
                            type="number"
                            placeholder="Amount"
                            value={tier.amount || ""}
                            onChange={(e) => updateTieredPayment(tierIndex, "amount", Number.parseFloat(e.target.value) || 0)}
                            className="bg-black border-gray-800"
                          />
                        </div>
                      </div>

                      {/* Services for this tier */}
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <Label>Services for this tier</Label>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => addTierService(tierIndex)}
                            className="flex items-center space-x-2"
                          >
                            <Plus className="h-4 w-4" />
                            <span>Add Service</span>
                          </Button>
                        </div>
                        {tier.services.map((service, serviceIndex) => (
                          <div key={serviceIndex} className="flex items-center space-x-2">
                            <Input
                              placeholder="Service name (e.g., LinkedIn)"
                              value={service.name}
                              onChange={(e) => updateTierService(tierIndex, serviceIndex, "name", e.target.value)}
                              className="bg-black border-gray-800 flex-1"
                            />
                            <Input
                              type="number"
                              placeholder="Price"
                              value={service.price || ""}
                              onChange={(e) => updateTierService(tierIndex, serviceIndex, "price", Number.parseFloat(e.target.value) || 0)}
                              className="bg-black border-gray-800 w-24"
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => removeTierService(tierIndex, serviceIndex)}
                              className="text-red-400 hover:text-red-300"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}

                  {formData.tieredPayments.length === 0 && (
                    <div className="text-center py-4 text-gray-500">
                      No payment tiers added yet. Click "Add Payment Tier" to start.
                    </div>
                  )}

                  {/* Final Payment Structure (after tiers complete) */}
                  <div className="space-y-4 p-4 border border-blue-600 rounded-lg bg-blue-900/20">
                    <h5 className="font-medium text-blue-400">
                      Final Payment Structure (After All Tiers Complete)
                    </h5>
                    
                    {/* Final Base Rate */}
                    {formData.paymentType === "monthly" && (
                      <div className="space-y-2">
                        <Label htmlFor="finalMonthlyRate">Final Monthly Rate (₹)</Label>
                        <Input
                          id="finalMonthlyRate"
                          type="number"
                          value={formData.finalMonthlyRate}
                          onChange={(e) => setFormData((prev) => ({ ...prev, finalMonthlyRate: e.target.value }))}
                          className="bg-black border-gray-800"
                        />
                      </div>
                    )}

                    {formData.paymentType === "weekly" && (
                      <div className="space-y-2">
                        <Label htmlFor="finalWeeklyRate">Final Weekly Rate (₹)</Label>
                        <Input
                          id="finalWeeklyRate"
                          type="number"
                          value={formData.finalWeeklyRate}
                          onChange={(e) => setFormData((prev) => ({ ...prev, finalWeeklyRate: e.target.value }))}
                          className="bg-black border-gray-800"
                        />
                      </div>
                    )}

                    {/* Final Services */}
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <Label>Final Services & Pricing</Label>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={addFinalService}
                          className="flex items-center space-x-2"
                        >
                          <Plus className="h-4 w-4" />
                          <span>Add Service</span>
                        </Button>
                      </div>
                      {formData.finalServices.map((service, index) => (
                        <div key={index} className="flex items-center space-x-2">
                          <Input
                            placeholder="Service name (e.g., Instagram)"
                            value={service.name}
                            onChange={(e) => updateFinalService(index, "name", e.target.value)}
                            className="bg-black border-gray-800 flex-1"
                          />
                          <Input
                            type="number"
                            placeholder="Price"
                            value={service.price || ""}
                            onChange={(e) => updateFinalService(index, "price", Number.parseFloat(e.target.value) || 0)}
                            className="bg-black border-gray-800 w-24"
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeFinalService(index)}
                            className="text-red-400 hover:text-red-300"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                /* Normal Payment Structure */
                <div className="space-y-4 p-4 border border-gray-700 rounded-lg bg-gray-900/50">
                  <h4 className="text-lg font-medium text-white">Standard Payment Structure</h4>
                  
                  {formData.paymentType === "monthly" && (
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="monthlyRate">Monthly Rate (₹)</Label>
                        <Input
                          id="monthlyRate"
                          type="number"
                          value={formData.monthlyRate}
                          onChange={(e) => setFormData((prev) => ({ ...prev, monthlyRate: e.target.value }))}
                          className="bg-black border-gray-800"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="nextPayment">Next Payment Date</Label>
                        <Input
                          id="nextPayment"
                          type="date"
                          value={formData.nextPayment}
                          onChange={(e) => setFormData((prev) => ({ ...prev, nextPayment: e.target.value }))}
                          className="bg-black border-gray-800"
                        />
                      </div>
                    </div>
                  )}

                  {formData.paymentType === "weekly" && (
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="weeklyRate">Weekly Rate (₹)</Label>
                        <Input
                          id="weeklyRate"
                          type="number"
                          value={formData.weeklyRate}
                          onChange={(e) => setFormData((prev) => ({ ...prev, weeklyRate: e.target.value }))}
                          className="bg-black border-gray-800"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="nextPayment">Next Payment Date</Label>
                        <Input
                          id="nextPayment"
                          type="date"
                          value={formData.nextPayment}
                          onChange={(e) => setFormData((prev) => ({ ...prev, nextPayment: e.target.value }))}
                          className="bg-black border-gray-800"
                        />
                      </div>
                    </div>
                  )}

                  {/* Normal Services */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <Label>Services & Pricing</Label>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={addService}
                        className="flex items-center space-x-2"
                      >
                        <Plus className="h-4 w-4" />
                        <span>Add Service</span>
                      </Button>
                    </div>
                    {formData.services.map((service, index) => (
                      <div key={index} className="flex items-center space-x-2">
                        <Input
                          placeholder="Service name (e.g., Twitter)"
                          value={service.name}
                          onChange={(e) => updateService(index, "name", e.target.value)}
                          className="bg-black border-gray-800 flex-1"
                        />
                        <Input
                          type="number"
                          placeholder="Price"
                          value={service.price || ""}
                          onChange={(e) => updateService(index, "price", Number.parseFloat(e.target.value) || 0)}
                          className="bg-black border-gray-800 w-24"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeService(index)}
                          className="text-red-400 hover:text-red-300"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {formData.paymentType === "per-post" && (
            <div className="space-y-4">
              <Label>Per Post Rates (₹)</Label>
              <div className="grid grid-cols-2 gap-4">
                {postTypes.map((postType) => (
                  <div key={postType} className="flex items-center space-x-2">
                    <Label className="text-sm flex-1">{postType}</Label>
                    <Input
                      type="number"
                      placeholder="0"
                      value={formData.perPostRates[postType] || ""}
                      onChange={(e) => handlePerPostRateChange(postType, e.target.value)}
                      className="bg-black border-gray-800 w-20"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData((prev) => ({ ...prev, notes: e.target.value }))}
              className="bg-black border-gray-800"
              rows={3}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" className="bg-white text-black hover:bg-gray-200">
              Add Client
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
