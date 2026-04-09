import { useApiQuery, useApiMutation } from "./use-api"
import { productApi, type Product } from "@/lib/api"

export function useProducts(params?: {
  category?: string
  search?: string
  isActive?: boolean
}) {
  return useApiQuery<Product[]>(
    ["products", params],
    () => productApi.getAll(params),
  )
}

export function useProduct(id: string) {
  return useApiQuery<Product>(
    ["products", id],
    () => productApi.getById(id),
    { enabled: !!id },
  )
}

export function useCreateProduct() {
  return useApiMutation(
    (data: Partial<Product>) => productApi.create(data),
    { invalidateQueries: ["products"] },
  )
}

export function useUpdateProduct() {
  return useApiMutation(
    ({ id, data }: { id: string; data: Partial<Product> }) =>
      productApi.update(id, data),
    { invalidateQueries: ["products"] },
  )
}
