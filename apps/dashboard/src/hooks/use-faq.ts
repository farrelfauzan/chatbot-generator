import { useApiQuery, useApiMutation } from "./use-api";
import { faqApi, type FaqEntry } from "@/lib/api";

export function useFaqEntries(params?: {
  category?: string;
  isActive?: boolean;
}) {
  return useApiQuery<FaqEntry[]>(["faq", params], () => faqApi.getAll(params));
}

export function useFaqEntry(id: string) {
  return useApiQuery<FaqEntry>(["faq", id], () => faqApi.getById(id), {
    enabled: !!id,
  });
}

export function useCreateFaq() {
  return useApiMutation((data: Partial<FaqEntry>) => faqApi.create(data), {
    invalidateQueries: ["faq"],
  });
}

export function useUpdateFaq() {
  return useApiMutation(
    ({ id, data }: { id: string; data: Partial<FaqEntry> }) =>
      faqApi.update(id, data),
    { invalidateQueries: ["faq"] },
  );
}

export function useDeleteFaq() {
  return useApiMutation((id: string) => faqApi.delete(id), {
    invalidateQueries: ["faq"],
  });
}
