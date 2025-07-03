"use client"

import { useState, useEffect } from "react"
import { 
  Card, CardContent, CardDescription, CardHeader, CardTitle 
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { 
  Dialog, DialogContent, DialogDescription, DialogFooter, 
  DialogHeader, DialogTitle, DialogTrigger 
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { 
  Table, TableBody, TableCaption, TableCell, TableHead, 
  TableHeader, TableRow 
} from "@/components/ui/table"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "sonner"
import { 
  getOtherExpenses, 
  createOtherExpense, 
  updateOtherExpense, 
  deleteOtherExpense 
} from "@/lib/database"

export function formatCurrency(amount: number, currency: string = "INR", locale: string = "en-IN") {
    return amount.toLocaleString(locale, {
        style: "currency",
        currency,
        maximumFractionDigits: 2,
        minimumFractionDigits: 0,
    })
}

interface Expense {
  id: string
  title: string
  amount: number
  date: string
  description?: string | null
  created_at: string
}

export default function OtherExpensesPage() {
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false) // Separate loading state for form
  const [newExpense, setNewExpense] = useState({
    title: "",
    amount: "",
    date: new Date().toISOString().split("T")[0],
    description: ""
  })
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  
  // Calculate total expenses
  const totalExpenses = expenses.reduce((sum, expense) => sum + expense.amount, 0)
  
  useEffect(() => {
    loadExpenses()
  }, [])

  const loadExpenses = async () => {
    try {
      setIsLoading(true)
      console.log("Loading expenses...") // Debug log
      const data = await getOtherExpenses()
      console.log("Loaded expenses:", data) // Debug log
      setExpenses(data || [])
    } catch (error) {
      console.error("Error loading expenses:", error)
      toast.error("Failed to load expenses")
      setExpenses([]) // Set empty array on error
    } finally {
      setIsLoading(false)
    }
  }
  
  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validation
    if (!newExpense.title.trim()) {
      toast.error("Please enter an expense title")
      return
    }
    
    const amount = parseFloat(newExpense.amount)
    if (isNaN(amount) || amount <= 0) {
      toast.error("Please enter a valid amount greater than 0")
      return
    }
    
    if (!newExpense.date) {
      toast.error("Please select a date")
      return
    }
    
    setIsSubmitting(true)
    
    try {
      const expenseData = {
        title: newExpense.title.trim(),
        amount: amount,
        date: newExpense.date,
        description: newExpense.description.trim() || null
      }
      
      console.log("Creating expense with data:", expenseData)
      
      const addedExpense = await createOtherExpense(expenseData)
      console.log("Created expense:", addedExpense)
      
      // Add to local state immediately for better UX
      setExpenses(prev => [addedExpense, ...prev])
      
      // Reset form
      setNewExpense({
        title: "",
        amount: "",
        date: new Date().toISOString().split("T")[0],
        description: ""
      })
      
      setIsAddDialogOpen(false)
      toast.success("Expense added successfully!")
      
      // Optionally reload data to ensure consistency
      await loadExpenses()
      
    } catch (error) {
      console.error("Error creating expense:", error)
      const errorMessage = error instanceof Error ? error.message : "Failed to add expense"
      toast.error(errorMessage)
    } finally {
      setIsSubmitting(false)
    }
  }
  
  const handleUpdateExpense = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingExpense) return
    
    // Validation
    if (!editingExpense.title.trim()) {
      toast.error("Please enter an expense title")
      return
    }
    
    if (isNaN(editingExpense.amount) || editingExpense.amount <= 0) {
      toast.error("Please enter a valid amount greater than 0")
      return
    }
    
    setIsSubmitting(true)
    
    try {
      const updatedExpense = await updateOtherExpense(editingExpense.id, {
        title: editingExpense.title.trim(),
        amount: editingExpense.amount,
        date: editingExpense.date,
        description: editingExpense.description?.trim() || null
      })
      
      setExpenses(prev => 
        prev.map(expense => 
          expense.id === updatedExpense.id ? updatedExpense : expense
        )
      )
      
      setEditingExpense(null)
      setIsEditDialogOpen(false)
      toast.success("Expense updated successfully!")
      
    } catch (error) {
      console.error("Error updating expense:", error)
      const errorMessage = error instanceof Error ? error.message : "Failed to update expense"
      toast.error(errorMessage)
    } finally {
      setIsSubmitting(false)
    }
  }
  
  const handleDeleteExpense = async () => {
    if (!deletingId) return
    
    setIsSubmitting(true)
    
    try {
      await deleteOtherExpense(deletingId)
      setExpenses(prev => prev.filter(expense => expense.id !== deletingId))
      setIsDeleteDialogOpen(false)
      setDeletingId(null)
      toast.success("Expense deleted successfully!")
      
    } catch (error) {
      console.error("Error deleting expense:", error)
      const errorMessage = error instanceof Error ? error.message : "Failed to delete expense"
      toast.error(errorMessage)
    } finally {
      setIsSubmitting(false)
    }
  }

  const resetAddForm = () => {
    setNewExpense({
      title: "",
      amount: "",
      date: new Date().toISOString().split("T")[0],
      description: ""
    })
  }
  
  return (
    <div className="container mx-auto py-8">
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Other Expenses</CardTitle>
          <CardDescription>
            Manage your miscellaneous business expenses
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex justify-between items-center mb-6">
            <div>
              <p className="text-sm text-muted-foreground">Total Other Expenses</p>
              <p className="text-3xl font-bold text-red-500">
                {formatCurrency(totalExpenses)}
              </p>
            </div>
            <Dialog open={isAddDialogOpen} onOpenChange={(open) => {
              setIsAddDialogOpen(open)
              if (!open) resetAddForm()
            }}>
              <DialogTrigger asChild>
                <Button>Add New Expense</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add New Expense</DialogTitle>
                  <DialogDescription>
                    Enter the details for the new expense
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleAddExpense}>
                  <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                      <Label htmlFor="title">Expense Title *</Label>
                      <Input
                        id="title"
                        placeholder="e.g., Office supplies, Software subscription"
                        value={newExpense.title}
                        onChange={(e) => setNewExpense(prev => ({...prev, title: e.target.value}))}
                        required
                        disabled={isSubmitting}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="amount">Amount (₹) *</Label>
                      <Input
                        id="amount"
                        type="number"
                        min="0.01"
                        step="0.01"
                        placeholder="0.00"
                        value={newExpense.amount}
                        onChange={(e) => setNewExpense(prev => ({...prev, amount: e.target.value}))}
                        required
                        disabled={isSubmitting}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="date">Date *</Label>
                      <Input
                        id="date"
                        type="date"
                        value={newExpense.date}
                        onChange={(e) => setNewExpense(prev => ({...prev, date: e.target.value}))}
                        required
                        disabled={isSubmitting}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="description">Description</Label>
                      <Textarea
                        id="description"
                        placeholder="Optional description or notes..."
                        value={newExpense.description}
                        onChange={(e) => setNewExpense(prev => ({...prev, description: e.target.value}))}
                        rows={3}
                        disabled={isSubmitting}
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => setIsAddDialogOpen(false)}
                      disabled={isSubmitting}
                    >
                      Cancel
                    </Button>
                    <Button type="submit" disabled={isSubmitting}>
                      {isSubmitting ? "Adding..." : "Add Expense"}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>
          
          <Table>
            <TableCaption>List of all other business expenses</TableCaption>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8">
                    Loading expenses...
                  </TableCell>
                </TableRow>
              ) : expenses.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8">
                    No expenses found. Add your first expense above.
                  </TableCell>
                </TableRow>
              ) : (
                expenses.map((expense) => (
                  <TableRow key={expense.id}>
                    <TableCell className="font-medium">{expense.title}</TableCell>
                    <TableCell className="font-semibold">
                      {formatCurrency(expense.amount)}
                    </TableCell>
                    <TableCell>
                      {new Date(expense.date).toLocaleDateString('en-IN')}
                    </TableCell>
                    <TableCell className="max-w-xs">
                      <div className="truncate" title={expense.description || ""}>
                        {expense.description || "—"}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => {
                            setEditingExpense(expense)
                            setIsEditDialogOpen(true)
                          }}
                          disabled={isSubmitting}
                        >
                          Edit
                        </Button>
                        <Button 
                          variant="destructive" 
                          size="sm"
                          onClick={() => {
                            setDeletingId(expense.id)
                            setIsDeleteDialogOpen(true)
                          }}
                          disabled={isSubmitting}
                        >
                          Delete
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      
      {/* Edit Expense Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Expense</DialogTitle>
            <DialogDescription>
              Update the expense details
            </DialogDescription>
          </DialogHeader>
          {editingExpense && (
            <form onSubmit={handleUpdateExpense}>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="edit-title">Expense Title *</Label>
                  <Input
                    id="edit-title"
                    value={editingExpense.title}
                    onChange={(e) => setEditingExpense(prev => prev ? {...prev, title: e.target.value} : null)}
                    required
                    disabled={isSubmitting}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="edit-amount">Amount (₹) *</Label>
                  <Input
                    id="edit-amount"
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={editingExpense.amount}
                    onChange={(e) => setEditingExpense(prev => prev ? {
                      ...prev, 
                      amount: parseFloat(e.target.value) || 0
                    } : null)}
                    required
                    disabled={isSubmitting}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="edit-date">Date *</Label>
                  <Input
                    id="edit-date"
                    type="date"
                    value={editingExpense.date}
                    onChange={(e) => setEditingExpense(prev => prev ? {...prev, date: e.target.value} : null)}
                    required
                    disabled={isSubmitting}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="edit-description">Description</Label>
                  <Textarea
                    id="edit-description"
                    value={editingExpense.description || ""}
                    onChange={(e) => setEditingExpense(prev => prev ? {...prev, description: e.target.value} : null)}
                    rows={3}
                    disabled={isSubmitting}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setIsEditDialogOpen(false)}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? "Updating..." : "Update Expense"}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
      
      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Deletion</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this expense? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setIsDeleteDialogOpen(false)
                setDeletingId(null)
              }}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleDeleteExpense} 
              disabled={isSubmitting}
            >
              {isSubmitting ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}