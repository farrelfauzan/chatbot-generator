import { createFileRoute } from "@tanstack/react-router"
import { PageHeader } from "@/components/page-header"
import { OrderItemsTable } from "@/components/orders/order-items-table"
import { useOrder } from "@/hooks/use-orders"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"

export const Route = createFileRoute("/dashboard/orders/$orderId")({
  component: OrderDetailPage,
})

const statusColor: Record<string, string> = {
  draft: "bg-gray-100 text-gray-700",
  confirmed: "bg-blue-100 text-blue-700",
  processing: "bg-yellow-100 text-yellow-700",
  shipped: "bg-purple-100 text-purple-700",
  delivered: "bg-green-100 text-green-700",
  cancelled: "bg-red-100 text-red-700",
}

function OrderDetailPage() {
  const { orderId } = Route.useParams()
  const { data: order, isLoading } = useOrder(orderId)

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-48 rounded-xl" />
        <Skeleton className="h-48 rounded-xl" />
      </div>
    )
  }

  if (!order) {
    return <p className="text-muted-foreground">Order not found</p>
  }

  return (
    <div className="space-y-6">
      <PageHeader title={`Order ${order.orderNumber}`}>
        <Badge
          variant="secondary"
          className={statusColor[order.status] ?? ""}
        >
          {order.status}
        </Badge>
      </PageHeader>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Order Summary</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Subtotal</span>
            <span>Rp {Number(order.subtotal).toLocaleString("id-ID")}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Discount</span>
            <span>-Rp {Number(order.discountAmount).toLocaleString("id-ID")}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Shipping</span>
            <span>Rp {Number(order.shippingAmount).toLocaleString("id-ID")}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Tax</span>
            <span>Rp {Number(order.taxAmount).toLocaleString("id-ID")}</span>
          </div>
          <Separator />
          <div className="flex justify-between font-semibold">
            <span>Total</span>
            <span>Rp {Number(order.totalAmount).toLocaleString("id-ID")}</span>
          </div>
          <div className="flex justify-between pt-2">
            <span className="text-muted-foreground">Date</span>
            <span>{new Date(order.createdAt).toLocaleString("id-ID")}</span>
          </div>
        </CardContent>
      </Card>

      {order.items && order.items.length > 0 && (
        <OrderItemsTable items={order.items} />
      )}
    </div>
  )
}
