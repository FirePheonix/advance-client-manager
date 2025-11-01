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
import './otherExpenses.css'

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
    <div className="other-expenses-container">
      <Card className="other-expenses-card">
        <CardHeader className="other-expenses-header">
          <CardTitle className="other-expenses-title">Other Expenses</CardTitle>
          <CardDescription className="other-expenses-description">
            Manage your miscellaneous business expenses
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="other-expenses-stats">
            <div className="other-expenses-total">
              <p className="other-expenses-total-label">Total Other Expenses</p>
              <p className="other-expenses-total-amount">
                {formatCurrency(totalExpenses)}
              </p>
            </div>
            <Dialog open={isAddDialogOpen} onOpenChange={(open) => {
              setIsAddDialogOpen(open)
              if (!open) resetAddForm()
            }}>
              <DialogTrigger asChild>
                <Button className="add-expense-button">Add New Expense</Button>
              </DialogTrigger>
              <DialogContent className="expense-dialog">
                <DialogHeader className="dialog-header">
                  <DialogTitle className="dialog-title">Add New Expense</DialogTitle>
                  <DialogDescription className="dialog-description">
                    Enter the details for the new expense
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleAddExpense}>
                  <div className="dialog-content">
                    <div className="form-group">
                      <label htmlFor="title" className="form-label required">Expense Title</label>
                      <input
                        id="title"
                        className="form-input"
                        placeholder="e.g., Office supplies, Software subscription"
                        value={newExpense.title}
                        onChange={(e) => setNewExpense(prev => ({...prev, title: e.target.value}))}
                        required
                        disabled={isSubmitting}
                      />
                    </div>
                    <div className="form-group">
                      <label htmlFor="amount" className="form-label required">Amount (₹)</label>
                      <input
                        id="amount"
                        className="form-input"
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
                    <div className="form-group">
                      <label htmlFor="date" className="form-label required">Date</label>
                      <input
                        id="date"
                        className="form-input"
                        type="date"
                        value={newExpense.date}
                        onChange={(e) => setNewExpense(prev => ({...prev, date: e.target.value}))}
                        required
                        disabled={isSubmitting}
                      />
                    </div>
                    <div className="form-group">
                      <label htmlFor="description" className="form-label">Description</label>
                      <textarea
                        id="description"
                        className="form-textarea"
                        placeholder="Optional description or notes..."
                        value={newExpense.description}
                        onChange={(e) => setNewExpense(prev => ({...prev, description: e.target.value}))}
                        rows={3}
                        disabled={isSubmitting}
                      />
                    </div>
                  </div>
                  <div className="dialog-footer">
                    <button 
                      type="button" 
                      className="button-outline"
                      onClick={() => setIsAddDialogOpen(false)}
                      disabled={isSubmitting}
                    >
                      Cancel
                    </button>
                    <button type="submit" className="button-primary" disabled={isSubmitting}>
                      {isSubmitting ? "Adding..." : "Add Expense"}
                    </button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>
          
          <table className="other-expenses-table">
            <caption className="table-caption">List of all other business expenses</caption>
            <thead>
              <tr>
                <th>Title</th>
                <th>Amount</th>
                <th>Date</th>
                <th>Description</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="loading-state">
                    Loading expenses...
                  </td>
                </tr>
              ) : expenses.length === 0 ? (
                <tr>
                  <td colSpan={5} className="empty-state">
                    No expenses found. Add your first expense above.
                  </td>
                </tr>
              ) : (
                expenses.map((expense) => (
                  <tr key={expense.id}>
                    <td className="expense-title">{expense.title}</td>
                    <td className="expense-amount">
                      {formatCurrency(expense.amount)}
                    </td>
                    <td className="expense-date">
                      {new Date(expense.date).toLocaleDateString('en-IN')}
                    </td>
                    <td>
                      <div 
                        className={`expense-description ${!expense.description ? 'expense-description-empty' : ''}`}
                        title={expense.description || ""}
                      >
                        {expense.description || "—"}
                      </div>
                    </td>
                    <td>
                      <div className="expense-actions">
                        <button 
                          className="action-button edit-button"
                          onClick={() => {
                            setEditingExpense(expense)
                            setIsEditDialogOpen(true)
                          }}
                          disabled={isSubmitting}
                        >
                          Edit
                        </button>
                        <button 
                          className="action-button delete-button"
                          onClick={() => {
                            setDeletingId(expense.id)
                            setIsDeleteDialogOpen(true)
                          }}
                          disabled={isSubmitting}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>
      
      {/* Edit Expense Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="expense-dialog">
          <DialogHeader className="dialog-header">
            <DialogTitle className="dialog-title">Edit Expense</DialogTitle>
            <DialogDescription className="dialog-description">
              Update the expense details
            </DialogDescription>
          </DialogHeader>
          {editingExpense && (
            <form onSubmit={handleUpdateExpense}>
              <div className="dialog-content">
                <div className="form-group">
                  <label htmlFor="edit-title" className="form-label required">Expense Title</label>
                  <input
                    id="edit-title"
                    className="form-input"
                    value={editingExpense.title}
                    onChange={(e) => setEditingExpense(prev => prev ? {...prev, title: e.target.value} : null)}
                    required
                    disabled={isSubmitting}
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="edit-amount" className="form-label required">Amount (₹)</label>
                  <input
                    id="edit-amount"
                    className="form-input"
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
                <div className="form-group">
                  <label htmlFor="edit-date" className="form-label required">Date</label>
                  <input
                    id="edit-date"
                    className="form-input"
                    type="date"
                    value={editingExpense.date}
                    onChange={(e) => setEditingExpense(prev => prev ? {...prev, date: e.target.value} : null)}
                    required
                    disabled={isSubmitting}
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="edit-description" className="form-label">Description</label>
                  <textarea
                    id="edit-description"
                    className="form-textarea"
                    value={editingExpense.description || ""}
                    onChange={(e) => setEditingExpense(prev => prev ? {...prev, description: e.target.value} : null)}
                    rows={3}
                    disabled={isSubmitting}
                  />
                </div>
              </div>
              <div className="dialog-footer">
                <button 
                  type="button" 
                  className="button-outline"
                  onClick={() => setIsEditDialogOpen(false)}
                  disabled={isSubmitting}
                >
                  Cancel
                </button>
                <button type="submit" className="button-primary" disabled={isSubmitting}>
                  {isSubmitting ? "Updating..." : "Update Expense"}
                </button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
      
      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="expense-dialog">
          <DialogHeader className="dialog-header">
            <DialogTitle className="dialog-title">Confirm Deletion</DialogTitle>
            <DialogDescription className="dialog-description">
              Are you sure you want to delete this expense? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="dialog-footer">
            <button 
              className="button-outline"
              onClick={() => {
                setIsDeleteDialogOpen(false)
                setDeletingId(null)
              }}
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button 
              className="button-destructive"
              onClick={handleDeleteExpense} 
              disabled={isSubmitting}
            >
              {isSubmitting ? "Deleting..." : "Delete"}
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}