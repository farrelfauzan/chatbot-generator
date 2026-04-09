import { useApiQuery, useApiMutation } from "./use-api";
import { categoryApi, type Category } from "@/lib/api";

export function useCategories() {
  return useApiQuery<Category[]>(["categories"], () => categoryApi.getAll());
}

export function useCreateCategory() {
  return useApiMutation((data: Partial<Category>) => categoryApi.create(data), {
    invalidateQueries: ["categories"],
  });
}

export function useUpdateCategory() {
  return useApiMutation(
    ({ id, data }: { id: string; data: Partial<Category> }) =>
      categoryApi.update(id, data),
    { invalidateQueries: ["categories"] },
  );
}

export function useDeleteCategory() {
  return useApiMutation((id: string) => categoryApi.delete(id), {
    invalidateQueries: ["categories"],
  });
}
