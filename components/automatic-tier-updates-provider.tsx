"use client"

import { useAutomaticTierUpdates } from "@/hooks/use-automatic-tier-updates"

export function AutomaticTierUpdatesProvider({ children }: { children: React.ReactNode }) {
  // This will run automatic tier updates in the background
  useAutomaticTierUpdates(true)
  
  return <>{children}</>
}
