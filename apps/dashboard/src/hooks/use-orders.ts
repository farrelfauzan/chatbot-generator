import { useApiQuery, useApiMutation } from "./use-api";
import { orderApi, type Order } from "@/lib/api";

export function useOrders(params?: { status?: string; customerId?: string }) {
  return useApiQuery<Order[]>(["orders", params], () =>
    orderApi.getAll(params),
  );
}

export function useOrder(id: string) {
  return useApiQuery<Order>(["orders", id], () => orderApi.getById(id), {
    enabled: !!id,
  });
}

export function useUpdateOrderStatus() {
  return useApiMutation(
    ({ id, status }: { id: string; status: string }) =>
      orderApi.updateStatus(id, status),
    { invalidateQueries: ["orders"] },
  );
}
