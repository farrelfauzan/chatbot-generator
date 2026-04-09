import { createFileRoute } from "@tanstack/react-router"
import { PageHeader } from "@/components/page-header"
import { OrdersTable } from "@/components/orders/orders-table"
import { useOrders } from "@/hooks/use-orders"
import { Skeleton } from "@/components/ui/skeleton"

export const Route = createFileRoute("/dashboard/orders/")({
  component: OrdersPage,
})

function OrdersPage() {
  const { data: orders, isLoading } = useOrders()

  return (
    <div className="space-y-6">
      <PageHeader
        title="Orders"
        description="Track and manage customer orders"
      />
      {isLoading ? (
        <Skeleton className="h-64 rounded-xl" />
      ) : (
        <OrdersTable orders={orders ?? []} />
      )}
    </div>
  )
}
