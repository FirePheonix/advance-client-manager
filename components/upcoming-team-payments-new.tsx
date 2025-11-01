"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Calendar, Check, User, DollarSign } from "lucide-react"
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

export function UpcomingTeamPaymentsNew() {
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
        const isSalaryPayment = expense.title.includes(`Salary - ${memberName}`);
        const isInMonth = expenseDate >= monthStart && expenseDate <= monthEnd;
        
        // Check if the expense is for this team member's salary in the current month
        return isSalaryPayment && isInMonth;
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
      const activeMembers = teamMembers.filter(member => member.status === 'active');
      
      // Process each member to determine payment status
      const upcomingPaymentsPromises = activeMembers.map(async (member) => {
        // Parse payment_date - this should be the day of month when payment is due
        let paymentDay: number;
        
        try {
          // Try to parse as a date first
          const paymentDate = new Date(member.payment_date);
          
          // Check if it's a valid date and not NaN
          if (!isNaN(paymentDate.getTime())) {
            paymentDay = paymentDate.getDate();
          } else {
            // If it's not a valid date, try to extract day from string like "Jul 30, 2025"
            const dayMatch = member.payment_date.match(/(\d{1,2})/);
            if (dayMatch) {
              paymentDay = parseInt(dayMatch[1]);
            } else {
              // Default to 1st of month if we can't parse
              paymentDay = 1;
            }
          }
        } catch (error) {
          console.error(`Error parsing payment date for ${member.name}:`, error);
          paymentDay = 1; // Default to 1st of month
        }
        
        // Find the most recent unpaid payment
        let unpaidPaymentDate: Date | null = null;
        
        // Check the last 3 months to find the most recent unpaid payment
        for (let i = 0; i < 3; i++) {
          const checkDate = new Date(today.getFullYear(), today.getMonth() - i, paymentDay);
          const isPaidForThisMonth = await hasBeenPaidThisPeriod(member.name, checkDate.toISOString());
          
          if (!isPaidForThisMonth) {
            // Found an unpaid payment
            unpaidPaymentDate = checkDate;
            break;
          }
        }
        
        // If no unpaid payment found in the last 3 months, check next month's payment
        if (!unpaidPaymentDate) {
          unpaidPaymentDate = new Date(today.getFullYear(), today.getMonth() + 1, paymentDay);
        }
        
        // Calculate days until due
        const daysUntilDue = Math.ceil(
          (unpaidPaymentDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
        );
        
        return {
          id: member.id,
          name: member.name,
          role: member.role,
          amount: parseFloat(member.salary.toString()),
          paymentDate: unpaidPaymentDate.toISOString().split('T')[0],
          daysUntilDue,
          isPaid: false
        };
      });
      
      // Wait for all the payment status checks to complete
      const upcomingPayments = await Promise.all(upcomingPaymentsPromises);
      
      // Filter to show payments due within 7 days OR overdue payments
      const filteredPayments = upcomingPayments
        .filter(payment => !payment.isPaid && (payment.daysUntilDue <= 7 || payment.daysUntilDue < 0)) 
        .sort((a, b) => a.daysUntilDue - b.daysUntilDue); 
      
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
      
      toast.success(`Salary payment for ${payment.name} marked as completed`)
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
      <Card className="bg-white border-gray-200 shadow-sm h-full">
        <CardHeader>
          <CardTitle className="text-black flex items-center">
            <Calendar className="mr-2 h-5 w-5 text-blue-600" />
            Upcoming Team Payments
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse p-4 bg-gray-50 rounded-lg border border-gray-100">
                <div className="h-4 bg-gray-300 rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-gray-300 rounded w-1/2"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="bg-white border-gray-200 shadow-sm h-full">
      <CardHeader className="pb-4">
        <CardTitle className="text-black flex items-center justify-between">
          <div className="flex items-center">
            <Calendar className="mr-2 h-5 w-5 text-blue-600" />
            Upcoming Team Payments
          </div>
          <Badge variant="secondary" className="bg-blue-50 text-blue-700 border-blue-200">
            {payments.length} due
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="space-y-3">
          {payments.length > 0 ? (
            payments.map((payment) => (
              <div key={payment.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-100 hover:bg-gray-100 transition-colors">
                <div className="flex items-center space-x-3">
                  <div className="flex-shrink-0">
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                      <User className="h-5 w-5 text-blue-600" />
                    </div>
                  </div>
                  <div>
                    <p className="text-black font-medium text-sm">{payment.name}</p>
                    <p className="text-gray-600 text-xs">{payment.role}</p>
                  </div>
                </div>
                
                <div className="text-right flex items-center space-x-3">
                  <div className="text-right">
                    <div className="flex items-center text-green-600 font-semibold text-sm">
                      <DollarSign className="h-4 w-4 mr-1" />
                      {formatCurrency(payment.amount)}
                    </div>
                    <Badge
                      variant={payment.daysUntilDue <= 0 ? "destructive" : "secondary"}
                      className={`text-xs ${payment.daysUntilDue <= 0 
                        ? "bg-red-100 text-red-700 border-red-200" 
                        : payment.daysUntilDue <= 3
                          ? "bg-orange-100 text-orange-700 border-orange-200"
                          : "bg-yellow-100 text-yellow-700 border-yellow-200"
                      }`}
                    >
                      {payment.daysUntilDue <= 0 
                        ? `${Math.abs(payment.daysUntilDue)}d overdue` 
                        : `${payment.daysUntilDue}d left`
                      }
                    </Badge>
                  </div>
                  
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-8 w-8 p-0 hover:bg-green-50 text-green-600 hover:text-green-700"
                    onClick={() => handleMarkAsPaid(payment)}
                    disabled={isSubmitting}
                  >
                    <Check className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-8">
              <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-3" />
              <h3 className="text-gray-600 font-medium mb-1">All caught up!</h3>
              <p className="text-gray-500 text-sm">No team payments due in the next 7 days</p>
            </div>
          )}
        </div>
        
        {payments.length > 0 && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">Total Amount Due</span>
              <span className="font-semibold text-black">
                {formatCurrency(payments.reduce((sum, payment) => sum + payment.amount, 0))}
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
