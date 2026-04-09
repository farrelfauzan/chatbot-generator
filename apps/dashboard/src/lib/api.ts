import { apiClient } from "./api-client";

export interface Customer {
  id: string;
  phoneNumber: string;
  name: string | null;
  email: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Conversation {
  id: string;
  customerId: string;
  status: string;
  stage: string;
  createdAt: string;
  updatedAt: string;
  customer?: Customer;
  messages?: Message[];
}

export interface Message {
  id: string;
  conversationId: string;
  direction: "inbound" | "outbound";
  content: string;
  createdAt: string;
}

export interface Product {
  id: string;
  name: string;
  description: string | null;
  categoryId: string | null;
  price: number;
  stockQty: number;
  isActive: boolean;
  imageUrl: string | null;
  createdAt: string;
  updatedAt: string;
  category: Category | null;
}

export interface Category {
  id: string;
  name: string;
  description: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Order {
  id: string;
  orderNumber: string;
  customerId: string;
  status: string;
  subtotal: number;
  discountAmount: number;
  shippingAmount: number;
  taxAmount: number;
  totalAmount: number;
  createdAt: string;
  updatedAt: string;
  customer?: Customer;
  items?: OrderItem[];
}

export interface OrderItem {
  id: string;
  productId: string;
  productNameSnapshot: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
}

export interface FaqEntry {
  id: string;
  question: string;
  answer: string;
  category: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// ─── Customer API ────────────────────────────────────
export const customerApi = {
  getAll: () => apiClient.get<never, Customer[]>("/customers"),
  getById: (id: string) =>
    apiClient.get<never, Customer>(`/customers/${encodeURIComponent(id)}`),
};

// ─── Conversation API ────────────────────────────────
export const conversationApi = {
  getAll: (params?: { status?: string; customerId?: string }) =>
    apiClient.get<never, Conversation[]>("/conversations", { params }),
  getById: (id: string) =>
    apiClient.get<never, Conversation>(
      `/conversations/${encodeURIComponent(id)}`,
    ),
};

// ─── Product API ─────────────────────────────────────
export const productApi = {
  getAll: (params?: {
    categoryId?: string;
    search?: string;
    isActive?: boolean;
  }) => apiClient.get<never, Product[]>("/products", { params }),
  getById: (id: string) =>
    apiClient.get<never, Product>(`/products/${encodeURIComponent(id)}`),
  create: (data: Partial<Product>) =>
    apiClient.post<never, Product>("/products", data),
  update: (id: string, data: Partial<Product>) =>
    apiClient.patch<never, Product>(
      `/products/${encodeURIComponent(id)}`,
      data,
    ),
};

// ─── Category API ────────────────────────────────────
export const categoryApi = {
  getAll: () => apiClient.get<never, Category[]>("/categories"),
  getById: (id: string) =>
    apiClient.get<never, Category>(`/categories/${encodeURIComponent(id)}`),
  create: (data: Partial<Category>) =>
    apiClient.post<never, Category>("/categories", data),
  update: (id: string, data: Partial<Category>) =>
    apiClient.patch<never, Category>(
      `/categories/${encodeURIComponent(id)}`,
      data,
    ),
  delete: (id: string) =>
    apiClient.delete(`/categories/${encodeURIComponent(id)}`),
};

// ─── Order API ───────────────────────────────────────
export const orderApi = {
  getAll: (params?: { status?: string; customerId?: string }) =>
    apiClient.get<never, Order[]>("/orders", { params }),
  getById: (id: string) =>
    apiClient.get<never, Order>(`/orders/${encodeURIComponent(id)}`),
  updateStatus: (id: string, status: string) =>
    apiClient.patch<never, Order>(`/orders/${encodeURIComponent(id)}/status`, {
      status,
    }),
};

// ─── FAQ API ─────────────────────────────────────────
export const faqApi = {
  getAll: (params?: { category?: string; isActive?: boolean }) =>
    apiClient.get<never, FaqEntry[]>("/faq", { params }),
  getById: (id: string) =>
    apiClient.get<never, FaqEntry>(`/faq/${encodeURIComponent(id)}`),
  create: (data: Partial<FaqEntry>) =>
    apiClient.post<never, FaqEntry>("/faq", data),
  update: (id: string, data: Partial<FaqEntry>) =>
    apiClient.patch<never, FaqEntry>(`/faq/${encodeURIComponent(id)}`, data),
  delete: (id: string) => apiClient.delete(`/faq/${encodeURIComponent(id)}`),
};

// ─── Auth ─────────────────────────────────────────────
export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  accessToken: string;
  admin: {
    id: string;
    email: string;
    name: string;
    role: string;
  };
}

export const authApi = {
  login: (data: LoginRequest) =>
    apiClient.post<never, LoginResponse>("/auth/login", data),
  getProfile: () =>
    apiClient.get<
      never,
      { id: string; email: string; name: string; role: string }
    >("/auth/profile"),
};

// ─── Settings ─────────────────────────────────────────
export interface CompanyInfo {
  [key: string]: string;
}

export interface BankAccount {
  id: string;
  bankName: string;
  accountNumber: string;
  accountHolder: string;
  isActive: boolean;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

export const settingsApi = {
  getCompanyInfo: () => apiClient.get<never, CompanyInfo>("/settings/company"),
  updateCompanyInfo: (data: CompanyInfo) =>
    apiClient.put<never, CompanyInfo>("/settings/company", data),
  getBankAccounts: () =>
    apiClient.get<never, BankAccount[]>("/settings/bank-accounts"),
  createBankAccount: (data: Partial<BankAccount>) =>
    apiClient.post<never, BankAccount>("/settings/bank-accounts", data),
  updateBankAccount: (id: string, data: Partial<BankAccount>) =>
    apiClient.patch<never, BankAccount>(
      `/settings/bank-accounts/${encodeURIComponent(id)}`,
      data,
    ),
  deleteBankAccount: (id: string) =>
    apiClient.delete(`/settings/bank-accounts/${encodeURIComponent(id)}`),
};
