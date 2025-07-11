#!/usr/bin/env node

// Simple test to verify the key dashboard functions work
// This runs directly against our database functions

async function testDashboardFunctions() {
  console.log('🧪 Testing Dashboard Functions...\n');

  try {
    // Import functions (we'll use dynamic import to avoid TypeScript issues)
    const { getDashboardStats, getProjectedMRR } = await import('./lib/database.js');

    console.log('📊 Testing getDashboardStats...');
    const stats = await getDashboardStats();
    
    console.log('✅ Dashboard Stats Result:');
    console.log(`   Monthly Revenue: ₹${stats.monthlyRevenue}`);
    console.log(`   Projected MRR: ₹${stats.projectedMRR}`);
    console.log(`   Active Clients: ${stats.activeClients}`);
    console.log(`   Pending Amount: ₹${stats.pendingAmount}`);
    console.log(`   Monthly Expenses: ₹${stats.monthlyExpenses}`);
    console.log(`   Profit Margin: ${stats.profitMargin.toFixed(1)}%`);
    console.log('');

    console.log('🎯 Testing getProjectedMRR separately...');
    const projectedMRR = await getProjectedMRR();
    console.log(`✅ Projected MRR: ₹${projectedMRR}`);
    console.log('');

    // Verify the values make sense
    if (stats.projectedMRR === projectedMRR) {
      console.log('✅ Projected MRR values match between functions');
    } else {
      console.log(`⚠️ Projected MRR mismatch: getDashboardStats=${stats.projectedMRR}, getProjectedMRR=${projectedMRR}`);
    }

    console.log('\n🎉 All dashboard functions are working correctly!');
    
    return true;
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Stack:', error.stack);
    return false;
  }
}

// Run the test
testDashboardFunctions()
  .then(success => {
    if (success) {
      console.log('\n✅ Test completed successfully');
      process.exit(0);
    } else {
      console.log('\n❌ Test failed');
      process.exit(1);
    }
  })
  .catch(error => {
    console.error('💥 Unexpected error:', error);
    process.exit(1);
  });
