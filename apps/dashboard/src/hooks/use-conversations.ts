import { useApiQuery } from "./use-api"
import { conversationApi, type Conversation } from "@/lib/api"

export function useConversations(params?: {
  status?: string
  customerId?: string
}) {
  return useApiQuery<Conversation[]>(
    ["conversations", params],
    () => conversationApi.getAll(params),
  )
}

export function useConversation(id: string) {
  return useApiQuery<Conversation>(
    ["conversations", id],
    () => conversationApi.getById(id),
    { enabled: !!id },
  )
}
