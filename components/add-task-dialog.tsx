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

interface AddTaskDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (task: {
    title: string
    description: string
    priority: "low" | "medium" | "high"
    platform: string
    start_date?: string
    end_date?: string
    dateRange: string
    assignees: string[]
    comments_count: number
  }) => void
  defaultStatus?: string | null
}

const platforms = ["Instagram", "LinkedIn", "Twitter", "Facebook", "YouTube", "Reddit", "Analytics"]
const teamMembers = ["JD", "SM", "AM", "KL", "MR"]

export function AddTaskDialog({ open, onOpenChange, onSubmit, defaultStatus }: AddTaskDialogProps) {
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    priority: "medium" as "low" | "medium" | "high",
    platform: "",
    startDate: "",
    endDate: "",
    assignees: [] as string[],
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    const dateRange =
      formData.startDate && formData.endDate
        ? `${new Date(formData.startDate).toLocaleDateString()} - ${new Date(formData.endDate).toLocaleDateString()}`
        : "No dates set"

    // Prepare task data with proper null handling for dates
    const taskData = {
      title: formData.title,
      description: formData.description || "", // Ensure description is never null
      priority: formData.priority,
      platform: formData.platform,
      start_date: formData.startDate || null, // Convert empty string to null
      end_date: formData.endDate || null, // Convert empty string to null
      assignees: formData.assignees,
      comments_count: 0,
      dateRange, // This is for display only, not stored in DB
    }

    onSubmit(taskData)

    // Reset form
    setFormData({
      title: "",
      description: "",
      priority: "medium",
      platform: "",
      startDate: "",
      endDate: "",
      assignees: [],
    })
  }

  const handleAssigneeToggle = (member: string) => {
    setFormData((prev) => ({
      ...prev,
      assignees: prev.assignees.includes(member)
        ? prev.assignees.filter((a) => a !== member)
        : [...prev.assignees, member],
    }))
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-black border-gray-800 text-white max-w-md">
        <DialogHeader>
          <DialogTitle>Add New Task</DialogTitle>
          <DialogDescription className="text-gray-400">
            Create a new task {defaultStatus && `for ${defaultStatus.replace("-", " ")}`}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Task Title *</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))}
              className="bg-black border-gray-800"
              placeholder="e.g., Create Instagram posts for campaign"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
              className="bg-black border-gray-800"
              placeholder="Describe the task details..."
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="priority">Priority</Label>
              <Select
                value={formData.priority}
                onValueChange={(value: "low" | "medium" | "high") =>
                  setFormData((prev) => ({ ...prev, priority: value }))
                }
              >
                <SelectTrigger className="bg-black border-gray-800">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-black border-gray-800">
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="platform">Platform</Label>
              <Select
                value={formData.platform}
                onValueChange={(value) => setFormData((prev) => ({ ...prev, platform: value }))}
              >
                <SelectTrigger className="bg-black border-gray-800">
                  <SelectValue placeholder="Select platform" />
                </SelectTrigger>
                <SelectContent className="bg-black border-gray-800">
                  {platforms.map((platform) => (
                    <SelectItem key={platform} value={platform}>
                      {platform}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startDate">Start Date</Label>
              <Input
                id="startDate"
                type="date"
                value={formData.startDate}
                onChange={(e) => setFormData((prev) => ({ ...prev, startDate: e.target.value }))}
                className="bg-black border-gray-800"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="endDate">End Date</Label>
              <Input
                id="endDate"
                type="date"
                value={formData.endDate}
                onChange={(e) => setFormData((prev) => ({ ...prev, endDate: e.target.value }))}
                className="bg-black border-gray-800"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Assign to Team Members</Label>
            <div className="flex flex-wrap gap-2">
              {teamMembers.map((member) => (
                <Button
                  key={member}
                  type="button"
                  variant={formData.assignees.includes(member) ? "default" : "outline"}
                  size="sm"
                  onClick={() => handleAssigneeToggle(member)}
                  className={
                    formData.assignees.includes(member)
                      ? "bg-white text-black"
                      : "bg-black border-gray-800 text-white hover:bg-gray-900"
                  }
                >
                  {member}
                </Button>
              ))}
            </div>
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
              Add Task
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
