"use client";

// This script suppresses the fdprocessedid hydration mismatch warnings
// that come from browser extensions like form fillers

const originalConsoleError = console.error;

console.error = function (...args) {
  // Check if this is a hydration mismatch warning about fdprocessedid
  const errorString = args[0]?.toString() || '';
  
  if (
    typeof errorString === 'string' &&
    (errorString.includes('Hydration failed') || 
     errorString.includes('Warning: Text content did not match')) &&
    args.some(arg => 
      typeof arg === 'string' && 
      arg.includes('fdprocessedid')
    )
  ) {
    // Suppress these specific warnings
    return;
  }
  
  // Otherwise, pass through to the original console.error
  originalConsoleError.apply(console, args);
};

export default function ErrorSuppressor() {
  return null; // This component doesn't render anything
}
