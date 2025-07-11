// Test script to verify dashboard stats functionality
// Run this with: node test-dashboard-stats.js

const { getDashboardStats, getProjectedMRR, calculateTotalPaymentRateAsync } = require('./lib/database.ts');

async function testDashboardStats() {
  console.log('🧪 Testing Dashboard Stats Functions...\n');

  try {
    // Test 1: Get Dashboard Stats
    console.log('1️⃣ Testing getDashboardStats...');
    const dashboardStats = await getDashboardStats();
    console.log('✅ Dashboard Stats:', {
      totalRevenue: dashboardStats.totalRevenue,
      totalExpenses: dashboardStats.totalExpenses,
      netResult: dashboardStats.netResult,
      profitMargin: dashboardStats.profitMargin,
      projectedMRR: dashboardStats.projectedMRR,
      pendingPayments: dashboardStats.pendingPayments
    });
    console.log('');

    // Test 2: Get Projected MRR specifically
    console.log('2️⃣ Testing getProjectedMRR...');
    const projectedMRR = await getProjectedMRR();
    console.log('✅ Projected MRR:', projectedMRR);
    console.log('');

    // Test 3: Test a few client payment calculations
    console.log('3️⃣ Testing client payment calculations...');
    const { supabase } = require('./lib/supabase.ts');
    
    const { data: sampleClients } = await supabase
      .from("clients")
      .select("*")
      .eq("status", "active")
      .limit(3);

    if (sampleClients && sampleClients.length > 0) {
      for (const client of sampleClients) {
        const paymentRate = await calculateTotalPaymentRateAsync(client);
        console.log(`✅ Client "${client.name}" (${client.payment_type}): ₹${paymentRate}`);
      }
    } else {
      console.log('⚠️ No active clients found for testing');
    }
    
    console.log('\n🎉 All tests completed successfully!');
    
  } catch (error) {
    console.error('❌ Test failed with error:', error);
  }
}

testDashboardStats();
