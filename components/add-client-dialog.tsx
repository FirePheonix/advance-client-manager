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
import "../app/clients/clients.css"

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
    nextPayment: "",
    fixedPaymentDay: 1, // Default to 1st of month
    services: [] as ServiceEntry[], // For normal payment clients
    perPostRates: {} as Record<string, number>,
    customPostTypes: [] as string[], // Array of custom post types
    tieredPayments: [] as TieredPaymentEntry[],
    // Final services (after tiers complete) 
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

  // Custom post type functions
  const addCustomPostType = () => {
    setFormData((prev) => ({
      ...prev,
      customPostTypes: [...prev.customPostTypes, ""],
    }))
  }

  const removeCustomPostType = (index: number) => {
    setFormData((prev) => {
      const updatedCustomTypes = [...prev.customPostTypes]
      const removedType = updatedCustomTypes[index]
      
      // Also remove from perPostRates if it exists
      const updatedRates = { ...prev.perPostRates }
      if (removedType && removedType in updatedRates) {
        delete updatedRates[removedType]
      }
      
      return {
        ...prev,
        customPostTypes: updatedCustomTypes.filter((_, i) => i !== index),
        perPostRates: updatedRates
      }
    })
  }

  const updateCustomPostType = (index: number, value: string) => {
    setFormData((prev) => {
      const oldType = prev.customPostTypes[index]
      const updatedCustomTypes = [...prev.customPostTypes]
      updatedCustomTypes[index] = value
      
      // Transfer the rate from old type name to new type name
      const updatedRates = { ...prev.perPostRates }
      if (oldType && oldType in updatedRates) {
        const rate = updatedRates[oldType]
        delete updatedRates[oldType]
        updatedRates[value] = rate
      }
      
      return {
        ...prev,
        customPostTypes: updatedCustomTypes,
        perPostRates: updatedRates
      }
    })
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

    // Convert tiered payments with services (no base amount)
    const tieredPaymentsData = formData.tieredPayments.map(tier => ({
      amount: 0, // No base amount - payment is sum of services only
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
      monthly_rate: null, // No base rate - payment is sum of services
      weekly_rate: null, // No base rate - payment is sum of services
      next_payment: formData.nextPayment || null,
      fixed_payment_day: formData.paymentType === 'per-post' ? formData.fixedPaymentDay : null,
      services: servicesRecord,
      per_post_rates: Object.keys(formData.perPostRates).length > 0 ? formData.perPostRates : {},
      tiered_payments: tieredPaymentsData,
      final_monthly_rate: null, // No base rate - payment is sum of services
      final_weekly_rate: null, // No base rate - payment is sum of services
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
      nextPayment: "",
      fixedPaymentDay: 1,
      services: [],
      perPostRates: {},
      customPostTypes: [],
      tieredPayments: [],
      finalServices: [],
      notes: "",
      useTieredPayments: false,
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="add-client-dialog bg-white border-gray-200 text-gray-900 max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-gray-900">Add New Client</DialogTitle>
          <DialogDescription className="text-gray-600">
            Add a new client with tiered or normal payment structure.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-gray-700 font-medium">Client Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                className="bg-white border-gray-300 text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="company" className="text-gray-700 font-medium">Company</Label>
              <Input
                id="company"
                value={formData.company}
                onChange={(e) => setFormData((prev) => ({ ...prev, company: e.target.value }))}
                className="bg-white border-gray-300 text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-gray-700 font-medium">Email *</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData((prev) => ({ ...prev, email: e.target.value }))}
                className="bg-white border-gray-300 text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone" className="text-gray-700 font-medium">Phone</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => setFormData((prev) => ({ ...prev, phone: e.target.value }))}
                className="bg-white border-gray-300 text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
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
                  <div className="flex items-center justify-between">
                    <h4 className="text-lg font-medium text-white">Tiered Payment Structure</h4>
                    <div className="space-y-2">
                      <Label htmlFor="tieredNextPayment">Next Payment Date</Label>
                      <Input
                        id="tieredNextPayment"
                        type="date"
                        value={formData.nextPayment}
                        onChange={(e) => setFormData((prev) => ({ ...prev, nextPayment: e.target.value }))}
                        className="bg-black border-gray-800"
                      />
                    </div>
                  </div>
                  
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
                      
                      {/* Duration Settings */}
                      <div className="grid grid-cols-2 gap-4">
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
                  
                  {/* Next Payment Date */}
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
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="fixedPaymentDay">Fixed Payment Day (Monthly)</Label>
                  <div className="flex items-center space-x-2">
                    <Select
                      value={formData.fixedPaymentDay.toString()}
                      onValueChange={(value) => setFormData(prev => ({ ...prev, fixedPaymentDay: parseInt(value) }))}
                    >
                      <SelectTrigger className="bg-black border-gray-800 text-white">
                        <SelectValue placeholder="Select day of month" />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.from({ length: 28 }, (_, i) => i + 1).map((day) => (
                          <SelectItem key={day} value={day.toString()}>
                            {day}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <span className="text-gray-400">of every month</span>
                  </div>
                  <p className="text-xs text-gray-400">
                    This client will be billed on this day of each month based on total posts
                  </p>
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
                  <p className="text-xs text-gray-400">
                    Leave blank to automatically set based on fixed payment day
                  </p>
                </div>
              </div>

              <div className="border-t border-gray-800 pt-4">
                <Label className="text-lg font-medium mb-2 block">Per Post Rates (₹)</Label>
                <p className="text-sm text-gray-400 mb-4">
                  Set the rate for each type of post. The client will be billed based on the number of posts created each month.
                </p>
                
                {/* Default post types */}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {postTypes.map((postType) => (
                    <div key={postType} className="flex items-center space-x-2 border border-gray-800 rounded-md p-3">
                      <Label className="text-sm flex-1">{postType}</Label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">₹</span>
                        <Input
                          type="number"
                          placeholder="0"
                          value={formData.perPostRates[postType] || ""}
                          onChange={(e) => handlePerPostRateChange(postType, e.target.value)}
                          className="bg-black border-gray-800 w-24 pl-7"
                        />
                      </div>
                    </div>
                  ))}
                </div>
                
                {/* Custom post types */}
                {formData.customPostTypes.length > 0 && (
                  <div className="mt-4">
                    <Label className="text-base font-medium mb-2 block">Custom Post Types</Label>
                    <div className="space-y-3">
                      {formData.customPostTypes.map((postType, index) => (
                        <div key={index} className="flex items-center space-x-2 border border-gray-800 rounded-md p-3">
                          <Input
                            placeholder="Custom post type"
                            value={postType}
                            onChange={(e) => updateCustomPostType(index, e.target.value)}
                            className="bg-black border-gray-800 flex-1"
                          />
                          <div className="relative flex-shrink-0">
                            <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">₹</span>
                            <Input
                              type="number"
                              placeholder="0"
                              value={formData.perPostRates[postType] || ""}
                              onChange={(e) => handlePerPostRateChange(postType, e.target.value)}
                              className="bg-black border-gray-800 w-24 pl-7"
                            />
                          </div>
                          <Button
                            type="button"
                            variant="destructive"
                            size="sm"
                            onClick={() => removeCustomPostType(index)}
                            className="flex-shrink-0"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Add custom post type button */}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addCustomPostType}
                  className="mt-4 border-blue-600 text-blue-400 hover:bg-blue-900/20"
                >
                  <Plus className="h-4 w-4 mr-2" /> Add Custom Post Type
                </Button>
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
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="border-gray-300 text-gray-700 hover:bg-gray-50">
              Cancel
            </Button>
            <Button type="submit" className="bg-blue-600 text-white hover:bg-blue-700">
              Add Client
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
