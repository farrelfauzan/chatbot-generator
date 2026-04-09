import { useApiQuery } from "./use-api";
import { customerApi, type Customer } from "@/lib/api";

export function useCustomers() {
  return useApiQuery<Customer[]>("customers", () => customerApi.getAll());
}

export function useCustomer(id: string) {
  return useApiQuery<Customer>(
    ["customers", id],
    () => customerApi.getById(id),
    { enabled: !!id },
  );
}
