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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface AddTeamMemberDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onAddMember: (member: any) => void
}

const roleOptions = [
  "Content Creator",
  "Graphic Designer",
  "Social Media Manager",
  "Video Editor",
  "Copywriter",
  "Social Media Intern",
  "Marketing Assistant",
]

export function AddTeamMemberDialog({ open, onOpenChange, onAddMember }: AddTeamMemberDialogProps) {
  const [formData, setFormData] = useState({
    name: "",
    role: "",
    email: "",
    phone: "",
    salary: "",
    paymentDate: "1st of every month",
    status: "active",
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    // Prepare the team member data with proper null handling
    const memberData = {
      name: formData.name,
      role: formData.role,
      email: formData.email,
      phone: formData.phone || null, // Convert empty string to null
      salary: Number.parseFloat(formData.salary) || 0,
      payment_date: formData.paymentDate,
      status: formData.status,
    }

    onAddMember(memberData)

    // Reset form
    setFormData({
      name: "",
      role: "",
      email: "",
      phone: "",
      salary: "",
      paymentDate: "1st of every month",
      status: "active",
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-black border-gray-800 text-white max-w-md">
        <DialogHeader>
          <DialogTitle>Add New Team Member</DialogTitle>
          <DialogDescription className="text-gray-400">Add a new team member to your agency.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Full Name *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
              className="bg-black border-gray-800 text-white"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="role">Role *</Label>
            <Select value={formData.role} onValueChange={(value) => setFormData((prev) => ({ ...prev, role: value }))}>
              <SelectTrigger className="bg-black border-gray-800 text-white">
                <SelectValue placeholder="Select role" />
              </SelectTrigger>
              <SelectContent className="bg-black border-gray-800">
                {roleOptions.map((role) => (
                  <SelectItem key={role} value={role}>
                    {role}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email *</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData((prev) => ({ ...prev, email: e.target.value }))}
              className="bg-black border-gray-800 text-white"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Phone</Label>
            <Input
              id="phone"
              value={formData.phone}
              onChange={(e) => setFormData((prev) => ({ ...prev, phone: e.target.value }))}
              className="bg-black border-gray-800 text-white"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="salary">Monthly Salary (₹) *</Label>
            <Input
              id="salary"
              type="number"
              value={formData.salary}
              onChange={(e) => setFormData((prev) => ({ ...prev, salary: e.target.value }))}
              className="bg-black border-gray-800 text-white"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="paymentDate">Payment Date</Label>
            <Select
              value={formData.paymentDate}
              onValueChange={(value) => setFormData((prev) => ({ ...prev, paymentDate: value }))}
            >
              <SelectTrigger className="bg-black border-gray-800 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-black border-gray-800">
                <SelectItem value="1st of every month">1st of every month</SelectItem>
                <SelectItem value="5th of every month">5th of every month</SelectItem>
                <SelectItem value="15th of every month">15th of every month</SelectItem>
                <SelectItem value="Last day of month">Last day of month</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="bg-black border-gray-800 text-white hover:bg-gray-900"
            >
              Cancel
            </Button>
            <Button type="submit" className="bg-white text-black hover:bg-gray-200">
              Add Member
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
