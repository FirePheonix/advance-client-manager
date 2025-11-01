"use client"

import { useEffect, useState, useRef } from "react"
import { Card, Typography, Button, Table, Badge, message, Modal, Input, Row, Col, List, Tooltip, Upload } from "antd"
import { MailOutlined, CheckOutlined, ToTopOutlined, SendOutlined } from "@ant-design/icons"
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
  createPerPostPayment,
  getSettings
} from "@/lib/database"
import type { Client } from "@/lib/supabase"

const { Title, Text, Paragraph } = Typography

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

export function UpcomingPaymentsNew() {
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
    fromName: '',
    fromAddress: '',
    fromPhone: '',
    fromEmail: '',
    bankAccountName: '',
    bankAccountNumber: '',
    bankIFSC: '',
    upiId: '',
    upiPhone: '',
    contactEmail: '',
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
  const [isUpdatingPreview, setIsUpdatingPreview] = useState(false)
  const invoiceRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    loadPayments()
    loadSettings()
    
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

  const loadSettings = async () => {
    try {
      const settings = await getSettings()
      console.log("Settings loaded in loadSettings:", settings) // Debug log
      
      // Update default invoice data with settings from database
      setInvoiceData(prev => {
        const updatedData = {
          ...prev,
          fromName: settings.from_name || 'Janavi Sawadia',
          fromAddress: settings.from_address || '403, Maruti Kunj, Mohaba bazaar, opposite Sinapore City, Raipur, Chhattisgarh- 492001',
          fromPhone: settings.from_phone || '9915474100',
          fromEmail: settings.from_email || 'sawadiajanavi@gmail.com',
          bankAccountName: settings.bank_account_name || 'Janavi Sawadia',
          bankAccountNumber: settings.bank_account_number || '50100613672509',
          bankIFSC: settings.bank_ifsc || 'HDFC0000769',
          upiId: settings.upi_id || '7241113205@upi',
          upiPhone: settings.upi_phone || '9915474100',
          contactEmail: settings.contact_email || 'sawadiajanavi@gmail.com',
          // Set default values for other invoice fields
          businessTitle: 'INVOICE',
          thankYouMessage: 'Thank you for your business!',
          paymentInstructions: 'Please make payment using the bank details or UPI ID provided above.',
          termsAndConditions: 'Payment is due within 15 days of invoice date. Late payments may incur additional charges.',
          currencySymbol: '₹',
          taxRate: '0',
          discountAmount: '0',
        }
        console.log("Updated invoice data in loadSettings:", updatedData) // Debug log
        return updatedData
      })
    } catch (error) {
      console.error("Error loading settings:", error)
    }
  }

  const resetInvoiceForm = () => {
    // Reset only client-specific fields, keep business information from settings
    setInvoiceData(prev => ({
      ...prev,
      personName: '',
      companyName: '',
      companyAddress: '',
      gst: '',
      phoneNumber: '',
      services: 'Social Media Services',
      dueDate: '',
      // Keep all business information from settings (fromName, fromAddress, etc.)
      // Keep all invoice defaults from settings (businessTitle, thankYouMessage, etc.)
    }))
    // Reload settings to ensure business information is up to date
    loadSettings()
  }
  
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

  // Effect to update invoice services when services field changes
  useEffect(() => {
    if (showInvoiceForm && selectedPayment && invoiceData.services) {
      setIsUpdatingPreview(true)
      const timeoutId = setTimeout(async () => {
        try {
          // Parse services with a more flexible approach
          const parsed = parseServicesFlexibly(invoiceData.services)
          
          if (parsed.length > 0) {
            setInvoiceServices(parsed)
            setIsUpdatingPreview(false)
            return
          }
        
          // If no parsing worked, use the original parseServicesForInvoice function
          const services = await parseServicesForInvoice()
          setInvoiceServices(services)
          setIsUpdatingPreview(false)
        } catch (error) {
          console.error("Error updating invoice services:", error)
          setIsUpdatingPreview(false)
        }
      }, 200) // Reduced debounce to 200ms for better responsiveness
      
      return () => clearTimeout(timeoutId)
    }
  }, [invoiceData.services, showInvoiceForm, selectedPayment])

  // Effect to force re-render of invoice preview when key fields change
  useEffect(() => {
    if (showInvoiceForm && selectedPayment) {
      // Force a re-render of the invoice preview by updating a state variable
      // This ensures the preview updates when currency, discount, tax, etc. change
      const timeoutId = setTimeout(() => {
        // Trigger a re-render by updating the invoice services state
        setInvoiceServices(prev => [...prev])
      }, 100)
      
      return () => clearTimeout(timeoutId)
    }
  }, [
    invoiceData.currencySymbol, 
    invoiceData.discountAmount, 
    invoiceData.taxRate, 
    invoiceData.discountReason,
    invoiceData.businessTitle,
    invoiceData.thankYouMessage,
    invoiceData.paymentInstructions,
    invoiceData.termsAndConditions,
    invoiceData.notes,
    invoiceData.footerText,
    showInvoiceForm, 
    selectedPayment
  ])

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
      message.error("Failed to load payments")
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
        const parsed = parseServicesFlexibly(invoiceData.services)
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

  // Flexible service parser that handles various formats
  const parseServicesFlexibly = (servicesString: string): Array<{ name: string; amount: number }> => {
    if (!servicesString || !servicesString.includes('₹')) {
      return []
    }

    const services = servicesString.split(',').map(serviceStr => {
      const trimmed = serviceStr.trim()
      
      // Try multiple patterns to extract name and amount
      let name = ''
      let amount = 0
      
      // Pattern 1: "Service Name (X posts) - ₹Amount" - preserve the full name including posts
      if (trimmed.includes(' - ₹')) {
        const parts = trimmed.split(' - ₹')
        if (parts.length === 2) {
          name = parts[0].trim()
          amount = parseInt(parts[1])
        }
      }
      // Pattern 2: "Service Name (₹Amount)"
      else if (trimmed.includes('(₹')) {
        const match = trimmed.match(/^(.+?)\s*\(₹(\d+)\)$/)
        if (match) {
          name = match[1].trim()
          amount = parseInt(match[2])
        }
      }
      // Pattern 3: Just find the last ₹ and extract amount
      else {
        const lastRupeeIndex = trimmed.lastIndexOf('₹')
        if (lastRupeeIndex !== -1) {
          const beforeRupee = trimmed.substring(0, lastRupeeIndex).trim()
          const afterRupee = trimmed.substring(lastRupeeIndex + 1)
          const amountMatch = afterRupee.match(/^(\d+)/)
          
          if (amountMatch && beforeRupee) {
            name = beforeRupee
            amount = parseInt(amountMatch[1])
          }
        }
      }
      
      // Only return if we found both name and amount
      if (name && amount > 0) {
        return { name, amount }
      }
      
      return null
    }).filter((item): item is { name: string; amount: number } => item !== null)
    
    return services
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
      message.error('No payment selected to generate invoice.')
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
        message.error('Failed to generate PDF')
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

      message.success('Invoice generated successfully! PDF downloaded and Gmail opened.')
      
      // Reset form
      setShowInvoiceForm(false)
      setSelectedPayment(null)
      resetInvoiceForm()
      
    } catch (error) {
      console.error('Error generating invoice:', error)
      message.error('Error generating invoice. Please try again.')
    } finally {
      setIsGenerating(false)
    }
  }

  const handleMarkAsPaid = async (paymentId: string, clientId: string, amount: number, dueDate: string) => {
    try {
      console.log("DEBUG: Attempting to mark payment as paid", { paymentId, clientId, amount, dueDate })
      
      // Get client to check payment type
      const client = await getClientById(clientId)
      console.log("DEBUG: Client data retrieved", client)
      
      if (client.payment_type === 'per-post') {
        console.log("DEBUG: Processing per-post client payment")
        // For per-post clients, get current post counts before creating payment
        const postCountsData = await getPostCountsForClient(clientId)
        console.log("DEBUG: Post counts retrieved", postCountsData)
        
        // Create a specialized per-post payment that also resets counts
        await createPerPostPayment(
          clientId, 
          amount, 
          postCountsData
        )
        
        console.log("DEBUG: Per-post payment created and post counts reset")
      } else {
        console.log("DEBUG: Processing regular client payment")
        // Regular client - create standard payment
        await createPayment({
          client_id: clientId,
          amount: amount,
          payment_date: dueDate,
          status: "completed",
          type: "payment",
          description: "Monthly payment received",
        })
        console.log("DEBUG: Regular payment created successfully")

        // Update client's next payment date appropriately
        await updateClientNextPayment(clientId, dueDate)
        console.log("DEBUG: Next payment date updated successfully")
      }

      // Update local state to reflect payment
      setPayments(prev => prev.map(p => 
        p.id === paymentId ? { ...p, paymentDone: true, status: "paid" } : p
      ))

      message.success("Payment marked as completed and next payment date updated")
      
      // Force reload all payments to ensure everything is up to date
      loadPayments()
    } catch (error) {
      console.error("ERROR: Failed to mark payment as paid:", error)
      console.error("ERROR: Error details:", {
        message: (error as any)?.message,
        code: (error as any)?.code,
        details: (error as any)?.details,
        hint: (error as any)?.hint
      })
      message.error(`Failed to mark payment as paid: ${(error as any)?.message || 'Unknown error'}`)
    }
  }

  const handleOpenInvoiceForm = async (payment: UpcomingPayment) => {
    setIsLoadingClientData(true)
    
    try {
      // Fetch full client details and settings
      const [clientDetails, settings] = await Promise.all([
        getClientById(payment.id),
        getSettings()
      ])
      
      console.log("Client details:", clientDetails) // Debug log
      console.log("Settings in handleOpenInvoiceForm:", settings) // Debug log
      console.log("Client next_payment:", clientDetails.next_payment) // Debug log
      console.log("Payment dueDate:", payment.dueDate) // Debug log
      
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
      
      // Auto-populate form with client data and settings
      setInvoiceData(prev => ({
        ...prev,
        // Client information
        personName: clientDetails.name || '',
        companyName: clientDetails.company || clientDetails.name || '',
        companyAddress: clientDetails.company_address || '',
        gst: clientDetails.gst_number || '',
        phoneNumber: clientDetails.poc_phone || clientDetails.phone || '',
        services: servicesText,
        dueDate: clientDetails.next_payment ? new Date(clientDetails.next_payment).toLocaleDateString() : (payment.dueDate || prev.dueDate),
        
        // Business information from settings
        fromName: settings.from_name || 'Janavi Sawadia',
        fromAddress: settings.from_address || '403, Maruti Kunj, Mohaba bazaar, opposite Sinapore City, Raipur, Chhattisgarh- 492001',
        fromPhone: settings.from_phone || '9915474100',
        fromEmail: settings.from_email || 'sawadiajanavi@gmail.com',
        
        // Bank information from settings
        bankAccountName: settings.bank_account_name || 'Janavi Sawadia',
        bankAccountNumber: settings.bank_account_number || '50100613672509',
        bankIFSC: settings.bank_ifsc || 'HDFC0000769',
        upiId: settings.upi_id || '7241113205@upi',
        upiPhone: settings.upi_phone || '9915474100',
        contactEmail: settings.contact_email || 'sawadiajanavi@gmail.com',
        
        // Invoice details - use defaults since we simplified settings
        invoiceNumber: '',
        invoiceDate: new Date().toLocaleDateString(),
        businessTitle: 'INVOICE',
        businessSubtitle: '',
        thankYouMessage: 'Thank you for your business!',
        paymentInstructions: 'Please make payment using the bank details or UPI ID provided above.',
        termsAndConditions: 'Payment is due within 15 days of invoice date. Late payments may incur additional charges.',
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
        customField3: settings.customField3 || '',
        customField4: settings.customField4 || '',
        customField5: settings.customField5 || '',
      }))
      
      console.log("Due date being set:", clientDetails.next_payment ? new Date(clientDetails.next_payment).toLocaleDateString() : (payment.dueDate || "no fallback")) // Debug log
      
      // Also preload the invoice services for immediate display
      const services = await parseServicesForInvoice();
      setInvoiceServices(services);
      
      message.success("Client details and business information loaded automatically!")
      
      setSelectedPayment(payment)
      setShowInvoiceForm(true)
    } catch (error) {
      console.error("Error fetching client details:", error)
      message.error("Failed to fetch client details")
      
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

  const uploadProps = {
    name: "file",
    action: "https://www.mocky.io/v2/5cc8019d300000980a055e76",
    headers: {
      authorization: "authorization-text",
    },
    onChange(info: any) {
      if (info.file.status !== "uploading") {
        console.log(info.file, info.fileList);
      }
      if (info.file.status === "done") {
        message.success(`${info.file.name} file uploaded successfully`);
      } else if (info.file.status === "error") {
        message.error(`${info.file.name} file upload failed.`);
      }
    },
  };

  if (loading) {
    return (
      <Card bordered={false} className="criclebox cardbody h-full">
        <div className="project-ant">
          <div>
            <Title level={5}>Upcoming Payments</Title>
            <Paragraph className="lastweek">Loading...</Paragraph>
          </div>
        </div>
        <div className="ant-list-box table-responsive">
          <table className="width-100">
            <thead>
              <tr>
                <th>CLIENT</th>
                <th>AMOUNT</th>
                <th>DUE DATE</th>
                <th>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {[1, 2, 3].map((i) => (
                <tr key={`loading-${i}`}>
                  <td>
                    <h6>
                      <div className="avatar-sm mr-10 bg-gray-300 animate-pulse rounded"></div>
                      Loading...
                    </h6>
                  </td>
                  <td>--</td>
                  <td>--</td>
                  <td>--</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    )
  }

  return (
    <>
      <Card bordered={false} className="criclebox cardbody h-full">
        <div className="project-ant">
          <div>
            <Title level={5}>Upcoming Payments</Title>
            <Paragraph className="lastweek">
              {payments.length} payments due in next 7 days <span className="blue">{payments.filter(p => !p.paymentDone).length}</span>
            </Paragraph>
          </div>
        </div>
        <div className="ant-list-box table-responsive">
          <table className="upcoming-payments-table">
            <thead>
              <tr>
                <th>CLIENT</th>
                <th>AMOUNT</th>
                <th>DUE DATE</th>
                <th>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {payments.length > 0 ? (
                payments.map((payment, index) => (
                  <tr key={index}>
                    <td>
                      <div className="client-info">
                        <div className="avatar-circle">
                          {payment.client.charAt(0).toUpperCase()}
                        </div>
                        <span className="client-name">{payment.client}</span>
                      </div>
                    </td>
                    <td>
                      <span className="payment-amount">
                        ₹{payment.amount}
                      </span>
                    </td>
                    <td>
                      <div className="date-info">
                        <div className="due-date">{payment.dueDate}</div>
                        <div 
                          className={`status-text ${
                            payment.status === "overdue" ? 'overdue' :
                            payment.status === "paid" ? 'paid' : 'upcoming'
                          }`}
                        >
                          {payment.status === "overdue" 
                            ? `Overdue (${Math.abs(payment.daysUntilDue)}d)` 
                            : payment.status === "paid"
                              ? "Paid"
                              : `Due in ${payment.daysUntilDue}d`}
                        </div>
                      </div>
                    </td>
                    <td>
                      {!payment.paymentDone ? (
                        <div className="action-buttons">
                          <Button
                            size="small"
                            type="default"
                            icon={<MailOutlined />}
                            onClick={() => handleOpenInvoiceForm(payment)}
                            title="Send Invoice"
                            loading={isLoadingClientData}
                            className="action-btn"
                          />
                          <Button
                            size="small"
                            type="default"
                            icon={<CheckOutlined />}
                            onClick={() => handleMarkAsPaid(payment.id, payment.id, payment.amount, payment.dueDate)}
                            title="Mark as Paid"
                            className="action-btn paid-btn"
                          />
                        </div>
                      ) : (
                        <span className="paid-status">✓ Paid</span>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="no-payments">
                    No upcoming payments in the next 7 days
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="uploadfile shadow-none">
          <Upload {...uploadProps}>
            <Button
              type="dashed"
              className="ant-full-box"
              icon={<ToTopOutlined />}
            >
              <span className="click">Click to Upload</span>
            </Button>
          </Upload>
        </div>
      </Card>

      {/* Invoice Form Modal - Same as original upcoming-payments.tsx */}
      {showInvoiceForm && selectedPayment && (
        <Modal
          title="Generate Invoice"
          open={showInvoiceForm}
          onCancel={() => {
            setShowInvoiceForm(false)
            setSelectedPayment(null)
            resetInvoiceForm()
          }}
          width={1200}
          footer={[
            <Button
              key="cancel"
              onClick={() => {
                setShowInvoiceForm(false)
                setSelectedPayment(null)
                resetInvoiceForm()
              }}
            >
              Cancel
            </Button>,
            <Button
              key="generate"
              type="primary"
              loading={isGenerating}
              onClick={handleGenerateAndSend}
              icon={!isGenerating ? <SendOutlined /> : undefined}
            >
              {isGenerating ? 'Generating...' : 'Generate & Send'}
            </Button>
          ]}
        >
          <div style={{ maxHeight: '70vh', overflowY: 'auto' }}>
            {/* Form inputs - same structure as original */}
            <div style={{ marginBottom: 16, padding: 12, backgroundColor: '#e6f7ff', borderRadius: 6, border: '1px solid #91d5ff' }}>
              <Text type="secondary">
                ℹ️ Client details have been automatically populated from your database. You can edit any field as needed.
              </Text>
            </div>
            
            <Row gutter={[16, 16]}>
              {/* Person's Name */}
              <Col xs={24} md={12}>
                <div style={{ marginBottom: 16 }}>
                  <Text strong>Person's Name</Text>
                  <Input
                    value={invoiceData.personName}
                    onChange={(e) => setInvoiceData(prev => ({ ...prev, personName: e.target.value }))}
                    placeholder="Enter person's name"
                  />
                </div>
              </Col>
              
              {/* Company Name */}
              <Col xs={24} md={12}>
                <div style={{ marginBottom: 16 }}>
                  <Text strong>Company Name</Text>
                  <Input
                    value={invoiceData.companyName}
                    onChange={(e) => setInvoiceData(prev => ({ ...prev, companyName: e.target.value }))}
                    placeholder="Enter company name"
                  />
                </div>
              </Col>
              
              {/* Company Address */}
              <Col xs={24}>
                <div style={{ marginBottom: 16 }}>
                  <Text strong>Company Address</Text>
                  <Input.TextArea
                    value={invoiceData.companyAddress}
                    onChange={(e) => setInvoiceData(prev => ({ ...prev, companyAddress: e.target.value }))}
                    rows={3}
                    placeholder="Enter full company address"
                  />
                </div>
              </Col>
              
              {/* GST Number */}
              <Col xs={24} md={12}>
                <div style={{ marginBottom: 16 }}>
                  <Text strong>GST Number</Text>
                  <Input
                    value={invoiceData.gst}
                    onChange={(e) => setInvoiceData(prev => ({ ...prev, gst: e.target.value }))}
                    placeholder="Enter GST number"
                  />
                </div>
              </Col>
              
              {/* Phone Number */}
              <Col xs={24} md={12}>
                <div style={{ marginBottom: 16 }}>
                  <Text strong>Phone Number</Text>
                  <Input
                    value={invoiceData.phoneNumber}
                    onChange={(e) => setInvoiceData(prev => ({ ...prev, phoneNumber: e.target.value }))}
                    placeholder="Enter phone number"
                  />
                </div>
              </Col>
              
              {/* Services Description */}
              <Col xs={24}>
                <div style={{ marginBottom: 16 }}>
                  <Text strong>Services Description</Text>
                  {isUpdatingPreview && (
                    <Text type="secondary" style={{ marginLeft: 8, fontSize: 12 }}>
                      Updating preview...
                    </Text>
                  )}
                  <Input.TextArea
                    value={invoiceData.services}
                    onChange={(e) => setInvoiceData(prev => ({ ...prev, services: e.target.value }))}
                    rows={3}
                    placeholder="Enter services. For separate line items, use format: LinkedIn Post (3 posts) - ₹4500, WhatsApp Message (2 posts) - ₹3000"
                  />
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    💡 Tip: Use "Service Name (X posts) - ₹Amount" format for individual line items, separated by commas
                  </Text>
                </div>
              </Col>

              {/* FROM (Your Business Info) */}
              <Col xs={24}>
                <Title level={5} style={{ marginTop: 24, marginBottom: 16 }}>Business Information</Title>
              </Col>
              
              <Col xs={24} md={12}>
                <div style={{ marginBottom: 16 }}>
                  <Text strong>From Name</Text>
                  <Input
                    value={invoiceData.fromName}
                    onChange={(e) => setInvoiceData(prev => ({ ...prev, fromName: e.target.value }))}
                    placeholder="Enter your name"
                  />
                </div>
              </Col>
              
              <Col xs={24} md={12}>
                <div style={{ marginBottom: 16 }}>
                  <Text strong>From Email</Text>
                  <Input
                    type="email"
                    value={invoiceData.fromEmail}
                    onChange={(e) => setInvoiceData(prev => ({ ...prev, fromEmail: e.target.value }))}
                    placeholder="Enter your email"
                  />
                </div>
              </Col>
              
              <Col xs={24}>
                <div style={{ marginBottom: 16 }}>
                  <Text strong>From Address</Text>
                  <Input.TextArea
                    value={invoiceData.fromAddress}
                    onChange={(e) => setInvoiceData(prev => ({ ...prev, fromAddress: e.target.value }))}
                    rows={2}
                    placeholder="Enter your address"
                  />
                </div>
              </Col>
              
              <Col xs={24} md={12}>
                <div style={{ marginBottom: 16 }}>
                  <Text strong>From Phone</Text>
                  <Input
                    value={invoiceData.fromPhone}
                    onChange={(e) => setInvoiceData(prev => ({ ...prev, fromPhone: e.target.value }))}
                    placeholder="Enter your phone number"
                  />
                </div>
              </Col>

              {/* Bank Transfer Information */}
              <Col xs={24}>
                <Title level={5} style={{ marginTop: 24, marginBottom: 16 }}>Bank Transfer Information</Title>
              </Col>
              
              <Col xs={24} md={8}>
                <div style={{ marginBottom: 16 }}>
                  <Text strong>Bank Account Name</Text>
                  <Input
                    value={invoiceData.bankAccountName}
                    onChange={(e) => setInvoiceData(prev => ({ ...prev, bankAccountName: e.target.value }))}
                    placeholder="Enter account name"
                  />
                </div>
              </Col>
              
              <Col xs={24} md={8}>
                <div style={{ marginBottom: 16 }}>
                  <Text strong>Bank Account Number</Text>
                  <Input
                    value={invoiceData.bankAccountNumber}
                    onChange={(e) => setInvoiceData(prev => ({ ...prev, bankAccountNumber: e.target.value }))}
                    placeholder="Enter account number"
                  />
                </div>
              </Col>
              
              <Col xs={24} md={8}>
                <div style={{ marginBottom: 16 }}>
                  <Text strong>Bank IFSC</Text>
                  <Input
                    value={invoiceData.bankIFSC}
                    onChange={(e) => setInvoiceData(prev => ({ ...prev, bankIFSC: e.target.value }))}
                    placeholder="Enter IFSC code"
                  />
                </div>
              </Col>

              {/* UPI Payment */}
              <Col xs={24}>
                <Title level={5} style={{ marginTop: 24, marginBottom: 16 }}>UPI Payment Information</Title>
              </Col>
              
              <Col xs={24} md={12}>
                <div style={{ marginBottom: 16 }}>
                  <Text strong>UPI ID</Text>
                  <Input
                    value={invoiceData.upiId}
                    onChange={(e) => setInvoiceData(prev => ({ ...prev, upiId: e.target.value }))}
                    placeholder="Enter UPI ID"
                  />
                </div>
              </Col>
              
              <Col xs={24} md={12}>
                <div style={{ marginBottom: 16 }}>
                  <Text strong>UPI Phone</Text>
                  <Input
                    value={invoiceData.upiPhone}
                    onChange={(e) => setInvoiceData(prev => ({ ...prev, upiPhone: e.target.value }))}
                    placeholder="Enter UPI phone number"
                  />
                </div>
              </Col>

              {/* Invoice Details */}
              <Col xs={24}>
                <Title level={5} style={{ marginTop: 24, marginBottom: 16 }}>Invoice Details</Title>
              </Col>
              
              <Col xs={24} md={12}>
                <div style={{ marginBottom: 16 }}>
                  <Text strong>Invoice Number</Text>
                  <Input
                    value={invoiceData.invoiceNumber}
                    onChange={(e) => setInvoiceData(prev => ({ ...prev, invoiceNumber: e.target.value }))}
                    placeholder="Auto-generated or custom invoice number"
                  />
                </div>
              </Col>
              
              <Col xs={24} md={12}>
                <div style={{ marginBottom: 16 }}>
                  <Text strong>Invoice Date</Text>
                  <Input
                    type="date"
                    value={invoiceData.invoiceDate}
                    onChange={(e) => setInvoiceData(prev => ({ ...prev, invoiceDate: e.target.value }))}
                    placeholder="Invoice date"
                  />
                </div>
              </Col>
              
              <Col xs={24} md={12}>
                <div style={{ marginBottom: 16 }}>
                  <Text strong>Due Date</Text>
                  <Input
                    type="date"
                    value={invoiceData.dueDate}
                    onChange={(e) => setInvoiceData(prev => ({ ...prev, dueDate: e.target.value }))}
                    placeholder="Enter due date"
                  />
                </div>
              </Col>
              
              <Col xs={24} md={12}>
                <div style={{ marginBottom: 16 }}>
                  <Text strong>Contact Email</Text>
                  <Input
                    type="email"
                    value={invoiceData.contactEmail}
                    onChange={(e) => setInvoiceData(prev => ({ ...prev, contactEmail: e.target.value }))}
                    placeholder="Enter contact email"
                  />
                </div>
              </Col>

              {/* Business Branding */}
              <Col xs={24}>
                <Title level={5} style={{ marginTop: 24, marginBottom: 16 }}>Business Branding</Title>
              </Col>
              
              <Col xs={24} md={12}>
                <div style={{ marginBottom: 16 }}>
                  <Text strong>Business Title</Text>
                  <Input
                    value={invoiceData.businessTitle}
                    onChange={(e) => setInvoiceData(prev => ({ ...prev, businessTitle: e.target.value }))}
                    placeholder="Your business name/title"
                  />
                </div>
              </Col>
              
              <Col xs={24} md={12}>
                <div style={{ marginBottom: 16 }}>
                  <Text strong>Business Subtitle</Text>
                  <Input
                    value={invoiceData.businessSubtitle}
                    onChange={(e) => setInvoiceData(prev => ({ ...prev, businessSubtitle: e.target.value }))}
                    placeholder="Business tagline or subtitle"
                  />
                </div>
              </Col>

              {/* Payment & Financial Details */}
              <Col xs={24}>
                <Title level={5} style={{ marginTop: 24, marginBottom: 16 }}>Payment & Financial Details</Title>
              </Col>
              
              <Col xs={24} md={8}>
                <div style={{ marginBottom: 16 }}>
                  <Text strong>Currency Symbol</Text>
                  <Input
                    value={invoiceData.currencySymbol}
                    onChange={(e) => setInvoiceData(prev => ({ ...prev, currencySymbol: e.target.value }))}
                    placeholder="₹"
                  />
                </div>
              </Col>
              
              <Col xs={24} md={8}>
                <div style={{ marginBottom: 16 }}>
                  <Text strong>Tax Rate (%)</Text>
                  <Input
                    type="number"
                    value={invoiceData.taxRate}
                    onChange={(e) => setInvoiceData(prev => ({ ...prev, taxRate: e.target.value }))}
                    placeholder="0"
                  />
                </div>
              </Col>
              
              <Col xs={24} md={8}>
                <div style={{ marginBottom: 16 }}>
                  <Text strong>Discount Amount</Text>
                  <Input
                    type="number"
                    value={invoiceData.discountAmount}
                    onChange={(e) => setInvoiceData(prev => ({ ...prev, discountAmount: e.target.value }))}
                    placeholder="0"
                  />
                </div>
              </Col>
              
              <Col xs={24}>
                <div style={{ marginBottom: 16 }}>
                  <Text strong>Discount Reason</Text>
                  <Input
                    value={invoiceData.discountReason}
                    onChange={(e) => setInvoiceData(prev => ({ ...prev, discountReason: e.target.value }))}
                    placeholder="Reason for discount"
                  />
                </div>
              </Col>

              {/* Messages & Content */}
              <Col xs={24}>
                <Title level={5} style={{ marginTop: 24, marginBottom: 16 }}>Messages & Content</Title>
              </Col>
              
              <Col xs={24}>
                <div style={{ marginBottom: 16 }}>
                  <Text strong>Thank You Message</Text>
                  <Input.TextArea
                    value={invoiceData.thankYouMessage}
                    onChange={(e) => setInvoiceData(prev => ({ ...prev, thankYouMessage: e.target.value }))}
                    rows={2}
                    placeholder="Thank you for your business!"
                  />
                </div>
              </Col>
              
              <Col xs={24}>
                <div style={{ marginBottom: 16 }}>
                  <Text strong>Payment Instructions</Text>
                  <Input.TextArea
                    value={invoiceData.paymentInstructions}
                    onChange={(e) => setInvoiceData(prev => ({ ...prev, paymentInstructions: e.target.value }))}
                    rows={3}
                    placeholder="Additional payment instructions"
                  />
                </div>
              </Col>
              
              <Col xs={24}>
                <div style={{ marginBottom: 16 }}>
                  <Text strong>Terms & Conditions</Text>
                  <Input.TextArea
                    value={invoiceData.termsAndConditions}
                    onChange={(e) => setInvoiceData(prev => ({ ...prev, termsAndConditions: e.target.value }))}
                    rows={3}
                    placeholder="Terms and conditions"
                  />
                </div>
              </Col>
              
              <Col xs={24}>
                <div style={{ marginBottom: 16 }}>
                  <Text strong>Notes</Text>
                  <Input.TextArea
                    value={invoiceData.notes}
                    onChange={(e) => setInvoiceData(prev => ({ ...prev, notes: e.target.value }))}
                    rows={2}
                    placeholder="Additional notes"
                  />
                </div>
              </Col>
              
              <Col xs={24}>
                <div style={{ marginBottom: 16 }}>
                  <Text strong>Footer Text</Text>
                  <Input.TextArea
                    value={invoiceData.footerText}
                    onChange={(e) => setInvoiceData(prev => ({ ...prev, footerText: e.target.value }))}
                    rows={2}
                    placeholder="Footer text"
                  />
                </div>
              </Col>

              {/* Custom Fields */}
              <Col xs={24}>
                <Title level={5} style={{ marginTop: 24, marginBottom: 16 }}>Custom Fields</Title>
              </Col>
              
              {[1, 2, 3, 4, 5].map((num) => (
                <Col xs={24} md={12} key={num}>
                  <div style={{ marginBottom: 16 }}>
                    <Text strong>Custom Field {num}</Text>
                    <Input
                      value={invoiceData[`customField${num}` as keyof InvoiceData] as string}
                      onChange={(e) => setInvoiceData(prev => ({ ...prev, [`customField${num}`]: e.target.value }))}
                      placeholder={`Custom field ${num}`}
                    />
                  </div>
                </Col>
              ))}

              {/* Media URLs */}
              <Col xs={24}>
                <Title level={5} style={{ marginTop: 24, marginBottom: 16 }}>Media</Title>
              </Col>
              
              <Col xs={24} md={12}>
                <div style={{ marginBottom: 16 }}>
                  <Text strong>Logo URL</Text>
                  <Input
                    type="url"
                    value={invoiceData.logoUrl}
                    onChange={(e) => setInvoiceData(prev => ({ ...prev, logoUrl: e.target.value }))}
                    placeholder="https://example.com/logo.png"
                  />
                </div>
              </Col>
              
              <Col xs={24} md={12}>
                <div style={{ marginBottom: 16 }}>
                  <Text strong>Signature URL</Text>
                  <Input
                    type="url"
                    value={invoiceData.signatureUrl}
                    onChange={(e) => setInvoiceData(prev => ({ ...prev, signatureUrl: e.target.value }))}
                    placeholder="https://example.com/signature.png"
                  />
                </div>
              </Col>
            </Row>

            {/* Invoice Preview */}
            {(invoiceData.personName || invoiceData.companyName) && (
              <div style={{ marginTop: 24, padding: 16, backgroundColor: '#f5f5f5', borderRadius: 8 }}>
                <Title level={5}>Invoice Preview</Title>
                <div 
                  ref={invoiceRef}
                  style={{ 
                    backgroundColor: 'white', 
                    padding: 32, 
                    border: '1px solid #d9d9d9', 
                    borderRadius: 8,
                    fontFamily: 'system-ui, -apple-system, sans-serif'
                  }}
                >
                  {/* Header */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 32 }}>
                    <div style={{ fontSize: 48, fontWeight: 'bold', color: 'black' }}>
                      {invoiceData.logoUrl ? (
                        <img src={invoiceData.logoUrl} alt="Logo" style={{ height: 48, width: 'auto' }} />
                      ) : (
                        "&"
                      )}
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <h1 style={{ fontSize: 32, fontWeight: 300, color: 'black', letterSpacing: 2, marginBottom: 16 }}>
                        {invoiceData.businessTitle || "INVOICE"}
                      </h1>
                      {invoiceData.businessSubtitle && (
                        <p style={{ fontSize: 14, color: '#666', marginBottom: 8 }}>{invoiceData.businessSubtitle}</p>
                      )}
                      <div style={{ fontSize: 14, color: '#555' }}>
                        <p style={{ marginBottom: 4 }}>Invoice No. {invoiceData.invoiceNumber || generateInvoiceNumber(selectedPayment.client)}</p>
                        <p>{invoiceData.invoiceDate ? new Date(invoiceData.invoiceDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                      </div>
                    </div>
                  </div>

                  {/* From and To sections */}
                  <Row gutter={24} style={{ marginBottom: 32 }}>
                    {/* From */}
                    <Col span={12}>
                      <h3 style={{ fontSize: 14, fontWeight: 600, color: 'black', marginBottom: 8, letterSpacing: 1 }}>FROM:</h3>
                      <div style={{ fontSize: 14, color: '#555', lineHeight: 1.6 }}>
                        <p style={{ fontWeight: 500, color: 'black' }}>{invoiceData.fromName}</p>
                        {invoiceData.fromAddress.split('\n').map((line, idx) => <p key={idx} style={{ margin: 0 }}>{line}</p>)}
                        <p style={{ margin: 0 }}>{invoiceData.fromPhone}</p>
                        <p style={{ margin: 0 }}>{invoiceData.fromEmail}</p>
                      </div>
                    </Col>

                    {/* Billed To */}
                    <Col span={12}>
                      <h3 style={{ fontSize: 14, fontWeight: 600, color: 'black', marginBottom: 8, letterSpacing: 1 }}>BILLED TO:</h3>
                      <div style={{ fontSize: 14, color: '#555', lineHeight: 1.6 }}>
                        {invoiceData.personName && <p style={{ fontWeight: 500, color: 'black', margin: 0 }}>{invoiceData.personName}</p>}
                        {invoiceData.companyName && <p style={{ fontWeight: 500, color: 'black', margin: 0 }}>{invoiceData.companyName}</p>}
                        {invoiceData.companyAddress && <p style={{ margin: 0 }}>{invoiceData.companyAddress}</p>}
                        {invoiceData.gst && <p style={{ margin: 0 }}>GST: {invoiceData.gst}</p>}
                        {invoiceData.phoneNumber && <p style={{ margin: 0 }}>Phone: {invoiceData.phoneNumber}</p>}
                      </div>
                    </Col>
                  </Row>

                  {/* Invoice Table */}
                  <div style={{ marginBottom: 24 }}>
                    <table style={{ width: '100%' }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid #ccc' }}>
                          <th style={{ textAlign: 'left', padding: '8px 0', fontSize: 14, fontWeight: 500, color: '#555', letterSpacing: 1 }}>Item</th>
                          <th style={{ textAlign: 'right', padding: '8px 0', fontSize: 14, fontWeight: 500, color: '#555', letterSpacing: 1 }}>Amount</th>
                        </tr>
                      </thead>
                      <tbody>
                        {invoiceServices.map((service, index) => (
                          <tr key={index} style={{ borderBottom: '1px solid #eee' }}>
                            <td style={{ padding: '12px 0', fontSize: 14, color: '#555' }}>{service.name}</td>
                            <td style={{ padding: '12px 0', textAlign: 'right', fontSize: 14, fontWeight: 500, color: '#555' }}>{formatCurrency(service.amount)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Total */}
                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 24 }}>
                    <div style={{ width: 256 }}>
                      {invoiceData.discountAmount && Number(invoiceData.discountAmount) > 0 && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: 14, color: '#666' }}>
                          <span>Subtotal</span>
                          <span>{formatCurrency(invoiceServices.reduce((sum, service) => sum + service.amount, 0))}</span>
                        </div>
                      )}
                      {invoiceData.discountAmount && Number(invoiceData.discountAmount) > 0 && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: 14, color: '#666' }}>
                          <span>Discount ({invoiceData.discountReason || 'Discount'})</span>
                          <span>-{formatCurrency(Number(invoiceData.discountAmount))}</span>
                        </div>
                      )}
                      {invoiceData.taxRate && Number(invoiceData.taxRate) > 0 && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: 14, color: '#666' }}>
                          <span>Tax ({invoiceData.taxRate}%)</span>
                          <span>{formatCurrency((invoiceServices.reduce((sum, service) => sum + service.amount, 0) - Number(invoiceData.discountAmount || 0)) * Number(invoiceData.taxRate) / 100)}</span>
                        </div>
                      )}
                      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', fontSize: 18, fontWeight: 'bold', borderTop: '1px solid #ccc' }}>
                        <span style={{ color: 'black' }}>Total</span>
                        <span style={{ color: 'black' }}>
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
                  <div style={{ marginBottom: 32 }}>
                    <h2 style={{ fontSize: 20, fontWeight: 300, color: '#555' }}>
                      {invoiceData.thankYouMessage || "Thank you!"}
                    </h2>
                    {invoiceData.notes && (
                      <p style={{ fontSize: 14, color: '#666', marginTop: 8 }}>{invoiceData.notes}</p>
                    )}
                  </div>

                  {/* Payment Information */}
                  <Row gutter={24}>
                    <Col span={12}>
                      <h3 style={{ fontSize: 14, fontWeight: 600, color: 'black', marginBottom: 8, letterSpacing: 1 }}>PAYMENT INFORMATION</h3>
                      <div style={{ fontSize: 14, color: '#555', lineHeight: 1.6, marginBottom: 12 }}>
                        <p style={{ margin: 0 }}>Due Date: {invoiceData.dueDate || selectedPayment.dueDate}</p>
                        <p style={{ margin: 0 }}>Contact: {invoiceData.contactEmail}</p>
                        {invoiceData.paymentInstructions && (
                          <p style={{ marginTop: 8, fontStyle: 'italic', margin: 0 }}>{invoiceData.paymentInstructions}</p>
                        )}
                      </div>
                      
                      <div style={{ marginBottom: 12 }}>
                        <h4 style={{ fontSize: 14, fontWeight: 600, color: 'black', marginBottom: 4 }}>Bank Transfer:</h4>
                        <div style={{ fontSize: 14, color: '#555', lineHeight: 1.6 }}>
                          <p style={{ margin: 0 }}>Account Name: {invoiceData.bankAccountName}</p>
                          <p style={{ margin: 0 }}>Account Number: {invoiceData.bankAccountNumber}</p>
                          <p style={{ margin: 0 }}>IFSC Code: {invoiceData.bankIFSC}</p>
                        </div>
                      </div>

                      <div style={{ marginBottom: 12 }}>
                        <h4 style={{ fontSize: 14, fontWeight: 600, color: 'black', marginBottom: 4 }}>UPI Payment:</h4>
                        <div style={{ fontSize: 14, color: '#555', lineHeight: 1.6 }}>
                          <p style={{ margin: 0 }}>UPI ID: {invoiceData.upiId}</p>
                          <p style={{ margin: 0 }}>Phone: {invoiceData.upiPhone}</p>
                        </div>
                      </div>
                    </Col>
                    <Col span={12} style={{ textAlign: 'right' }}>
                      <h3 style={{ fontSize: 18, fontWeight: 300, color: 'black', marginBottom: 4 }}>{invoiceData.fromName}</h3>
                      <p style={{ fontSize: 14, color: '#555', marginBottom: 16 }}>Social Media Services</p>
                      {invoiceData.signatureUrl && (
                        <img src={invoiceData.signatureUrl} alt="Signature" style={{ height: 48, width: 'auto', marginTop: 8 }} />
                      )}
                    </Col>
                  </Row>

                  {/* Terms and Conditions */}
                  {invoiceData.termsAndConditions && (
                    <div style={{ marginTop: 24, paddingTop: 16, borderTop: '1px solid #ddd' }}>
                      <h4 style={{ fontSize: 14, fontWeight: 600, color: 'black', marginBottom: 8 }}>Terms & Conditions</h4>
                      <p style={{ fontSize: 12, color: '#666', lineHeight: 1.6 }}>{invoiceData.termsAndConditions}</p>
                    </div>
                  )}

                  {/* Footer */}
                  {invoiceData.footerText && (
                    <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid #ddd' }}>
                      <p style={{ fontSize: 12, color: '#999', textAlign: 'center' }}>{invoiceData.footerText}</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </Modal>
      )}
    </>
  )
}