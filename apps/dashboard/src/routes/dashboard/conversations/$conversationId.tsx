import { createFileRoute } from "@tanstack/react-router"
import { PageHeader } from "@/components/page-header"
import { MessageBubble } from "@/components/conversations/message-bubble"
import { useConversation } from "@/hooks/use-conversations"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"

export const Route = createFileRoute("/dashboard/conversations/$conversationId")({
  component: ConversationDetailPage,
})

function ConversationDetailPage() {
  const { conversationId } = Route.useParams()
  const { data: conversation, isLoading } = useConversation(conversationId)

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-96 rounded-xl" />
      </div>
    )
  }

  if (!conversation) {
    return <p className="text-(--muted-foreground)">Conversation not found</p>
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={
          conversation.customer?.name ??
          conversation.customer?.phoneNumber ??
          "Conversation"
        }
        description={`Stage: ${conversation.stage}`}
      >
        <Badge variant="secondary">{conversation.status}</Badge>
      </PageHeader>

      <div className="rounded-xl border bg-(--card) p-4">
        <div className="space-y-3">
          {conversation.messages && conversation.messages.length > 0 ? (
            conversation.messages.map((msg) => (
              <MessageBubble key={msg.id} message={msg} />
            ))
          ) : (
            <p className="text-center text-sm text-(--muted-foreground)">
              No messages in this conversation
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
