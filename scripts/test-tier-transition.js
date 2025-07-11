// Test script to demonstrate tier transition functionality
// This script simulates how tier transitions work

const { createClient } = require('@supabase/supabase-js')

// Mock client data for testing
const mockClient = {
  id: 'test-client-001',
  name: 'Test Client',
  email: 'test@example.com',
  created_at: '2024-01-01T00:00:00.000Z', // 6 months ago
  tiered_payments: [
    {
      amount: 0,
      duration_months: 3,
      payment_type: 'monthly',
      services: {
        'LinkedIn': 30000,
        'Twitter': 20000
      }
    },
    {
      amount: 0,
      duration_months: 6,
      payment_type: 'monthly',
      services: {
        'LinkedIn': 40000,
        'Twitter': 30000,
        'Instagram': 35000
      }
    }
  ],
  final_services: {
    'LinkedIn': 50000,
    'Twitter': 35000,
    'Instagram': 40000,
    'YouTube': 30000
  }
}

// Function to calculate months passed
function getMonthsPassed(startDate) {
  const start = new Date(startDate)
  const current = new Date()
  return Math.floor((current.getTime() - start.getTime()) / (1000 * 60 * 60 * 24 * 30))
}

// Function to get current tier info
function getCurrentTierInfo(tieredPayments, startDate) {
  const monthsPassed = getMonthsPassed(startDate)
  console.log(`Months passed since client start: ${monthsPassed}`)
  
  let totalMonths = 0
  for (let i = 0; i < tieredPayments.length; i++) {
    const tier = tieredPayments[i]
    totalMonths += tier.duration_months
    console.log(`Tier ${i + 1}: Duration ${tier.duration_months} months, Total duration: ${totalMonths} months`)
    
    if (monthsPassed < totalMonths) {
      const services = tier.services
      const totalAmount = Object.values(services).reduce((sum, price) => sum + price, 0)
      console.log(`✅ Client is in Tier ${i + 1}`)
      console.log(`   Services: ${JSON.stringify(services)}`)
      console.log(`   Total payment: ₹${totalAmount.toLocaleString()}`)
      return {
        tierIndex: i,
        services: services,
        totalAmount: totalAmount,
        isComplete: false
      }
    }
  }
  
  // Client has completed all tiers
  const finalServices = mockClient.final_services
  const totalAmount = Object.values(finalServices).reduce((sum, price) => sum + price, 0)
  console.log(`✅ Client has completed all tiers - using final payment structure`)
  console.log(`   Final services: ${JSON.stringify(finalServices)}`)
  console.log(`   Total payment: ₹${totalAmount.toLocaleString()}`)
  return {
    tierIndex: -1,
    services: finalServices,
    totalAmount: totalAmount,
    isComplete: true
  }
}

// Test the tier transition logic
console.log('=== TIER TRANSITION TEST ===')
console.log(`Client: ${mockClient.name}`)
console.log(`Start date: ${mockClient.created_at}`)
console.log(`Current date: ${new Date().toISOString()}`)
console.log('')

const tierInfo = getCurrentTierInfo(mockClient.tiered_payments, mockClient.created_at)

console.log('')
console.log('=== EXPECTED BEHAVIOR ===')
console.log('Based on the current date, the system should:')
console.log('1. Automatically detect the current tier')
console.log('2. Update the client\'s payment rate accordingly')
console.log('3. Show the correct tier information in the UI')
console.log('4. Calculate invoices using the current tier\'s service prices')
