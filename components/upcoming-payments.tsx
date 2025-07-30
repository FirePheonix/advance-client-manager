"use client"

import { useEffect, useState, useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Calendar, Mail, Check, X, Send, Download } from "lucide-react"
import { 
  getClients, 
  createPayment, 
  checkPaymentExists, 
  updateClientNextPayment, 
  getClientById, 
  calculateTotalPaymentRate, 
  ensureAutomaticTierUpdates,
  calculateTotalPaymentRateAsync,
  resetPostCounts,
  getPostCountsForClient,
  createPerPostPayment
} from "@/lib/database"
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
  fromName: string
  fromAddress: string
  fromPhone: string
  fromEmail: string
  bankAccountName: string
  bankAccountNumber: string
  bankIFSC: string
  upiId: string
  upiPhone: string
  contactEmail: string
  dueDate: string
  // New editable fields for everything
  invoiceNumber: string
  invoiceDate: string
  businessTitle: string
  businessSubtitle: string
  thankYouMessage: string
  paymentInstructions: string
  termsAndConditions: string
  footerText: string
  currencySymbol: string
  taxRate: string
  discountAmount: string
  discountReason: string
  notes: string
  logoUrl: string
  signatureUrl: string
  customField1: string
  customField2: string
  customField3: string
  customField4: string
  customField5: string
}

