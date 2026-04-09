import { createFileRoute } from "@tanstack/react-router"
import { PageHeader } from "@/components/page-header"
import { ProductsTable } from "@/components/products/products-table"
import { CreateProductDialog } from "@/components/products/create-product-dialog"
import { useProducts } from "@/hooks/use-products"
import { Skeleton } from "@/components/ui/skeleton"

export const Route = createFileRoute("/dashboard/products")({
  component: ProductsPage,
})

function ProductsPage() {
  const { data: products, isLoading } = useProducts()

  return (
    <div className="space-y-6">
      <PageHeader
        title="Products"
        description="Manage your product catalog"
      >
        <CreateProductDialog />
      </PageHeader>
      {isLoading ? (
        <Skeleton className="h-64 rounded-xl" />
      ) : (
        <ProductsTable products={products ?? []} />
      )}
    </div>
  )
}
