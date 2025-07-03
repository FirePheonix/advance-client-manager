import { Suspense } from "react"
import { DashboardStats } from "@/components/dashboard-stats"
import { RecentActivity } from "@/components/recent-activity"
import { UpcomingPayments } from "@/components/upcoming-payments"
import { UpcomingTeamPayments } from "@/components/upcoming-team-payments" // Add this import

export default function HomePage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white">Dashboard</h1>
        <p className="text-gray-400 mt-2">Welcome back! Here's what's happening with your agency.</p>
      </div>

      <Suspense fallback={<div className="text-white">Loading stats...</div>}>
        <DashboardStats />
      </Suspense>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Suspense fallback={<div className="text-white">Loading activity...</div>}>
          <RecentActivity />
        </Suspense>

        <div className="space-y-6"> {/* Add this container div */}
          <Suspense fallback={<div className="text-white">Loading payments...</div>}>
            <UpcomingPayments />
          </Suspense>
          
          <Suspense fallback={<div className="text-white">Loading team payments...</div>}>
            <UpcomingTeamPayments />
          </Suspense>
        </div>
      </div>
    </div>
  )
}
