export function getNextPaymentDate(currentDate: string | Date): string {
  const date = new Date(currentDate);
  
  // Get current day, month, and year
  const currentDay = date.getDate();
  const currentMonth = date.getMonth(); // 0-based
  const currentYear = date.getFullYear();
  
  // Calculate next month
  let nextMonth = currentMonth + 1;
  let nextYear = currentYear;
  
  // Handle year rollover
  if (nextMonth > 11) {
    nextMonth = 0;
    nextYear++;
  }
  
  // Create a date with the same day in the next month
  // JavaScript will automatically adjust if the day doesn't exist
  let nextPaymentDate = new Date(nextYear, nextMonth, currentDay);
  
  // If the month got adjusted (e.g., Feb 31 -> Mar 3), 
  // set to the last day of the intended month
  if (nextPaymentDate.getMonth() !== nextMonth) {
    // Set to last day of the intended month
    nextPaymentDate = new Date(nextYear, nextMonth + 1, 0);
  }
  
  console.log(`Next payment date: ${currentDate} -> ${nextPaymentDate.toISOString().split('T')[0]}`)
  
  return nextPaymentDate.toISOString().split('T')[0]; // Return YYYY-MM-DD format
}

// Helper function to validate and format date
export function formatPaymentDate(date: string | Date): string {
  if (typeof date === 'string') {
    return date.split('T')[0]; // Ensure YYYY-MM-DD format
  }
  return date.toISOString().split('T')[0];
}

// Test cases for verification (you can remove this in production)
export function testDateCalculations() {
  const testCases = [
    { input: '2024-01-31', expected: '2024-02-29' }, // Jan 31 -> Feb 29 (leap year)
    { input: '2023-01-31', expected: '2023-02-28' }, // Jan 31 -> Feb 28 (non-leap year)
    { input: '2024-02-29', expected: '2024-03-29' }, // Feb 29 -> Mar 29
    { input: '2024-03-31', expected: '2024-04-30' }, // Mar 31 -> Apr 30
    { input: '2024-05-31', expected: '2024-06-30' }, // May 31 -> Jun 30
    { input: '2024-12-15', expected: '2025-01-15' }, // Year rollover
    { input: '2024-02-15', expected: '2024-03-15' }, // Normal case
  ];
  
  console.log('Date calculation tests:');
  testCases.forEach(({ input, expected }) => {
    const result = getNextPaymentDate(input);
    const passed = result === expected;
    console.log(`${input} -> ${result} (expected: ${expected}) ${passed ? '✅' : '❌'}`);
  });
}

export function getNextPaymentDateWithFixedDay(fixedDay: number): string {
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();
  const currentDay = now.getDate();
  
  // Start with next month
  let targetMonth = currentMonth + 1;
  let targetYear = currentYear;
  
  // Handle year rollover
  if (targetMonth > 11) {
    targetMonth = 0;
    targetYear++;
  }
  
  // Create date with fixed day in next month
  let nextPaymentDate = new Date(targetYear, targetMonth, fixedDay);
  
  // If the day doesn't exist in that month (e.g., Feb 31), 
  // set to last day of the month
  if (nextPaymentDate.getMonth() !== targetMonth) {
    nextPaymentDate = new Date(targetYear, targetMonth + 1, 0);
  }
  
  console.log(`Next payment date with fixed day ${fixedDay}: ${nextPaymentDate.toISOString().split('T')[0]}`)
  
  return nextPaymentDate.toISOString().split('T')[0]; // Return YYYY-MM-DD format
}

