import { Link } from "@tanstack/react-router"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import type { Order } from "@/lib/api"

interface OrdersTableProps {
  orders: Order[]
}

const statusColor: Record<string, string> = {
  draft: "bg-gray-100 text-gray-700",
  confirmed: "bg-blue-100 text-blue-700",
  processing: "bg-yellow-100 text-yellow-700",
  shipped: "bg-purple-100 text-purple-700",
  delivered: "bg-green-100 text-green-700",
  cancelled: "bg-red-100 text-red-700",
}

export function OrdersTable({ orders }: OrdersTableProps) {
  return (
    <div className="rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Order #</TableHead>
            <TableHead>Customer</TableHead>
            <TableHead className="text-right">Total</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Date</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {orders.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} className="text-center text-(--muted-foreground)">
                No orders found
              </TableCell>
            </TableRow>
          ) : (
            orders.map((order) => (
              <TableRow key={order.id}>
                <TableCell>
                  <Link
                    to="/dashboard/orders/$orderId"
                    params={{ orderId: order.id }}
                    className="font-medium text-(--primary) hover:underline"
                  >
                    {order.orderNumber}
                  </Link>
                </TableCell>
                <TableCell>
                  {order.customer?.name ?? order.customer?.phoneNumber ?? order.customerId}
                </TableCell>
                <TableCell className="text-right font-medium">
                  Rp {Number(order.totalAmount).toLocaleString("id-ID")}
                </TableCell>
                <TableCell>
                  <Badge
                    variant="secondary"
                    className={statusColor[order.status] ?? ""}
                  >
                    {order.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-(--muted-foreground)">
                  {new Date(order.createdAt).toLocaleDateString("id-ID")}
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  )
}
