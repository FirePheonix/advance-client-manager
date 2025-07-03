"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Calendar, Check } from "lucide-react"
import { getTeamMembers, createOtherExpense, getOtherExpenses, updateTeamMemberNextPayment } from "@/lib/database"
import { toast } from "sonner"

interface UpcomingTeamPayment {
  id: string
  name: string
  role: string
  amount: number
  paymentDate: string
  daysUntilDue: number
  isPaid: boolean
}

export function UpcomingTeamPayments() {
  const [payments, setPayments] = useState<UpcomingTeamPayment[]>([])
  const [loading, setLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    loadTeamPayments()
  }, [])

  // Check if a team member has been paid in the current period
  async function hasBeenPaidThisPeriod(memberName: string, paymentDate: string) {
    try {
      // Get the current month's start date (1st day of month)
      const date = new Date(paymentDate);
      const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
      const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0); // last day of month
      
      // Get all expenses
      const expenses = await getOtherExpenses();
      
      // Look for salary payments for this team member in the current month
      const found = expenses.some(expense => {
        const expenseDate = new Date(expense.date);
        // Check if the expense is for this team member's salary in the current month
        return expense.title.includes(`Salary - ${memberName}`) && 
               expenseDate >= monthStart && 
               expenseDate <= monthEnd;
      });
      
      return found;
    } catch (error) {
      console.error("Error checking payment status:", error);
      return false;
    }
  }

  async function loadTeamPayments() {
    try {
      setLoading(true);
      const today = new Date();
      
      // Get all active team members
      const teamMembers = await getTeamMembers();
      console.log("All team members:", teamMembers);
      
      const activeMembers = teamMembers.filter(member => member.status === 'active');
      console.log("Active team members:", activeMembers);
      
      // Process each member to determine payment status
      const upcomingPaymentsPromises = activeMembers.map(async (member) => {
        // Parse payment_date - convert from string format to a Date object
        const paymentDate = new Date(member.payment_date);
        // Get the day of month for this payment
        const paymentDay = paymentDate.getDate();
        
        // Create a date for this month's payment
        const thisMonthPayment = new Date(today.getFullYear(), today.getMonth(), paymentDay);
        
        // If today is past this month's payment date, look at next month
        const nextPaymentDate = today > thisMonthPayment 
          ? new Date(today.getFullYear(), today.getMonth() + 1, paymentDay)
          : thisMonthPayment;
        
        // Calculate days until payment is due
        const daysUntilDue = Math.ceil(
          (nextPaymentDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
        );
        
        // Check if this payment has already been made
        const isPaid = await hasBeenPaidThisPeriod(member.name, nextPaymentDate.toISOString());
        
        console.log(`${member.name} payment due in ${daysUntilDue} days, isPaid: ${isPaid}`);
        
        return {
          id: member.id,
          name: member.name,
          role: member.role,
          amount: parseFloat(member.salary.toString()),
          paymentDate: nextPaymentDate.toISOString().split('T')[0],
          daysUntilDue,
          isPaid
        };
      });
      
      // Wait for all the payment status checks to complete
      const upcomingPayments = await Promise.all(upcomingPaymentsPromises);
      
      // Filter to only show payments coming up in the next 7 days
      const filteredPayments = upcomingPayments
        .filter(payment => payment.daysUntilDue <= 7)
        .sort((a, b) => a.daysUntilDue - b.daysUntilDue);
      
      console.log("Filtered payments to show:", filteredPayments);
      
      setPayments(filteredPayments);
    } catch (error) {
      console.error("Error loading team payments:", error);
      toast.error("Failed to load team payments");
    } finally {
      setLoading(false);
    }
  }

  const handleMarkAsPaid = async (payment: UpcomingTeamPayment) => {
    try {
      setIsSubmitting(true);
      
      // Create an entry in the other_expenses table
      await createOtherExpense({
        title: `Salary - ${payment.name}`,
        amount: payment.amount,
        date: new Date().toISOString().split('T')[0],
        description: `Monthly salary payment for ${payment.role}`
      });

      // Update team member's next payment date to next month
      await updateTeamMemberNextPayment(payment.id, payment.paymentDate)
      
      // Update local state to show payment as paid
      setPayments(prev => prev.map(p => 
        p.id === payment.id ? { ...p, isPaid: true } : p
      ));
      
      toast.success(`Salary payment for ${payment.name} marked as completed and next payment date updated`)
    } catch (error) {
      console.error("Error marking payment as paid:", error)
      toast.error("Failed to mark payment as paid")
    } finally {
      setIsSubmitting(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', { 
      style: 'currency', 
      currency: 'INR',
      maximumFractionDigits: 0 
    }).format(amount)
  }

  if (loading) {
    return (
      <Card className="bg-black border-gray-800">
        <CardHeader>
          <CardTitle className="text-white flex items-center">
            <Calendar className="mr-2 h-5 w-5" />
            Upcoming Team Payments
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse p-3 bg-gray-900 rounded-lg">
                <div className="h-4 bg-gray-700 rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-gray-700 rounded w-1/2"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="bg-black border-gray-800">
      <CardHeader>
        <CardTitle className="text-white flex items-center">
          <Calendar className="mr-2 h-5 w-5" />
          Upcoming Team Payments
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {payments.length > 0 ? (
            payments.map((payment) => (
              <div key={payment.id} className="flex items-center justify-between p-3 bg-gray-900 rounded-lg">
                <div>
                  <p className="text-white font-medium">{payment.name}</p>
                  <p className="text-gray-400 text-sm">{payment.role}</p>
                </div>
                <div className="text-right">
                  <p className="text-green-400 font-medium">{formatCurrency(payment.amount)}</p>
                  <div className="flex items-center justify-end space-x-2 mt-1">
                    <Badge
                      variant={payment.isPaid ? "default" : payment.daysUntilDue <= 0 ? "destructive" : "secondary"}
                      className={payment.isPaid 
                        ? "bg-green-600" 
                        : payment.daysUntilDue <= 0 
                          ? "bg-red-600" 
                          : "bg-yellow-600"
                      }
                    >
                      {payment.isPaid 
                        ? "Paid" 
                        : payment.daysUntilDue <= 0 
                          ? `Overdue (${Math.abs(payment.daysUntilDue)}d)` 
                          : `Due in ${payment.daysUntilDue}d`
                      }
                    </Badge>
                    
                    {!payment.isPaid && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-xs p-1 hover:bg-gray-800 text-green-500"
                        onClick={() => handleMarkAsPaid(payment)}
                        disabled={isSubmitting}
                      >
                        <Check className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-4 text-gray-400">
              No upcoming team payments in the next 7 days
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}