export function UpcomingPayments() {
  const [payments, setPayments] = useState<UpcomingPayment[]>([])
  const [loading, setLoading] = useState(true)
  const [showInvoiceForm, setShowInvoiceForm] = useState(false)
  const [selectedPayment, setSelectedPayment] = useState<UpcomingPayment | null>(null)
  const [invoiceServices, setInvoiceServices] = useState<Array<{ name: string; amount: number }>>([])
  const [invoiceData, setInvoiceData] = useState<InvoiceData>({
    personName: '',
    companyName: '',
    companyAddress: '',
    gst: '',
    phoneNumber: '',
    services: 'Social Media Services',
    fromName: 'Janavi Sawadia',
    fromAddress: 'House Number 3021, Sector 51 D\nChandigarh',
    fromPhone: '9915474100',
    fromEmail: 'sawadiajanavi@gmail.com',
    bankAccountName: 'HDFCJanavi',
    bankAccountNumber: 'FOUEWND134',
    bankIFSC: '1329',
    upiId: 'ewdwniowe@ptsbi',
    upiPhone: '9915474100',
    contactEmail: 'sawadiajanavi@gmail.com',
    dueDate: '',
    // New editable fields for everything
    invoiceNumber: '',
    invoiceDate: '',
    businessTitle: '',
    businessSubtitle: '',
    thankYouMessage: '',
    paymentInstructions: '',
    termsAndConditions: '',
    footerText: '',
    currencySymbol: '₹',
    taxRate: '0',
    discountAmount: '0',
    discountReason: '',
    notes: '',
    logoUrl: '',
    signatureUrl: '',
    customField1: '',
    customField2: '',
    customField3: '',
    customField4: '',
    customField5: '',
  })
  const [isGenerating, setIsGenerating] = useState(false)
  const [isLoadingClientData, setIsLoadingClientData] = useState(false)
  const invoiceRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    loadPayments()
    
    // Listen for post count updates to refresh the payments
    const handlePostCountsUpdated = (event: CustomEvent) => {
      console.log("Post counts updated, refreshing payments:", event.detail)
      loadPayments()
    }
    
    // Add event listener
    window.addEventListener('postCountsUpdated', handlePostCountsUpdated as EventListener)
    
    // Cleanup
    return () => {
      window.removeEventListener('postCountsUpdated', handlePostCountsUpdated as EventListener)
    }
  }, [])
  
  // Effect to load invoice services when the invoice form is opened
  useEffect(() => {
    if (showInvoiceForm && selectedPayment) {
      const loadInvoiceServices = async () => {
        try {
          const services = await parseServicesForInvoice()
          setInvoiceServices(services)
        } catch (error) {
          console.error("Error loading invoice services:", error)
        }
      }
      
      loadInvoiceServices()
    }
  }, [showInvoiceForm, selectedPayment])

  const loadPayments = async () => {
    try {
      setLoading(true)
      const today = new Date()
      const nextWeek = new Date()
      nextWeek.setDate(today.getDate() + 7)

      // Automatically update tier transitions with rate limiting
      console.log("Updating tier transitions in upcoming payments...")
      await ensureAutomaticTierUpdates()

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
          
          // For per-post clients, use async calculation to get accurate amount
          const amount = client.payment_type === 'per-post' 
            ? await calculateTotalPaymentRateAsync(client)
            : calculateTotalPaymentRate(client)
          
          return {
            id: client.id,
            client: client.name,
            clientEmail: client.email,
            amount: amount,
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

  const parseServicesForInvoice = async (): Promise<Array<{ name: string; amount: number }>> => {
    if (!selectedPayment) return []
    
    try {
      // Get client details to check if it's a per-post client
      const clientDetails = await getClientById(selectedPayment.id)
      
      // Special handling for per-post clients
      if (clientDetails.payment_type === 'per-post' && clientDetails.per_post_rates) {
        // Get post counts for the client
        const postCounts = await getPostCountsForClient(clientDetails.id)
        
        // Create line items for each platform with post counts
        const lineItems = postCounts
          .filter(pc => pc.count > 0) // Only include platforms with posts
          .map(pc => {
            const rate = clientDetails.per_post_rates?.[pc.platform] || 0
            return {
              name: `${pc.platform} (${pc.count} posts)`,
              amount: pc.count * rate
            }
          })
        
        // If we found post counts, return them
        if (lineItems.length > 0) {
          return lineItems
        }
      } 
      // For regular clients, use their service list
      else if (clientDetails.services && Object.keys(clientDetails.services).length > 0) {
        return Object.entries(clientDetails.services).map(([service, price]) => ({
          name: service,
          amount: price as number
        }))
      }
      
      // If we have the services in a parseable format from the form, use them
      if (invoiceData.services && invoiceData.services.includes('₹')) {
        // Parse services that are in format "Service (₹Price), Service2 (₹Price2)"
        const parsed = invoiceData.services.split(', ').map(serviceStr => {
          const match = serviceStr.match(/^(.+)\s\(₹(\d+)\)$/)
          if (match) {
            return {
              name: match[1].trim(),
              amount: parseInt(match[2])
            }
          }
          return null
        }).filter((item): item is { name: string; amount: number } => item !== null)
        
        if (parsed.length > 0) {
          return parsed
        }
      }
      
      // Fallback: create a single line item
      return [{
        name: invoiceData.services || 'Social Media Services',
        amount: selectedPayment.amount
      }]
    } catch (error) {
      console.error("Error parsing services for invoice:", error)
      // Fallback: create a single line item
      return [{
        name: invoiceData.services || 'Social Media Services',
        amount: selectedPayment.amount
      }]
    }
  }

  const generatePDF = async () => {
    if (!invoiceRef.current || !selectedPayment) return null

    try {
      // Load services data first
      const services = await parseServicesForInvoice()
      setInvoiceServices(services)
      
      // Wait for React to update the DOM with the services
      await new Promise(resolve => setTimeout(resolve, 100))
      
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
    if (!selectedPayment) {
      toast.error('No payment selected to generate invoice.')
      return
    }

    setIsGenerating(true)
    
    try {
      // Load services data first for the client
      const services = await parseServicesForInvoice()
      setInvoiceServices(services)
      
      // Wait for React to update the DOM with the services
      await new Promise(resolve => setTimeout(resolve, 100))
      
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
        services: 'Social Media Services',
        fromName: 'Janavi Sawadia',
        fromAddress: 'House Number 3021, Sector 51 D\nChandigarh',
        fromPhone: '9915474100',
        fromEmail: 'sawadiajanavi@gmail.com',
        bankAccountName: 'HDFCJanavi',
        bankAccountNumber: 'FOUEWND134',
        bankIFSC: '1329',
        upiId: 'ewdwniowe@ptsbi',
        upiPhone: '9915474100',
        contactEmail: 'sawadiajanavi@gmail.com',
        dueDate: '',
        invoiceNumber: '',
        invoiceDate: '',
        businessTitle: '',
        businessSubtitle: '',
        thankYouMessage: '',
        paymentInstructions: '',
        termsAndConditions: '',
        footerText: '',
        currencySymbol: '₹',
        taxRate: '0',
        discountAmount: '0',
        discountReason: '',
        notes: '',
        logoUrl: '',
        signatureUrl: '',
        customField1: '',
        customField2: '',
        customField3: '',
        customField4: '',
        customField5: '',
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
      // Get client to check payment type
      const client = await getClientById(clientId)
      
      if (client.payment_type === 'per-post') {
        // For per-post clients, get current post counts before creating payment
        const postCountsData = await getPostCountsForClient(clientId)
        
        // Create a specialized per-post payment that also resets counts
        await createPerPostPayment(
          clientId, 
          amount, 
          postCountsData
        )
        
        console.log("Per-post payment created and post counts reset")
      } else {
        // Regular client - create standard payment
        await createPayment({
          client_id: clientId,
          amount: amount,
          payment_date: dueDate,
          status: "completed",
          type: "payment",
          description: "Monthly payment received",
        })

        // Update client's next payment date appropriately
        await updateClientNextPayment(clientId, dueDate)
      }

      // Update local state to reflect payment
      setPayments(prev => prev.map(p => 
        p.id === paymentId ? { ...p, paymentDone: true, status: "paid" } : p
      ))

      toast.success("Payment marked as completed and next payment date updated")
      
      // Force reload all payments to ensure everything is up to date
      loadPayments()
    } catch (error) {
      console.error("Error marking payment as paid:", error)
      toast.error("Failed to mark payment as paid")
    }
  }

  const handleOpenInvoiceForm = async (payment: UpcomingPayment) => {
    setIsLoadingClientData(true)
    
    try {
      // Fetch full client details
      const clientDetails = await getClientById(payment.id)
      
      // For per-post clients, preload post counts and calculate service items
      let servicesText = 'Social Media Services';
      
      if (clientDetails.payment_type === 'per-post' && clientDetails.per_post_rates) {
        // Fetch post counts for this client
        const postCounts = await getPostCountsForClient(clientDetails.id);
        
        // Format services with post counts and prices
        const serviceItems = postCounts
          .filter(pc => pc.count > 0)
          .map(pc => {
            const rate = clientDetails.per_post_rates?.[pc.platform] || 0;
            return `${pc.platform} (${pc.count} posts) - ₹${pc.count * rate}`;
          });
          
        // If we have services with post counts, use them
        if (serviceItems.length > 0) {
          servicesText = serviceItems.join(', ');
        }
      } else if (clientDetails.services && Object.keys(clientDetails.services).length > 0) {
        // Format services with prices for regular clients
        servicesText = Object.entries(clientDetails.services)
          .map(([service, price]) => `${service} (₹${price})`)
          .join(', ');
      }
      
      // Auto-populate form with client data
      setInvoiceData(prev => ({
        ...prev,
        personName: clientDetails.name || '',
        companyName: clientDetails.company || clientDetails.name || '',
        companyAddress: clientDetails.company_address || '',
        gst: clientDetails.gst_number || '',
        phoneNumber: clientDetails.poc_phone || clientDetails.phone || '',
        services: servicesText,
        dueDate: payment.dueDate || prev.dueDate,
      }))
      
      // Also preload the invoice services for immediate display
      const services = await parseServicesForInvoice();
      setInvoiceServices(services);
      
      toast.success("Client details loaded automatically!")
      
      setSelectedPayment(payment)
      setShowInvoiceForm(true)
    } catch (error) {
      console.error("Error fetching client details:", error)
      toast.error("Failed to fetch client details")
      
      // Fallback: open form with empty data
      setSelectedPayment(payment)
      setShowInvoiceForm(true)
    } finally {
      setIsLoadingClientData(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return `${invoiceData.currencySymbol || '₹'}${amount.toFixed(0)}`
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
                            disabled={isLoadingClientData}
                          >
                            {isLoadingClientData ? (
                              <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
                            ) : (
                              <Mail className="h-3 w-3" />
                            )}
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
                      services: 'Social Media Services',
                      fromName: 'Janavi Sawadia',
                      fromAddress: 'House Number 3021, Sector 51 D\nChandigarh',
                      fromPhone: '9915474100',
                      fromEmail: 'sawadiajanavi@gmail.com',
                      bankAccountName: 'HDFCJanavi',
                      bankAccountNumber: 'FOUEWND134',
                      bankIFSC: '1329',
                      upiId: 'ewdwniowe@ptsbi',
                      upiPhone: '9915474100',
                      contactEmail: 'sawadiajanavi@gmail.com',
                      dueDate: '',
                      invoiceNumber: '',
                      invoiceDate: '',
                      businessTitle: '',
                      businessSubtitle: '',
                      thankYouMessage: '',
                      paymentInstructions: '',
                      termsAndConditions: '',
                      footerText: '',
                      currencySymbol: '₹',
                      taxRate: '0',
                      discountAmount: '0',
                      discountReason: '',
                      notes: '',
                      logoUrl: '',
                      signatureUrl: '',
                      customField1: '',
                      customField2: '',
                      customField3: '',
                      customField4: '',
                      customField5: '',
                    })
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              {/* Form */}
              <div className="mb-4 p-3 bg-blue-900/20 border border-blue-700/30 rounded-lg">
                <p className="text-sm text-blue-300">
                  ℹ️ Client details have been automatically populated from your database. You can edit any field as needed.
                </p>
              </div>
              
              <div className="space-y-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Person's Name
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
                    Company Name
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
                    Company Address
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
                    GST Number
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
                    Phone Number
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
                  <textarea
                    value={invoiceData.services}
                    onChange={(e) => setInvoiceData(prev => ({ ...prev, services: e.target.value }))}
                    rows={3}
                    className="w-full px-4 py-3 bg-black border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter services. For separate line items, use format: Service 1 (₹5000), Service 2 (₹3000)"
                  />
                  <p className="text-xs text-gray-400 mt-1">
                    💡 Tip: Use "Service Name (₹Amount)" format for individual line items, separated by commas
                  </p>
                </div>
                {/* FROM (Your Business Info) */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">From Name</label>
                  <input
                    type="text"
                    value={invoiceData.fromName}
                    onChange={e => setInvoiceData(prev => ({ ...prev, fromName: e.target.value }))}
                    className="w-full px-4 py-3 bg-black border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter your name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">From Address</label>
                  <textarea
                    value={invoiceData.fromAddress}
                    onChange={e => setInvoiceData(prev => ({ ...prev, fromAddress: e.target.value }))}
                    rows={2}
                    className="w-full px-4 py-3 bg-black border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter your address"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">From Phone</label>
                  <input
                    type="text"
                    value={invoiceData.fromPhone}
                    onChange={e => setInvoiceData(prev => ({ ...prev, fromPhone: e.target.value }))}
                    className="w-full px-4 py-3 bg-black border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter your phone number"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">From Email</label>
                  <input
                    type="email"
                    value={invoiceData.fromEmail}
                    onChange={e => setInvoiceData(prev => ({ ...prev, fromEmail: e.target.value }))}
                    className="w-full px-4 py-3 bg-black border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter your email"
                  />
                </div>
                {/* Bank Transfer */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Bank Account Name</label>
                  <input
                    type="text"
                    value={invoiceData.bankAccountName}
                    onChange={e => setInvoiceData(prev => ({ ...prev, bankAccountName: e.target.value }))}
                    className="w-full px-4 py-3 bg-black border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter account name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Bank Account Number</label>
                  <input
                    type="text"
                    value={invoiceData.bankAccountNumber}
                    onChange={e => setInvoiceData(prev => ({ ...prev, bankAccountNumber: e.target.value }))}
                    className="w-full px-4 py-3 bg-black border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter account number"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Bank IFSC</label>
                  <input
                    type="text"
                    value={invoiceData.bankIFSC}
                    onChange={e => setInvoiceData(prev => ({ ...prev, bankIFSC: e.target.value }))}
                    className="w-full px-4 py-3 bg-black border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter IFSC code"
                  />
                </div>
                {/* UPI Payment */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">UPI ID</label>
                  <input
                    type="text"
                    value={invoiceData.upiId}
                    onChange={e => setInvoiceData(prev => ({ ...prev, upiId: e.target.value }))}
                    className="w-full px-4 py-3 bg-black border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter UPI ID"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">UPI Phone</label>
                  <input
                    type="text"
                    value={invoiceData.upiPhone}
                    onChange={e => setInvoiceData(prev => ({ ...prev, upiPhone: e.target.value }))}
                    className="w-full px-4 py-3 bg-black border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter UPI phone number"
                  />
                </div>
                {/* Contact Email */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Contact Email</label>
                  <input
                    type="email"
                    value={invoiceData.contactEmail}
                    onChange={e => setInvoiceData(prev => ({ ...prev, contactEmail: e.target.value }))}
                    className="w-full px-4 py-3 bg-black border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter contact email"
                  />
                </div>
                {/* Due Date */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Due Date</label>
                  <input
                    type="date"
                    value={invoiceData.dueDate}
                    onChange={e => setInvoiceData(prev => ({ ...prev, dueDate: e.target.value }))}
                    className="w-full px-4 py-3 bg-black border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter due date"
                  />
                </div>

                {/* Invoice Details */}
                <div className="border-t border-gray-700 pt-4 mt-4">
                  <h3 className="text-lg font-semibold text-white mb-4">Invoice Details</h3>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Invoice Number</label>
                  <input
                    type="text"
                    value={invoiceData.invoiceNumber}
                    onChange={e => setInvoiceData(prev => ({ ...prev, invoiceNumber: e.target.value }))}
                    className="w-full px-4 py-3 bg-black border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Auto-generated or custom invoice number"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Invoice Date</label>
                  <input
                    type="date"
                    value={invoiceData.invoiceDate}
                    onChange={e => setInvoiceData(prev => ({ ...prev, invoiceDate: e.target.value }))}
                    className="w-full px-4 py-3 bg-black border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Invoice date"
                  />
                </div>

                {/* Business Branding */}
                <div className="border-t border-gray-700 pt-4 mt-4">
                  <h3 className="text-lg font-semibold text-white mb-4">Business Branding</h3>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Business Title</label>
                  <input
                    type="text"
                    value={invoiceData.businessTitle}
                    onChange={e => setInvoiceData(prev => ({ ...prev, businessTitle: e.target.value }))}
                    className="w-full px-4 py-3 bg-black border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Your business name/title"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Business Subtitle</label>
                  <input
                    type="text"
                    value={invoiceData.businessSubtitle}
                    onChange={e => setInvoiceData(prev => ({ ...prev, businessSubtitle: e.target.value }))}
                    className="w-full px-4 py-3 bg-black border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Business tagline or subtitle"
                  />
                </div>

                {/* Payment & Financial Details */}
                <div className="border-t border-gray-700 pt-4 mt-4">
                  <h3 className="text-lg font-semibold text-white mb-4">Payment & Financial Details</h3>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Currency Symbol</label>
                  <input
                    type="text"
                    value={invoiceData.currencySymbol}
                    onChange={e => setInvoiceData(prev => ({ ...prev, currencySymbol: e.target.value }))}
                    className="w-full px-4 py-3 bg-black border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="₹"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Tax Rate (%)</label>
                  <input
                    type="number"
                    value={invoiceData.taxRate}
                    onChange={e => setInvoiceData(prev => ({ ...prev, taxRate: e.target.value }))}
                    className="w-full px-4 py-3 bg-black border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="0"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Discount Amount</label>
                  <input
                    type="number"
                    value={invoiceData.discountAmount}
                    onChange={e => setInvoiceData(prev => ({ ...prev, discountAmount: e.target.value }))}
                    className="w-full px-4 py-3 bg-black border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="0"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Discount Reason</label>
                  <input
                    type="text"
                    value={invoiceData.discountReason}
                    onChange={e => setInvoiceData(prev => ({ ...prev, discountReason: e.target.value }))}
                    className="w-full px-4 py-3 bg-black border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Reason for discount"
                  />
                </div>

                {/* Messages & Content */}
                <div className="border-t border-gray-700 pt-4 mt-4">
                  <h3 className="text-lg font-semibold text-white mb-4">Messages & Content</h3>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Thank You Message</label>
                  <textarea
                    value={invoiceData.thankYouMessage}
                    onChange={e => setInvoiceData(prev => ({ ...prev, thankYouMessage: e.target.value }))}
                    rows={2}
                    className="w-full px-4 py-3 bg-black border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Thank you for your business!"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Payment Instructions</label>
                  <textarea
                    value={invoiceData.paymentInstructions}
                    onChange={e => setInvoiceData(prev => ({ ...prev, paymentInstructions: e.target.value }))}
                    rows={3}
                    className="w-full px-4 py-3 bg-black border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Additional payment instructions"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Terms & Conditions</label>
                  <textarea
                    value={invoiceData.termsAndConditions}
                    onChange={e => setInvoiceData(prev => ({ ...prev, termsAndConditions: e.target.value }))}
                    rows={3}
                    className="w-full px-4 py-3 bg-black border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Terms and conditions"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Notes</label>
                  <textarea
                    value={invoiceData.notes}
                    onChange={e => setInvoiceData(prev => ({ ...prev, notes: e.target.value }))}
                    rows={2}
                    className="w-full px-4 py-3 bg-black border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Additional notes"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Footer Text</label>
                  <textarea
                    value={invoiceData.footerText}
                    onChange={e => setInvoiceData(prev => ({ ...prev, footerText: e.target.value }))}
                    rows={2}
                    className="w-full px-4 py-3 bg-black border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Footer text"
                  />
                </div>

                {/* Custom Fields */}
                <div className="border-t border-gray-700 pt-4 mt-4">
                  <h3 className="text-lg font-semibold text-white mb-4">Custom Fields</h3>
                </div>
                
                {[1, 2, 3, 4, 5].map((num) => (
                  <div key={num}>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Custom Field {num}</label>
                    <input
                      type="text"
                      value={invoiceData[`customField${num}` as keyof InvoiceData] as string}
                      onChange={e => setInvoiceData(prev => ({ ...prev, [`customField${num}`]: e.target.value }))}
                      className="w-full px-4 py-3 bg-black border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder={`Custom field ${num}`}
                    />
                  </div>
                ))}

                {/* Media URLs */}
                <div className="border-t border-gray-700 pt-4 mt-4">
                  <h3 className="text-lg font-semibold text-white mb-4">Media</h3>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Logo URL</label>
                  <input
                    type="url"
                    value={invoiceData.logoUrl}
                    onChange={e => setInvoiceData(prev => ({ ...prev, logoUrl: e.target.value }))}
                    className="w-full px-4 py-3 bg-black border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="https://example.com/logo.png"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Signature URL</label>
                  <input
                    type="url"
                    value={invoiceData.signatureUrl}
                    onChange={e => setInvoiceData(prev => ({ ...prev, signatureUrl: e.target.value }))}
                    className="w-full px-4 py-3 bg-black border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="https://example.com/signature.png"
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
                      services: 'Social Media Services',
                      fromName: 'Janavi Sawadia',
                      fromAddress: 'House Number 3021, Sector 51 D\nChandigarh',
                      fromPhone: '9915474100',
                      fromEmail: 'sawadiajanavi@gmail.com',
                      bankAccountName: 'HDFCJanavi',
                      bankAccountNumber: 'FOUEWND134',
                      bankIFSC: '1329',
                      upiId: 'ewdwniowe@ptsbi',
                      upiPhone: '9915474100',
                      contactEmail: 'sawadiajanavi@gmail.com',
                      dueDate: '',
                      invoiceNumber: '',
                      invoiceDate: '',
                      businessTitle: '',
                      businessSubtitle: '',
                      thankYouMessage: '',
                      paymentInstructions: '',
                      termsAndConditions: '',
                      footerText: '',
                      currencySymbol: '₹',
                      taxRate: '0',
                      discountAmount: '0',
                      discountReason: '',
                      notes: '',
                      logoUrl: '',
                      signatureUrl: '',
                      customField1: '',
                      customField2: '',
                      customField3: '',
                      customField4: '',
                      customField5: '',
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
                      <div className="text-5xl font-bold text-black">
                        {invoiceData.logoUrl ? (
                          <img src={invoiceData.logoUrl} alt="Logo" className="h-12 w-auto" />
                        ) : (
                          "&"
                        )}
                      </div>
                      <div className="text-right">
                        <h1 className="text-3xl font-light text-black tracking-wider mb-4">
                          {invoiceData.businessTitle || "INVOICE"}
                        </h1>
                        {invoiceData.businessSubtitle && (
                          <p className="text-sm text-gray-600 mb-2">{invoiceData.businessSubtitle}</p>
                        )}
                        <div className="text-sm text-gray-700">
                          <p className="mb-1">Invoice No. {invoiceData.invoiceNumber || generateInvoiceNumber(selectedPayment.client)}</p>
                          <p>{invoiceData.invoiceDate ? new Date(invoiceData.invoiceDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                        </div>
                      </div>
                    </div>

                    {/* From and To sections */}
                    <div className="grid grid-cols-2 gap-6 mb-8">
                      {/* From */}
                      <div>
                        <h3 className="text-sm font-semibold text-black mb-2 tracking-wide">FROM:</h3>
                        <div className="text-sm text-gray-700 leading-relaxed">
                          <p className="font-medium text-black">{invoiceData.fromName}</p>
                          {invoiceData.fromAddress.split('\n').map((line, idx) => <p key={idx}>{line}</p>)}
                          <p>{invoiceData.fromPhone}</p>
                          <p>{invoiceData.fromEmail}</p>
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
                            <th className="text-right py-2 text-sm font-medium text-gray-700 tracking-wide">Amount</th>
                          </tr>
                        </thead>
                        <tbody>
                          {/* Services list will be populated at PDF generation time */}
                          {invoiceServices.map((service, index) => (
                            <tr key={index} className="border-b border-gray-100">
                              <td className="py-3 text-sm text-gray-700">{service.name}</td>
                              <td className="py-3 text-right text-sm font-medium text-gray-700">{formatCurrency(service.amount)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Total */}
                    <div className="flex justify-end mb-6">
                      <div className="w-64">
                        {invoiceData.discountAmount && Number(invoiceData.discountAmount) > 0 && (
                          <div className="flex justify-between py-1 text-sm text-gray-600">
                            <span>Subtotal</span>
                            <span>{formatCurrency(invoiceServices.reduce((sum, service) => sum + service.amount, 0))}</span>
                          </div>
                        )}
                        {invoiceData.discountAmount && Number(invoiceData.discountAmount) > 0 && (
                          <div className="flex justify-between py-1 text-sm text-gray-600">
                            <span>Discount ({invoiceData.discountReason || 'Discount'})</span>
                            <span>-{formatCurrency(Number(invoiceData.discountAmount))}</span>
                          </div>
                        )}
                        {invoiceData.taxRate && Number(invoiceData.taxRate) > 0 && (
                          <div className="flex justify-between py-1 text-sm text-gray-600">
                            <span>Tax ({invoiceData.taxRate}%)</span>
                            <span>{formatCurrency((invoiceServices.reduce((sum, service) => sum + service.amount, 0) - Number(invoiceData.discountAmount || 0)) * Number(invoiceData.taxRate) / 100)}</span>
                          </div>
                        )}
                        <div className="flex justify-between py-3 text-lg font-bold border-t border-gray-300">
                          <span className="text-black">Total</span>
                          <span className="text-black">
                            {formatCurrency(
                              invoiceServices.reduce((sum, service) => sum + service.amount, 0) - 
                              Number(invoiceData.discountAmount || 0) + 
                              ((invoiceServices.reduce((sum, service) => sum + service.amount, 0) - Number(invoiceData.discountAmount || 0)) * Number(invoiceData.taxRate || 0) / 100)
                            )}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Thank you */}
                    <div className="mb-8">
                      <h2 className="text-xl font-light text-gray-800">
                        {invoiceData.thankYouMessage || "Thank you!"}
                      </h2>
                      {invoiceData.notes && (
                        <p className="text-sm text-gray-600 mt-2">{invoiceData.notes}</p>
                      )}
                    </div>

                    {/* Custom Fields */}
                    {(invoiceData.customField1 || invoiceData.customField2 || invoiceData.customField3 || invoiceData.customField4 || invoiceData.customField5) && (
                      <div className="mb-6">
                        <div className="grid grid-cols-2 gap-4 text-sm text-gray-700">
                          {invoiceData.customField1 && (
                            <div>
                              <span className="font-medium">{invoiceData.customField1}</span>
                            </div>
                          )}
                          {invoiceData.customField2 && (
                            <div>
                              <span className="font-medium">{invoiceData.customField2}</span>
                            </div>
                          )}
                          {invoiceData.customField3 && (
                            <div>
                              <span className="font-medium">{invoiceData.customField3}</span>
                            </div>
                          )}
                          {invoiceData.customField4 && (
                            <div>
                              <span className="font-medium">{invoiceData.customField4}</span>
                            </div>
                          )}
                          {invoiceData.customField5 && (
                            <div>
                              <span className="font-medium">{invoiceData.customField5}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Payment Information */}
                    <div className="grid grid-cols-2 gap-6">
                      <div>
                        <h3 className="text-sm font-semibold text-black mb-2 tracking-wide">PAYMENT INFORMATION</h3>
                        <div className="text-sm text-gray-700 leading-relaxed mb-3">
                          <p>Due Date: {invoiceData.dueDate || selectedPayment.dueDate}</p>
                          <p>Contact: {invoiceData.contactEmail}</p>
                          {invoiceData.paymentInstructions && (
                            <p className="mt-2 italic">{invoiceData.paymentInstructions}</p>
                          )}
                        </div>
                        
                        <div className="mb-3">
                          <h4 className="text-sm font-semibold text-black mb-1">Bank Transfer:</h4>
                          <div className="text-sm text-gray-700 leading-relaxed">
                            <p>Account Name: {invoiceData.bankAccountName}</p>
                            <p>Account Number: {invoiceData.bankAccountNumber}</p>
                            <p>IFSC Code: {invoiceData.bankIFSC}</p>
                          </div>
                        </div>

                        <div className="mb-3">
                          <h4 className="text-sm font-semibold text-black mb-1">UPI Payment:</h4>
                          <div className="text-sm text-gray-700 leading-relaxed">
                            <p>UPI ID: {invoiceData.upiId}</p>
                            <p>Phone: {invoiceData.upiPhone}</p>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <h3 className="text-lg font-light text-black mb-1">{invoiceData.fromName}</h3>
                        <p className="text-sm text-gray-700 mb-4">Social Media Services</p>
                        {invoiceData.signatureUrl && (
                          <img src={invoiceData.signatureUrl} alt="Signature" className="h-12 w-auto mt-2" />
                        )}
                      </div>
                    </div>

                    {/* Terms and Conditions */}
                    {invoiceData.termsAndConditions && (
                      <div className="mt-6 pt-4 border-t border-gray-200">
                        <h4 className="text-sm font-semibold text-black mb-2">Terms & Conditions</h4>
                        <p className="text-xs text-gray-600 leading-relaxed">{invoiceData.termsAndConditions}</p>
                      </div>
                    )}

                    {/* Footer */}
                    {invoiceData.footerText && (
                      <div className="mt-4 pt-4 border-t border-gray-200">
                        <p className="text-xs text-gray-500 text-center">{invoiceData.footerText}</p>
                      </div>
                    )}
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