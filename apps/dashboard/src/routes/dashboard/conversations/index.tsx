import { createFileRoute } from "@tanstack/react-router"
import { PageHeader } from "@/components/page-header"
import { ConversationsTable } from "@/components/conversations/conversations-table"
import { useConversations } from "@/hooks/use-conversations"
import { Skeleton } from "@/components/ui/skeleton"

export const Route = createFileRoute("/dashboard/conversations/")({
  component: ConversationsPage,
})

function ConversationsPage() {
  const { data: conversations, isLoading } = useConversations()

  return (
    <div className="space-y-6">
      <PageHeader
        title="Conversations"
        description="View all WhatsApp conversations"
      />
      {isLoading ? (
        <Skeleton className="h-64 rounded-xl" />
      ) : (
        <ConversationsTable conversations={conversations ?? []} />
      )}
    </div>
  )
}
