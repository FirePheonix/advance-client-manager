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

interface AddClientDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onAddClient: (client: any) => void
}

const serviceOptions = ["Twitter", "LinkedIn", "YouTube", "Instagram", "Reddit", "Facebook"]

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
    paymentType: "monthly",
    monthlyRate: "",
    nextPayment: "",
    services: [] as string[],
    perPostRates: {} as Record<string, number>,
    notes: "",
  })

  const handleServiceChange = (service: string, checked: boolean) => {
    if (checked) {
      setFormData((prev) => ({
        ...prev,
        services: [...prev.services, service],
      }))
    } else {
      setFormData((prev) => ({
        ...prev,
        services: prev.services.filter((s) => s !== service),
      }))
    }
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

    // Prepare the client data with proper null handling for dates and optional fields
    const clientData = {
      name: formData.name,
      email: formData.email,
      phone: formData.phone || null, // Convert empty string to null
      company: formData.company || null, // Convert empty string to null
      payment_type: formData.paymentType,
      monthly_rate: formData.monthlyRate ? Number.parseFloat(formData.monthlyRate) : null, // Convert empty to null
      next_payment: formData.nextPayment || null, // Convert empty string to null for date field
      services: formData.services,
      per_post_rates: Object.keys(formData.perPostRates).length > 0 ? formData.perPostRates : null, // Convert empty object to null
      notes: formData.notes || null, // Convert empty string to null
      status: "active",
    }

    onAddClient(clientData)

    // Reset form
    setFormData({
      name: "",
      email: "",
      phone: "",
      company: "",
      paymentType: "monthly",
      monthlyRate: "",
      nextPayment: "",
      services: [],
      perPostRates: {},
      notes: "",
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-black border-gray-800 text-white max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New Client</DialogTitle>
          <DialogDescription className="text-gray-400">
            Add a new client to your agency management system.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
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
                <SelectItem value="per-post">Per Post</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {formData.paymentType === "monthly" ? (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="monthlyRate">Monthly Rate ($)</Label>
                <Input
                  id="monthlyRate"
                  type="number"
                  value={formData.monthlyRate}
                  onChange={(e) => setFormData((prev) => ({ ...prev, monthlyRate: e.target.value }))}
                  className="bg-gray-700 border-gray-600"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="nextPayment">Next Payment Date</Label>
                <Input
                  id="nextPayment"
                  type="date"
                  value={formData.nextPayment}
                  onChange={(e) => setFormData((prev) => ({ ...prev, nextPayment: e.target.value }))}
                  className="bg-gray-700 border-gray-600"
                />
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <Label>Per Post Rates ($)</Label>
              <div className="grid grid-cols-2 gap-4">
                {postTypes.map((postType) => (
                  <div key={postType} className="flex items-center space-x-2">
                    <Label className="text-sm flex-1">{postType}</Label>
                    <Input
                      type="number"
                      placeholder="0"
                      value={formData.perPostRates[postType] || ""}
                      onChange={(e) => handlePerPostRateChange(postType, e.target.value)}
                      className="bg-gray-700 border-gray-600 w-20"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label>Platforms</Label>
            <div className="grid grid-cols-3 gap-3">
              {["Twitter", "LinkedIn", "YouTube", "Instagram", "Reddit", "Facebook"].map((platform) => (
                <div
                  key={platform}
                  className="flex items-center space-x-2 p-3 border border-gray-800 rounded-lg hover:border-gray-600 transition-colors"
                >
                  <Checkbox
                    id={platform}
                    checked={formData.services.includes(platform)}
                    onCheckedChange={(checked) => handleServiceChange(platform, checked as boolean)}
                  />
                  <Label htmlFor={platform} className="text-sm font-medium cursor-pointer">
                    {platform}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData((prev) => ({ ...prev, notes: e.target.value }))}
              className="bg-gray-700 border-gray-600"
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
