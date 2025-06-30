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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

interface AddPostToTimelineDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onAddPost: (post: { date: string; platform: string; count: number; amount?: number }) => void
  onAddPayment: (payment: { date: string; amount: number; description: string }) => void
}

const platforms = ["Instagram", "LinkedIn", "Twitter", "Facebook", "YouTube", "Reddit"]

export function AddPostToTimelineDialog({ open, onOpenChange, onAddPost, onAddPayment }: AddPostToTimelineDialogProps) {
  const [postFormData, setPostFormData] = useState({
    date: new Date().toISOString().split("T")[0],
    platform: "",
    count: 1,
    amount: "",
  })

  const [paymentFormData, setPaymentFormData] = useState({
    date: new Date().toISOString().split("T")[0],
    amount: "",
    description: "",
  })

  const handlePostSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onAddPost({
      date: postFormData.date,
      platform: postFormData.platform,
      count: postFormData.count,
      amount: postFormData.amount ? Number.parseFloat(postFormData.amount) : undefined,
    })
    setPostFormData({
      date: new Date().toISOString().split("T")[0],
      platform: "",
      count: 1,
      amount: "",
    })
  }

  const handlePaymentSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onAddPayment({
      date: paymentFormData.date,
      amount: Number.parseFloat(paymentFormData.amount),
      description: paymentFormData.description || "Payment received",
    })
    setPaymentFormData({
      date: new Date().toISOString().split("T")[0],
      amount: "",
      description: "",
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-black border-gray-800 text-white">
        <DialogHeader>
          <DialogTitle>Add to Timeline</DialogTitle>
          <DialogDescription className="text-gray-400">
            Add a new post or payment entry to see it reflected in the timeline graph
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="post" className="w-full">
          <TabsList className="grid w-full grid-cols-2 bg-gray-900">
            <TabsTrigger value="post" className="data-[state=active]:bg-white data-[state=active]:text-black">
              Add Post
            </TabsTrigger>
            <TabsTrigger value="payment" className="data-[state=active]:bg-white data-[state=active]:text-black">
              Add Payment
            </TabsTrigger>
          </TabsList>

          <TabsContent value="post">
            <form onSubmit={handlePostSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="post-date">Date</Label>
                <Input
                  id="post-date"
                  type="date"
                  value={postFormData.date}
                  onChange={(e) => setPostFormData((prev) => ({ ...prev, date: e.target.value }))}
                  className="bg-black border-gray-800"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="platform">Platform</Label>
                <Select
                  value={postFormData.platform}
                  onValueChange={(value) => setPostFormData((prev) => ({ ...prev, platform: value }))}
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

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="count">Post Count</Label>
                  <Input
                    id="count"
                    type="number"
                    min="1"
                    value={postFormData.count}
                    onChange={(e) =>
                      setPostFormData((prev) => ({ ...prev, count: Number.parseInt(e.target.value) || 1 }))
                    }
                    className="bg-black border-gray-800"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="amount">Amount (₹) - Optional</Label>
                  <Input
                    id="amount"
                    type="number"
                    step="0.01"
                    value={postFormData.amount}
                    onChange={(e) => setPostFormData((prev) => ({ ...prev, amount: e.target.value }))}
                    className="bg-black border-gray-800"
                    placeholder="For per-post clients"
                  />
                </div>
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                  Cancel
                </Button>
                <Button type="submit" className="bg-white text-black hover:bg-gray-200">
                  Add Post
                </Button>
              </DialogFooter>
            </form>
          </TabsContent>

          <TabsContent value="payment">
            <form onSubmit={handlePaymentSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="payment-date">Payment Date</Label>
                <Input
                  id="payment-date"
                  type="date"
                  value={paymentFormData.date}
                  onChange={(e) => setPaymentFormData((prev) => ({ ...prev, date: e.target.value }))}
                  className="bg-black border-gray-800"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="payment-amount">Amount (₹) *</Label>
                <Input
                  id="payment-amount"
                  type="number"
                  step="0.01"
                  value={paymentFormData.amount}
                  onChange={(e) => setPaymentFormData((prev) => ({ ...prev, amount: e.target.value }))}
                  className="bg-black border-gray-800"
                  placeholder="Enter payment amount"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="payment-description">Description</Label>
                <Input
                  id="payment-description"
                  value={paymentFormData.description}
                  onChange={(e) => setPaymentFormData((prev) => ({ ...prev, description: e.target.value }))}
                  className="bg-black border-gray-800"
                  placeholder="e.g., Monthly retainer payment"
                />
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                  Cancel
                </Button>
                <Button type="submit" className="bg-white text-black hover:bg-gray-200">
                  Add Payment
                </Button>
              </DialogFooter>
            </form>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
