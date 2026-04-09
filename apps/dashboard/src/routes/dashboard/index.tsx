import { createFileRoute } from "@tanstack/react-router"
import { Users, MessageSquare, Package, ShoppingCart } from "lucide-react"
import { PageHeader } from "@/components/page-header"
import { StatCard } from "@/components/dashboard/stat-card"
import { RecentOrdersList } from "@/components/dashboard/recent-orders-list"
import { RecentConversationsList } from "@/components/dashboard/recent-conversations-list"
import { useCustomers } from "@/hooks/use-customers"
import { useConversations } from "@/hooks/use-conversations"
import { useProducts } from "@/hooks/use-products"
import { useOrders } from "@/hooks/use-orders"
import { Skeleton } from "@/components/ui/skeleton"

export const Route = createFileRoute("/dashboard/")({
  component: DashboardOverviewPage,
})

function DashboardOverviewPage() {
  const { data: customers, isLoading: loadingCustomers } = useCustomers()
  const { data: conversations, isLoading: loadingConversations } = useConversations()
  const { data: products, isLoading: loadingProducts } = useProducts()
  const { data: orders, isLoading: loadingOrders } = useOrders()

  const isLoading =
    loadingCustomers || loadingConversations || loadingProducts || loadingOrders

  return (
    <div className="space-y-6">
      <PageHeader
        title="Overview"
        description="Your chatbot performance at a glance"
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))
        ) : (
          <>
            <StatCard
              title="Customers"
              value={customers?.length ?? 0}
              icon={Users}
              description="Total registered customers"
            />
            <StatCard
              title="Conversations"
              value={conversations?.length ?? 0}
              icon={MessageSquare}
              description="All conversations"
            />
            <StatCard
              title="Products"
              value={products?.length ?? 0}
              icon={Package}
              description="Products in catalog"
            />
            <StatCard
              title="Orders"
              value={orders?.length ?? 0}
              icon={ShoppingCart}
              description="Total orders"
            />
          </>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {isLoading ? (
          <>
            <Skeleton className="h-64 rounded-xl" />
            <Skeleton className="h-64 rounded-xl" />
          </>
        ) : (
          <>
            <RecentConversationsList conversations={conversations ?? []} />
            <RecentOrdersList orders={orders ?? []} />
          </>
        )}
      </div>
    </div>
  )
}
