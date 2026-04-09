import { Link, useRouterState } from "@tanstack/react-router"
import type { LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"

interface SidebarNavItemProps {
  to: string
  label: string
  icon: LucideIcon
}

export function SidebarNavItem({ to, label, icon: Icon }: SidebarNavItemProps) {
  const router = useRouterState()
  const isActive =
    to === "/dashboard"
      ? router.location.pathname === "/dashboard"
      : router.location.pathname.startsWith(to)

  return (
    <Link
      to={to}
      className={cn(
        "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
        isActive
          ? "bg-sidebar-accent text-sidebar-accent-foreground"
          : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
      )}
    >
      <Icon className="h-4 w-4" />
      {label}
    </Link>
  )
}
