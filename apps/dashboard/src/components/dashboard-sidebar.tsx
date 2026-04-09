import { useNavigate } from "@tanstack/react-router"
import {
  LayoutDashboard,
  MessageSquare,
  Users,
  Package,
  Tags,
  ShoppingCart,
  HelpCircle,
  Settings,
  LogOut,
  Bot,
} from "lucide-react"
import { SidebarNavItem } from "./sidebar-nav-item"
import { clearAuth, getAdmin } from "@/lib/auth"
import { Button } from "./ui/button"

const navItems = [
  { to: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { to: "/dashboard/conversations", label: "Conversations", icon: MessageSquare },
  { to: "/dashboard/customers", label: "Customers", icon: Users },
  { to: "/dashboard/products", label: "Products", icon: Package },
  { to: "/dashboard/categories", label: "Categories", icon: Tags },
  { to: "/dashboard/orders", label: "Orders", icon: ShoppingCart },
  { to: "/dashboard/faq", label: "FAQ", icon: HelpCircle },
  { to: "/dashboard/settings", label: "Settings", icon: Settings },
] as const

export function DashboardSidebar() {
  const navigate = useNavigate()
  const admin = getAdmin()

  function handleLogout() {
    clearAuth()
    navigate({ to: "/login" })
  }

  return (
    <aside className="flex h-screen w-64 flex-col border-r border-sidebar-border bg-sidebar-background">
      <div className="flex h-14 items-center gap-2 border-b border-sidebar-border px-4">
        <Bot className="h-6 w-6 text-primary" />
        <span className="text-base font-semibold text-foreground">
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
      <div className="border-t border-sidebar-border p-3">
        {admin && (
          <p className="mb-2 truncate px-3 text-xs text-muted-foreground">
            {admin.email}
          </p>
        )}
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start gap-2 text-muted-foreground hover:text-destructive"
          onClick={handleLogout}
        >
          <LogOut className="h-4 w-4" />
          Sign out
        </Button>
      </div>
    </aside>
  )
}
