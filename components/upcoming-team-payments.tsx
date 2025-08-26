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
      console.log(`All expenses:`, expenses);
      
      // Look for salary payments for this team member in the current month
      const found = expenses.some(expense => {
        const expenseDate = new Date(expense.date);
        const isSalaryPayment = expense.title.includes(`Salary - ${memberName}`);
        const isInMonth = expenseDate >= monthStart && expenseDate <= monthEnd;
        
        console.log(`Checking expense: "${expense.title}" for ${memberName}`);
        console.log(`  - Is salary payment: ${isSalaryPayment}`);
        console.log(`  - Expense date: ${expenseDate.toISOString()}`);
        console.log(`  - Month start: ${monthStart.toISOString()}`);
        console.log(`  - Month end: ${monthEnd.toISOString()}`);
        console.log(`  - Is in month: ${isInMonth}`);
        
        // Check if the expense is for this team member's salary in the current month
        return isSalaryPayment && isInMonth;
      });
      
      console.log(`Checking payment for ${memberName} in ${monthStart.toISOString()} to ${monthEnd.toISOString()}: ${found}`);
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
        console.log(`Processing member: ${member.name}, payment_date: ${member.payment_date}`);
        
        // Parse payment_date - this should be the day of month when payment is due
        let paymentDay: number;
        
        try {
          // Try to parse as a date first
          const paymentDate = new Date(member.payment_date);
          
          // Check if it's a valid date and not NaN
          if (!isNaN(paymentDate.getTime())) {
            paymentDay = paymentDate.getDate();
            console.log(`Extracted payment day from date: ${paymentDay}`);
          } else {
            // If it's not a valid date, try to extract day from string like "Jul 30, 2025"
            const dayMatch = member.payment_date.match(/(\d{1,2})/);
            if (dayMatch) {
              paymentDay = parseInt(dayMatch[1]);
              console.log(`Extracted payment day from string: ${paymentDay}`);
            } else {
              // Default to 1st of month if we can't parse
              paymentDay = 1;
              console.log(`Using default payment day: ${paymentDay}`);
            }
          }
        } catch (error) {
          console.error(`Error parsing payment date for ${member.name}:`, error);
          paymentDay = 1; // Default to 1st of month
        }
        
        console.log(`Final payment day: ${paymentDay}`);
        
        // Find the most recent unpaid payment
        let unpaidPaymentDate: Date | null = null;
        let isPaid = false;
        
        // Check the last 3 months to find the most recent unpaid payment
        for (let i = 0; i < 3; i++) {
          const checkDate = new Date(today.getFullYear(), today.getMonth() - i, paymentDay);
          const isPaidForThisMonth = await hasBeenPaidThisPeriod(member.name, checkDate.toISOString());
          
          console.log(`Checking ${member.name} for ${checkDate.toISOString()}: paid = ${isPaidForThisMonth}`);
          
          if (!isPaidForThisMonth) {
            // Found an unpaid payment
            unpaidPaymentDate = checkDate;
            break;
          }
        }
        
        // If no unpaid payment found in the last 3 months, check next month's payment
        if (!unpaidPaymentDate) {
          unpaidPaymentDate = new Date(today.getFullYear(), today.getMonth() + 1, paymentDay);
          isPaid = false;
        } else {
          isPaid = false; // We found an unpaid payment
        }
        
        // Calculate days until due
        const daysUntilDue = Math.ceil(
          (unpaidPaymentDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
        );
        
        console.log(`${member.name}: unpaid payment date ${unpaidPaymentDate.toISOString()}, daysUntilDue: ${daysUntilDue}, isPaid: ${isPaid}`);
        
        return {
          id: member.id,
          name: member.name,
          role: member.role,
          amount: parseFloat(member.salary.toString()),
          paymentDate: unpaidPaymentDate.toISOString().split('T')[0],
          daysUntilDue,
          isPaid
        };
      });
      
      // Wait for all the payment status checks to complete
      const upcomingPayments = await Promise.all(upcomingPaymentsPromises);
      
      // Filter to show payments due within 7 days OR overdue payments (like client payments)
      const filteredPayments = upcomingPayments
        .filter(payment => !payment.isPaid && (payment.daysUntilDue <= 7 || payment.daysUntilDue < 0)) // Show within 7 days OR overdue
        .sort((a, b) => a.daysUntilDue - b.daysUntilDue); // Sort by days until due (overdue first)
      
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
                      variant={payment.daysUntilDue <= 0 ? "destructive" : "secondary"}
                      className={payment.daysUntilDue <= 0 
                        ? "bg-red-600" 
                        : "bg-yellow-600"
                      }
                    >
                      {payment.daysUntilDue <= 0 
                        ? `Overdue (${Math.abs(payment.daysUntilDue)}d)` 
                        : `Due in ${payment.daysUntilDue}d`
                      }
                    </Badge>
                    
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-xs p-1 hover:bg-gray-800 text-green-500"
                      onClick={() => handleMarkAsPaid(payment)}
                      disabled={isSubmitting}
                    >
                      <Check className="h-3 w-3" />
                    </Button>
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