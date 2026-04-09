import { createFileRoute } from "@tanstack/react-router"
import { PageHeader } from "@/components/page-header"
import { FaqTable } from "@/components/faq/faq-table"
import { CreateFaqDialog } from "@/components/faq/create-faq-dialog"
import { useFaqEntries } from "@/hooks/use-faq"
import { Skeleton } from "@/components/ui/skeleton"

export const Route = createFileRoute("/dashboard/faq")({
  component: FaqPage,
})

function FaqPage() {
  const { data: entries, isLoading } = useFaqEntries()

  return (
    <div className="space-y-6">
      <PageHeader
        title="FAQ"
        description="Manage frequently asked questions for the chatbot"
      >
        <CreateFaqDialog />
      </PageHeader>
      {isLoading ? (
        <Skeleton className="h-64 rounded-xl" />
      ) : (
        <FaqTable entries={entries ?? []} />
      )}
    </div>
  )
}
