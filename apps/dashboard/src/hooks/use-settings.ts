import { useApiQuery, useApiMutation } from "./use-api";
import { settingsApi, type CompanyInfo, type BankAccount } from "@/lib/api";

export function useCompanyInfo() {
  return useApiQuery<CompanyInfo>("company-info", () =>
    settingsApi.getCompanyInfo(),
  );
}

export function useUpdateCompanyInfo() {
  return useApiMutation<CompanyInfo, CompanyInfo>(
    (data) => settingsApi.updateCompanyInfo(data),
    { invalidateQueries: ["company-info"] },
  );
}

export function useBankAccounts() {
  return useApiQuery<BankAccount[]>("bank-accounts", () =>
    settingsApi.getBankAccounts(),
  );
}

export function useCreateBankAccount() {
  return useApiMutation<BankAccount, Partial<BankAccount>>(
    (data) => settingsApi.createBankAccount(data),
    { invalidateQueries: ["bank-accounts"] },
  );
}

export function useUpdateBankAccount() {
  return useApiMutation<
    BankAccount,
    { id: string; data: Partial<BankAccount> }
  >((vars) => settingsApi.updateBankAccount(vars.id, vars.data), {
    invalidateQueries: ["bank-accounts"],
  });
}

export function useDeleteBankAccount() {
  return useApiMutation<unknown, string>(
    (id) => settingsApi.deleteBankAccount(id),
    { invalidateQueries: ["bank-accounts"] },
  );
}
