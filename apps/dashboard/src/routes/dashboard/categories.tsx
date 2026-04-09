import { createFileRoute } from "@tanstack/react-router"
import { PageHeader } from "@/components/page-header"
import { CategoriesTable } from "@/components/categories/categories-table"
import { CreateCategoryDialog } from "@/components/categories/create-category-dialog"
import { useCategories } from "@/hooks/use-categories"
import { Skeleton } from "@/components/ui/skeleton"

export const Route = createFileRoute("/dashboard/categories")({
  component: CategoriesPage,
})

function CategoriesPage() {
  const { data: categories, isLoading } = useCategories()

  return (
    <div className="space-y-6">
      <PageHeader
        title="Categories"
        description="Manage product categories for your catalog"
      >
        <CreateCategoryDialog />
      </PageHeader>
      {isLoading ? (
        <Skeleton className="h-64 rounded-xl" />
      ) : (
        <CategoriesTable categories={categories ?? []} />
      )}
    </div>
  )
}
