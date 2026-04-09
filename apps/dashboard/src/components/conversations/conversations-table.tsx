import { Link } from "@tanstack/react-router"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import type { Conversation } from "@/lib/api"

interface ConversationsTableProps {
  conversations: Conversation[]
}

const statusColor: Record<string, string> = {
  active: "bg-green-100 text-green-700",
  closed: "bg-gray-100 text-gray-700",
  archived: "bg-yellow-100 text-yellow-700",
}

export function ConversationsTable({ conversations }: ConversationsTableProps) {
  return (
    <div className="rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Customer</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Stage</TableHead>
            <TableHead>Last Updated</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {conversations.length === 0 ? (
            <TableRow>
              <TableCell colSpan={4} className="text-center text-muted-foreground">
                No conversations found
              </TableCell>
            </TableRow>
          ) : (
            conversations.map((conv) => (
              <TableRow key={conv.id}>
                <TableCell>
                  <Link
                    to="/dashboard/conversations/$conversationId"
                    params={{ conversationId: conv.id }}
                    className="font-medium text-primary hover:underline"
                  >
                    {conv.customer?.name ?? conv.customer?.phoneNumber ?? conv.customerId}
                  </Link>
                </TableCell>
                <TableCell>
                  <Badge
                    variant="secondary"
                    className={statusColor[conv.status] ?? ""}
                  >
                    {conv.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {conv.stage}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {new Date(conv.updatedAt).toLocaleString("id-ID")}
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  )
}
