import { createFileRoute, Outlet, redirect } from "@tanstack/react-router"
import { DashboardSidebar } from "@/components/dashboard-sidebar"
import { isAuthenticated } from "@/lib/auth"

export const Route = createFileRoute("/dashboard")({
  beforeLoad: () => {
    if (typeof window !== "undefined" && !isAuthenticated()) {
      throw redirect({ to: "/login" })
    }
  },
  component: DashboardLayout,
})

function DashboardLayout() {
  return (
    <div className="flex h-screen">
      <DashboardSidebar />
      <main className="flex-1 overflow-y-auto bg-background">
        <div className="mx-auto max-w-6xl px-6 py-6">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
