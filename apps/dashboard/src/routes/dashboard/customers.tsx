import { createFileRoute } from "@tanstack/react-router"
import { PageHeader } from "@/components/page-header"
import { CustomersTable } from "@/components/customers/customers-table"
import { useCustomers } from "@/hooks/use-customers"
import { Skeleton } from "@/components/ui/skeleton"

export const Route = createFileRoute("/dashboard/customers")({
  component: CustomersPage,
})

function CustomersPage() {
  const { data: customers, isLoading } = useCustomers()

  return (
    <div className="space-y-6">
      <PageHeader
        title="Customers"
        description="All customers from WhatsApp conversations"
      />
      {isLoading ? (
        <Skeleton className="h-64 rounded-xl" />
      ) : (
        <CustomersTable customers={customers ?? []} />
      )}
    </div>
  )
}
