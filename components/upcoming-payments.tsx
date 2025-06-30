"use client"

import { useEffect, useState, useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Calendar, Mail, Check, X, Send, Download } from "lucide-react"
import { getClients, createPayment, checkPaymentExists } from "@/lib/database"
import type { Client } from "@/lib/supabase"
import { toast } from "sonner"

interface UpcomingPayment {
  id: string
  client: string
  clientEmail: string
  amount: number
  dueDate: string
  status: string
  daysUntilDue: number
  paymentDone: boolean
}

interface InvoiceData {
  personName: string
  companyName: string
  companyAddress: string
  gst: string
  phoneNumber: string
  services: string
}

export function UpcomingPayments() {
  const [payments, setPayments] = useState<UpcomingPayment[]>([])
  const [loading, setLoading] = useState(true)
  const [showInvoiceForm, setShowInvoiceForm] = useState(false)
  const [selectedPayment, setSelectedPayment] = useState<UpcomingPayment | null>(null)
  const [invoiceData, setInvoiceData] = useState<InvoiceData>({
    personName: '',
    companyName: '',
    companyAddress: '',
    gst: '',
    phoneNumber: '',
    services: 'Social Media Services'
  })
  const [isGenerating, setIsGenerating] = useState(false)
  const invoiceRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    async function loadPayments() {
      try {
        const today = new Date()
        const nextWeek = new Date()
        nextWeek.setDate(today.getDate() + 7)

        // Fetch all clients with their next_payment dates
        const clients = await getClients()
        
        // Create array of payment promises with payment status checks
        const upcomingPaymentsPromises = clients
          .filter(client => client.next_payment)
          .map(async (client) => {
            const dueDate = new Date(client.next_payment!)
            const daysUntilDue = Math.floor((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
            
            // Check if payment already exists for this due date
            const paymentExists = await checkPaymentExists(client.id, client.next_payment!)
            
            return {
              id: client.id,
              client: client.name,
              clientEmail: client.email,
              amount: client.payment_type === "monthly" 
                ? client.monthly_rate || 0
                : client.payment_type === "weekly" 
                  ? client.weekly_rate || 0
                  : 0,
              dueDate: dueDate.toLocaleDateString(),
              status: paymentExists ? "paid" : (daysUntilDue < 0 ? "overdue" : "upcoming"),
              daysUntilDue,
              paymentDone: paymentExists
            }
          })

        // Wait for all payment status checks to complete
        const upcomingPayments = await Promise.all(upcomingPaymentsPromises)
        
        const filteredPayments = upcomingPayments
          .filter(payment => payment.daysUntilDue <= 7)
          .sort((a, b) => a.daysUntilDue - b.daysUntilDue)
        
        setPayments(filteredPayments)
      } catch (error) {
        console.error("Error loading upcoming payments:", error)
        toast.error("Failed to load payments")
      } finally {
        setLoading(false)
      }
    }

    loadPayments()
  }, [])

  const generateInvoiceNumber = (clientName: string) => {
    const date = new Date()
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    const hours = String(date.getHours()).padStart(2, '0')
    const minutes = String(date.getMinutes()).padStart(2, '0')
    
    const clientFirstName = clientName.split(' ')[0] || 'Client'
    
    return `${clientFirstName}${year}${month}${day}${hours}${minutes}`
  }

  const generatePDF = async () => {
    if (!invoiceRef.current) return null

    try {
      // Dynamic import for client-side only
      const html2canvas = (await import('html2canvas')).default
      const jsPDF = (await import('jspdf')).default

      const canvas = await html2canvas(invoiceRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff'
      })

      const imgData = canvas.toDataURL('image/png')
      const pdf = new jsPDF('p', 'mm', 'a4')
      const imgWidth = 210
      const pageHeight = 295
      const imgHeight = (canvas.height * imgWidth) / canvas.width
      let heightLeft = imgHeight

      let position = 0

      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight)
      heightLeft -= pageHeight

      while (heightLeft >= 0) {
        position = heightLeft - imgHeight
        pdf.addPage()
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight)
        heightLeft -= pageHeight
      }

      return { pdf, imgData }
    } catch (error) {
      console.error('Error generating PDF:', error)
      return null
    }
  }

  const handleGenerateAndSend = async () => {
    if (!selectedPayment || !invoiceData.personName || !invoiceData.companyName || !invoiceData.companyAddress || !invoiceData.gst || !invoiceData.phoneNumber) {
      toast.error('Please fill in all required fields')
      return
    }

    setIsGenerating(true)
    
    try {
      const result = await generatePDF()
      if (!result) {
        toast.error('Failed to generate PDF')
        return
      }

      const { pdf, imgData } = result
      const invoiceNumber = generateInvoiceNumber(selectedPayment.client)
      
      // Download PDF
      pdf.save(`invoice-${invoiceNumber}.pdf`)

      // Create Gmail compose URL
      const subject = `Invoice ${invoiceNumber} - Payment Due ${selectedPayment.dueDate}`
      const body = `Dear ${invoiceData.personName},

Please find attached your invoice for the services provided.

Invoice Details:
• Invoice Number: ${invoiceNumber}
• Invoice Date: ${new Date().toLocaleDateString()}
• Amount: ₹${selectedPayment.amount}
• Due Date: ${selectedPayment.dueDate}

Please remit payment by the due date. If you have any questions, please don't hesitate to contact us.

Best regards,
Janavi Sawadia

---
Note: Please manually attach the downloaded PDF file to this email.`

      const gmailUrl = `https://mail.google.com/mail/?view=cm&to=${encodeURIComponent(selectedPayment.clientEmail)}&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
      
      // Open Gmail in new tab
      window.open(gmailUrl, '_blank')

      // Create a downloadable image version
      const link = document.createElement('a')
      link.download = `invoice-${invoiceNumber}.png`
      link.href = imgData
      link.click()

      toast.success('Invoice generated successfully! PDF downloaded and Gmail opened.')
      
      // Reset form
      setShowInvoiceForm(false)
      setSelectedPayment(null)
      setInvoiceData({ 
        personName: '',
        companyName: '', 
        companyAddress: '', 
        gst: '', 
        phoneNumber: '',
        services: 'Social Media Services' 
      })
      
    } catch (error) {
      console.error('Error generating invoice:', error)
      toast.error('Error generating invoice. Please try again.')
    } finally {
      setIsGenerating(false)
    }
  }

  const handleMarkAsPaid = async (paymentId: string, clientId: string, amount: number, dueDate: string) => {
    try {
      // Create a new payment record
      await createPayment({
        client_id: clientId,
        amount: amount,
        payment_date: dueDate, // Use the due date as payment date
        status: "completed",
        type: "payment",
        description: "Monthly payment received",
      })

      // Update local state to reflect payment
      setPayments(prev => prev.map(p => 
        p.id === paymentId ? { ...p, paymentDone: true, status: "paid" } : p
      ))

      toast.success("Payment marked as completed")
    } catch (error) {
      console.error("Error marking payment as paid:", error)
      toast.error("Failed to mark payment as paid")
    }
  }

  const handleOpenInvoiceForm = (payment: UpcomingPayment) => {
    setSelectedPayment(payment)
    setShowInvoiceForm(true)
  }

  const formatCurrency = (amount: number) => {
    return `₹${amount.toFixed(0)}`
  }

  if (loading) {
    return (
      <Card className="bg-black border-gray-800">
        <CardHeader>
          <CardTitle className="text-white flex items-center">
            <Calendar className="mr-2 h-5 w-5" />
            Upcoming Payments
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
    <>
      <Card className="bg-black border-gray-800">
        <CardHeader>
          <CardTitle className="text-white flex items-center">
            <Calendar className="mr-2 h-5 w-5" />
            Upcoming Payments
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {payments.length > 0 ? (
              payments.map((payment) => (
                <div key={payment.id} className="flex items-center justify-between p-3 bg-gray-900 rounded-lg">
                  <div>
                    <p className="text-white font-medium">{payment.client}</p>
                    <p className="text-gray-400 text-sm">Due: {payment.dueDate}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-green-400 font-medium">₹{payment.amount}</p>
                    <div className="flex items-center justify-end space-x-2 mt-1">
                      <Badge
                        variant={payment.status === "overdue" 
                          ? "destructive" 
                          : payment.status === "paid"
                            ? "default"
                            : "secondary"}
                        className={payment.status === "overdue" 
                          ? "bg-red-600" 
                          : payment.status === "paid"
                            ? "bg-green-600"
                            : "bg-yellow-600"}
                      >
                        {payment.status === "overdue" 
                          ? `Overdue (${Math.abs(payment.daysUntilDue)}d)` 
                          : payment.status === "paid"
                            ? "Paid"
                            : `Due in ${payment.daysUntilDue}d`}
                      </Badge>
                      
                      {!payment.paymentDone && (
                        <>
                          <Button 
                            size="sm" 
                            variant="ghost" 
                            className="text-xs p-1 hover:bg-gray-800"
                            onClick={() => handleOpenInvoiceForm(payment)}
                          >
                            <Mail className="h-3 w-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-xs p-1 hover:bg-gray-800 text-green-500"
                            onClick={() => handleMarkAsPaid(payment.id, payment.id, payment.amount, payment.dueDate)}
                          >
                            <Check className="h-3 w-3" />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-4 text-gray-400">
                No upcoming payments in the next 7 days
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Invoice Form Modal */}
      {showInvoiceForm && selectedPayment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-black rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto border border-gray-800">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-semibold text-white">Generate Invoice</h2>
                <Button 
                  variant="ghost" 
                  size="sm"
                  className="text-gray-400 hover:text-white hover:bg-gray-800"
                  onClick={() => {
                    setShowInvoiceForm(false)
                    setSelectedPayment(null)
                    setInvoiceData({ 
                      personName: '',
                      companyName: '', 
                      companyAddress: '', 
                      gst: '', 
                      phoneNumber: '',
                      services: 'Social Media Services' 
                    })
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              {/* Form */}
              <div className="space-y-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Person's Name *
                  </label>
                  <input
                    type="text"
                    value={invoiceData.personName}
                    onChange={(e) => setInvoiceData(prev => ({ ...prev, personName: e.target.value }))}
                    className="w-full px-4 py-3 bg-black border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter person's name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Company Name *
                  </label>
                  <input
                    type="text"
                    value={invoiceData.companyName}
                    onChange={(e) => setInvoiceData(prev => ({ ...prev, companyName: e.target.value }))}
                    className="w-full px-4 py-3 bg-black border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter company name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Company Address *
                  </label>
                  <textarea
                    value={invoiceData.companyAddress}
                    onChange={(e) => setInvoiceData(prev => ({ ...prev, companyAddress: e.target.value }))}
                    rows={3}
                    className="w-full px-4 py-3 bg-black border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter full company address"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    GST Number *
                  </label>
                  <input
                    type="text"
                    value={invoiceData.gst}
                    onChange={(e) => setInvoiceData(prev => ({ ...prev, gst: e.target.value }))}
                    className="w-full px-4 py-3 bg-black border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter GST number"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Phone Number *
                  </label>
                  <input
                    type="tel"
                    value={invoiceData.phoneNumber}
                    onChange={(e) => setInvoiceData(prev => ({ ...prev, phoneNumber: e.target.value }))}
                    className="w-full px-4 py-3 bg-black border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter phone number"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Services Description
                  </label>
                  <input
                    type="text"
                    value={invoiceData.services}
                    onChange={(e) => setInvoiceData(prev => ({ ...prev, services: e.target.value }))}
                    className="w-full px-4 py-3 bg-black border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter service description"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-4 mb-6">
                <Button
                  variant="outline"
                  className="border-gray-600 text-gray-300 hover:bg-gray-800 hover:text-white"
                  onClick={() => {
                    setShowInvoiceForm(false)
                    setSelectedPayment(null)
                    setInvoiceData({ 
                      personName: '',
                      companyName: '', 
                      companyAddress: '', 
                      gst: '', 
                      phoneNumber: '',
                      services: 'Social Media Services' 
                    })
                  }}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleGenerateAndSend}
                  disabled={isGenerating}
                  className="bg-green-600 hover:bg-green-700"
                >
                  {isGenerating ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Generating...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4 mr-2" />
                      Generate & Send
                    </>
                  )}
                </Button>
              </div>

              {/* Invoice Preview */}
              {(invoiceData.personName || invoiceData.companyName || invoiceData.companyAddress || invoiceData.gst || invoiceData.phoneNumber) && (
                <div className="bg-gray-900 p-4 rounded-lg">
                  <h3 className="text-lg font-semibold text-white mb-4">Invoice Preview</h3>
                  <div 
                    ref={invoiceRef}
                    className="bg-white p-8 border border-gray-200 rounded-lg"
                    style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}
                  >
                    {/* Header */}
                    <div className="flex justify-between items-start mb-8">
                      <div className="text-5xl font-bold text-black">&</div>
                      <div className="text-right">
                        <h1 className="text-3xl font-light text-black tracking-wider mb-4">INVOICE</h1>
                        <div className="text-sm text-gray-700">
                          <p className="mb-1">Invoice No. {generateInvoiceNumber(selectedPayment.client)}</p>
                          <p>{new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                        </div>
                      </div>
                    </div>

                    {/* From and To sections */}
                    <div className="grid grid-cols-2 gap-6 mb-8">
                      {/* From */}
                      <div>
                        <h3 className="text-sm font-semibold text-black mb-2 tracking-wide">FROM:</h3>
                        <div className="text-sm text-gray-700 leading-relaxed">
                          <p className="font-medium text-black">Janavi Sawadia</p>
                          <p>House Number 3021, Sector 51 D</p>
                          <p>Chandigarh</p>
                          <p>9915474100</p>
                        </div>
                      </div>

                      {/* Billed To */}
                      <div>
                        <h3 className="text-sm font-semibold text-black mb-2 tracking-wide">BILLED TO:</h3>
                        <div className="text-sm text-gray-700 leading-relaxed">
                          {invoiceData.personName && <p className="font-medium text-black">{invoiceData.personName}</p>}
                          {invoiceData.companyName && <p className="font-medium text-black">{invoiceData.companyName}</p>}
                          {invoiceData.companyAddress && <p>{invoiceData.companyAddress}</p>}
                          {invoiceData.gst && <p>GST: {invoiceData.gst}</p>}
                          {invoiceData.phoneNumber && <p>Phone: {invoiceData.phoneNumber}</p>}
                        </div>
                      </div>
                    </div>

                    {/* Invoice Table */}
                    <div className="mb-6">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-gray-300">
                            <th className="text-left py-2 text-sm font-medium text-gray-700 tracking-wide">Item</th>
                            <th className="text-right py-2 text-sm font-medium text-gray-700 tracking-wide">Total</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr className="border-b border-gray-100">
                            <td className="py-3 text-sm text-gray-700">{invoiceData.services}</td>
                            <td className="py-3 text-right text-sm font-medium text-gray-700">{formatCurrency(selectedPayment.amount)}</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>

                    {/* Total */}
                    <div className="flex justify-end mb-6">
                      <div className="w-64">
                        <div className="flex justify-between py-3 text-lg font-bold border-t border-gray-300">
                          <span className="text-black">Total</span>
                          <span className="text-black">{formatCurrency(selectedPayment.amount)}</span>
                        </div>
                      </div>
                    </div>

                    {/* Thank you */}
                    <div className="mb-8">
                      <h2 className="text-xl font-light text-gray-800">Thank you!</h2>
                    </div>

                    {/* Payment Information */}
                    <div className="grid grid-cols-2 gap-6">
                      <div>
                        <h3 className="text-sm font-semibold text-black mb-2 tracking-wide">PAYMENT INFORMATION</h3>
                        <div className="text-sm text-gray-700 leading-relaxed mb-3">
                          <p>Due Date: {selectedPayment.dueDate}</p>
                          <p>Contact: sawadiajanavi@gmail.com</p>
                        </div>
                        
                        <div className="mb-3">
                          <h4 className="text-sm font-semibold text-black mb-1">Bank Transfer:</h4>
                          <div className="text-sm text-gray-700 leading-relaxed">
                            <p>Account Name: HDFCJanavi</p>
                            <p>Account Number: FOUEWND134</p>
                            <p>IFSC Code: 1329</p>
                          </div>
                        </div>

                        <div className="mb-3">
                          <h4 className="text-sm font-semibold text-black mb-1">UPI Payment:</h4>
                          <div className="text-sm text-gray-700 leading-relaxed">
                            <p>UPI ID: ewdwniowe@ptsbi</p>
                            <p>Phone: 9915474100</p>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <h3 className="text-lg font-light text-black mb-1">Janavi Sawadia</h3>
                        <p className="text-sm text-gray-700 mb-4">Social Media Services</p>
                      
                      
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}