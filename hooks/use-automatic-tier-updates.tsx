"use client"

import { useEffect, useRef } from "react"
import { ensureAutomaticTierUpdates } from "@/lib/database"

// Custom hook to handle automatic tier updates
export function useAutomaticTierUpdates(enableInterval: boolean = true) {
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  
  useEffect(() => {
    // Run initial tier updates
    const runInitialUpdates = async () => {
      try {
        await ensureAutomaticTierUpdates()
      } catch (error) {
        console.error('Error in initial tier updates:', error)
      }
    }
    
    runInitialUpdates()
    
    // Set up interval if enabled
    if (enableInterval) {
      intervalRef.current = setInterval(async () => {
        try {
          await ensureAutomaticTierUpdates()
        } catch (error) {
          console.error('Error in automatic tier updates:', error)
        }
      }, 5 * 60 * 1000) // 5 minutes
    }
    
    // Cleanup interval on unmount
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [enableInterval])
  
  return null
}

// Higher-order component to wrap components that need automatic tier updates
export function withAutomaticTierUpdates<T extends {}>(
  Component: React.ComponentType<T>,
  enableInterval: boolean = true
) {
  return function WrappedComponent(props: T) {
    useAutomaticTierUpdates(enableInterval)
    return <Component {...props} />
  }
}
