import { Link } from "@tanstack/react-router"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { Conversation } from "@/lib/api"

interface RecentConversationsListProps {
  conversations: Conversation[]
}

export function RecentConversationsList({
  conversations,
}: RecentConversationsListProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base">Recent Conversations</CardTitle>
        <Link
          to="/dashboard/conversations"
          className="text-sm font-medium text-primary hover:underline"
        >
          View all
        </Link>
      </CardHeader>
      <CardContent>
        {conversations.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No conversations yet
          </p>
        ) : (
          <div className="space-y-3">
            {conversations.slice(0, 5).map((conv) => (
              <Link
                key={conv.id}
                to="/dashboard/conversations/$conversationId"
                params={{ conversationId: conv.id }}
                className="flex items-center justify-between rounded-lg border p-3 transition-colors hover:bg-muted"
              >
                <div>
                  <p className="text-sm font-medium">
                    {conv.customer?.name ?? conv.customer?.phoneNumber ?? conv.customerId}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Stage: {conv.stage}
                  </p>
                </div>
                <p className="text-xs text-muted-foreground">
                  {new Date(conv.updatedAt).toLocaleDateString("id-ID")}
                </p>
              </Link>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
