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
  
  // Get the number of days in the next month
  const daysInNextMonth = new Date(nextYear, nextMonth + 1, 0).getDate();
  
  let nextDay = currentDay;
  
  // Handle edge cases:
  
  // 1. If current day is 31st and next month has fewer days
  if (currentDay === 31) {
    if (daysInNextMonth < 31) {
      nextDay = daysInNextMonth; // Use last day of next month
    }
  }
  
  // 2. If current day is 30th and next month is February
  else if (currentDay === 30 && nextMonth === 1) { // February
    nextDay = daysInNextMonth; // 28 or 29
  }
  
  // 3. If current day is 29th and next month is February (non-leap year)
  else if (currentDay === 29 && nextMonth === 1 && daysInNextMonth === 28) {
    nextDay = 28;
  }
  
  // 4. General case: if current day doesn't exist in next month
  else if (currentDay > daysInNextMonth) {
    nextDay = daysInNextMonth;
  }
  
  const nextPaymentDate = new Date(nextYear, nextMonth, nextDay);
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

