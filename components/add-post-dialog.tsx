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

interface AddPostDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  client: any
  onAddPost: (post: any) => void
}

export function AddPostDialog({ open, onOpenChange, client, onAddPost }: AddPostDialogProps) {
  const [formData, setFormData] = useState({
    postType: "",
    description: "",
    quantity: 1,
    customAmount: "",
  })

  const getPostRate = (postType: string) => {
    return client.perPostRates?.[postType] || 0
  }

  const calculateTotal = () => {
    if (formData.customAmount) {
      return Number.parseFloat(formData.customAmount) * formData.quantity
    }
    return getPostRate(formData.postType) * formData.quantity
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onAddPost({
      ...formData,
      amount: calculateTotal(),
    })
    setFormData({
      postType: "",
      description: "",
      quantity: 1,
      customAmount: "",
    })
  }

  const availablePostTypes = Object.keys(client.perPostRates || {})

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-gray-800 border-gray-700 text-white">
        <DialogHeader>
          <DialogTitle>Add New Post</DialogTitle>
          <DialogDescription className="text-gray-400">Add a new post for {client.name}</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="postType">Post Type *</Label>
            <Select
              value={formData.postType}
              onValueChange={(value) => setFormData((prev) => ({ ...prev, postType: value }))}
            >
              <SelectTrigger className="bg-gray-700 border-gray-600">
                <SelectValue placeholder="Select post type" />
              </SelectTrigger>
              <SelectContent className="bg-gray-700 border-gray-600">
                {availablePostTypes.map((type) => (
                  <SelectItem key={type} value={type}>
                    {type} - ${getPostRate(type)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description *</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
              className="bg-gray-700 border-gray-600"
              placeholder="Brief description of the post..."
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="quantity">Quantity</Label>
              <Input
                id="quantity"
                type="number"
                min="1"
                value={formData.quantity}
                onChange={(e) => setFormData((prev) => ({ ...prev, quantity: Number.parseInt(e.target.value) || 1 }))}
                className="bg-gray-700 border-gray-600"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="customAmount">Custom Rate (optional)</Label>
              <Input
                id="customAmount"
                type="number"
                step="0.01"
                value={formData.customAmount}
                onChange={(e) => setFormData((prev) => ({ ...prev, customAmount: e.target.value }))}
                className="bg-gray-700 border-gray-600"
                placeholder={`Default: $${getPostRate(formData.postType)}`}
              />
            </div>
          </div>

          {formData.postType && (
            <div className="p-4 bg-gray-700 rounded-lg">
              <div className="flex justify-between items-center">
                <span className="text-gray-300">Total Amount:</span>
                <span className="text-xl font-bold text-green-400">${calculateTotal().toFixed(2)}</span>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" className="bg-white text-black hover:bg-gray-200">
              Add Post
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
