import { Link, useRouterState } from "@tanstack/react-router"
import {
  LayoutDashboard,
  MessageSquare,
  Users,
  Package,
  ShoppingCart,
  HelpCircle,
  Bot,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { SidebarNavItem } from "./sidebar-nav-item"

const navItems = [
  { to: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { to: "/dashboard/conversations", label: "Conversations", icon: MessageSquare },
  { to: "/dashboard/customers", label: "Customers", icon: Users },
  { to: "/dashboard/products", label: "Products", icon: Package },
  { to: "/dashboard/orders", label: "Orders", icon: ShoppingCart },
  { to: "/dashboard/faq", label: "FAQ", icon: HelpCircle },
] as const

export function DashboardSidebar() {
  return (
    <aside className="flex h-screen w-64 flex-col border-r border-(--sidebar-border) bg-(--sidebar-background)">
      <div className="flex h-14 items-center gap-2 border-b border-(--sidebar-border) px-4">
        <Bot className="h-6 w-6 text-(--primary)" />
        <span className="text-base font-semibold text-(--foreground)">
          Chatbot Dashboard
        </span>
      </div>
      <nav className="flex-1 space-y-1 px-2 py-3">
        {navItems.map((item) => (
          <SidebarNavItem
            key={item.to}
            to={item.to}
            label={item.label}
            icon={item.icon}
          />
        ))}
      </nav>
    </aside>
  )
}
