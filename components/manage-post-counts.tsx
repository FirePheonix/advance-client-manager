"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Plus, Minus, Save, DollarSign } from "lucide-react"
import { getPostCountsForClient, updatePostCount, calculateTotalPerPostAmount, createPerPostPayment, getMonthYearFromDate } from "@/lib/database"
import { PostCount } from "@/lib/supabase"
import { toast } from "@/hooks/use-toast"

interface ManagePostCountsProps {
  clientId: string
  clientName: string
  perPostRates: Record<string, number>
  nextPayment?: string // Add next payment date
}

export function ManagePostCounts({ clientId, clientName, perPostRates, nextPayment }: ManagePostCountsProps) {
  const [postCounts, setPostCounts] = useState<PostCount[]>([])
  const [totalAmount, setTotalAmount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [markAsPaidDialogOpen, setMarkAsPaidDialogOpen] = useState(false)
  
  // Load post counts for the client
  useEffect(() => {
    loadData()
  }, [clientId])
  
  const loadData = async () => {
    try {
      setLoading(true)
      
      // Get the monthYear for the next payment
      const monthYear = nextPayment ? getMonthYearFromDate(nextPayment) : undefined
      
      // Get existing post counts for the correct month
      const counts = await getPostCountsForClient(clientId, monthYear)
      
      // Create entries for any missing platforms that have rates defined
      const existingPlatforms = new Set(counts.map(c => c.platform))
      const allCounts = [...counts]
      
      const currentMonthYear = monthYear || new Date().toISOString().split('T')[0].substring(0, 7)
      
      for (const platform of Object.keys(perPostRates)) {
        if (!existingPlatforms.has(platform) && perPostRates[platform] > 0) {
          // Create a placeholder (not yet saved to DB)
          allCounts.push({
            id: `temp-${platform}`,
            client_id: clientId,
            platform,
            count: 0,
            month_year: currentMonthYear,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
        }
      }
      
      setPostCounts(allCounts)
      
      // Calculate total amount for the correct month
      const total = await calculateTotalPerPostAmount(clientId, monthYear)
      setTotalAmount(total)
    } catch (error) {
      console.error("Error loading post counts:", error)
      toast({
        title: "Error",
        description: "Failed to load post counts",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }
  
  const handleCountChange = async (platform: string, newCount: number) => {
    if (newCount < 0) return // Don't allow negative counts
    
    try {
      // Update locally first for responsive UI
      setPostCounts(prev => prev.map(p => 
        p.platform === platform ? { ...p, count: newCount } : p
      ))
      
      // Get the monthYear for the next payment
      const monthYear = nextPayment ? getMonthYearFromDate(nextPayment) : undefined
      
      // Update in database with the correct month
      await updatePostCount(clientId, platform, newCount, monthYear)
      
      // Recalculate total for the correct month
      const total = await calculateTotalPerPostAmount(clientId, monthYear)
      setTotalAmount(total)
      
      // Trigger custom event to notify other components of the change
      const event = new CustomEvent('postCountsUpdated', { 
        detail: { clientId, platform, newCount, totalAmount: total }
      })
      window.dispatchEvent(event)
    } catch (error) {
      console.error("Error updating post count:", error)
      toast({
        title: "Error",
        description: "Failed to update post count",
        variant: "destructive"
      })
      
      // Reload data on error to ensure UI is in sync
      loadData()
    }
  }
  
  const handleIncrement = (platform: string) => {
    const currentCount = postCounts.find(p => p.platform === platform)?.count || 0
    handleCountChange(platform, currentCount + 1)
  }
  
  const handleDecrement = (platform: string) => {
    const currentCount = postCounts.find(p => p.platform === platform)?.count || 0
    if (currentCount > 0) {
      handleCountChange(platform, currentCount - 1)
    }
  }
  
  const handleMarkAsPaid = async () => {
    try {
      setSaving(true)
      
      // Get the monthYear for the next payment
      const monthYear = nextPayment ? getMonthYearFromDate(nextPayment) : undefined
      
      // Create payment record and reset counts for the correct month
      await createPerPostPayment(clientId, totalAmount, postCounts, monthYear)
      
      toast({
        title: "Success",
        description: `Payment of ₹${totalAmount} recorded for ${clientName}`,
      })
      
      // Reload data
      loadData()
      setMarkAsPaidDialogOpen(false)
    } catch (error) {
      console.error("Error marking as paid:", error)
      toast({
        title: "Error",
        description: "Failed to record payment",
        variant: "destructive"
      })
    } finally {
      setSaving(false)
    }
  }
  
  // Get the month label for display
  const monthLabel = nextPayment ? (() => {
    const date = new Date(nextPayment)
    return date.toLocaleString('default', { month: 'long', year: 'numeric' })
  })() : undefined
  
  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount)
  }
  
  return (
    <div className="space-y-4">
      <Card className="bg-black border-gray-800">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <div>
            <CardTitle className="text-xl font-bold">Post Counts - {clientName}</CardTitle>
            {monthLabel && (
              <div className="text-sm text-gray-400 font-normal">For Payment Month: {monthLabel}</div>
            )}
          </div>
          <Button onClick={() => setMarkAsPaidDialogOpen(true)} disabled={totalAmount <= 0}>
            <DollarSign className="h-4 w-4 mr-2" /> Mark as Paid
          </Button>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {loading ? (
              <div className="text-gray-400">Loading post counts...</div>
            ) : postCounts.length === 0 ? (
              <div className="text-gray-400">No post counts found</div>
            ) : (
              postCounts
                .filter(p => perPostRates[p.platform] > 0) // Only show platforms with rates
                .sort((a, b) => a.platform.localeCompare(b.platform))
                .map((post) => (
                  <Card key={post.platform} className="border border-gray-700 bg-gray-900">
                    <CardContent className="p-4">
                      <div className="flex flex-col space-y-2">
                        <div className="flex justify-between items-center">
                          <Label className="font-medium">{post.platform}</Label>
                          <span className="text-sm text-gray-400">
                            Rate: {formatCurrency(perPostRates[post.platform] || 0)}
                          </span>
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => handleDecrement(post.platform)}
                            disabled={post.count <= 0}
                          >
                            <Minus className="h-4 w-4" />
                          </Button>
                          
                          <Input
                            type="number"
                            value={post.count}
                            onChange={(e) => handleCountChange(post.platform, parseInt(e.target.value) || 0)}
                            className="bg-black border-gray-700 text-center"
                          />
                          
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => handleIncrement(post.platform)}
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
                        </div>
                        
                        <div className="text-right text-sm">
                          Total: {formatCurrency((post.count || 0) * (perPostRates[post.platform] || 0))}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
            )}
          </div>
        </CardContent>
        <CardFooter className="border-t border-gray-800 pt-4">
          <div className="w-full flex justify-between items-center">
            <span className="text-lg">Total Amount:</span>
            <span className="text-2xl font-bold">{formatCurrency(totalAmount)}</span>
          </div>
        </CardFooter>
      </Card>
      
      {/* Mark as Paid Dialog */}
      <Dialog open={markAsPaidDialogOpen} onOpenChange={setMarkAsPaidDialogOpen}>
        <DialogContent className="bg-black border-gray-800 text-white">
          <DialogHeader>
            <DialogTitle>Confirm Payment</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <p>
              Are you sure you want to mark the following as paid?
            </p>
            <div className="bg-gray-900 p-4 rounded-md">
              <div className="space-y-2">
                {postCounts
                  .filter(p => p.count > 0)
                  .map(post => (
                    <div key={post.platform} className="flex justify-between">
                      <span>{post.platform}:</span>
                      <span>{post.count} posts × {formatCurrency(perPostRates[post.platform] || 0)}</span>
                    </div>
                  ))}
                <div className="border-t border-gray-700 pt-2 mt-2 font-bold flex justify-between">
                  <span>Total:</span>
                  <span>{formatCurrency(totalAmount)}</span>
                </div>
              </div>
            </div>
            <p className="text-sm text-gray-400">
              This will create a payment record and reset all post counts to zero.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMarkAsPaidDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleMarkAsPaid} disabled={saving}>
              {saving ? "Processing..." : "Confirm Payment"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
