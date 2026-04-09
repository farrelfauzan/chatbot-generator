import { createFileRoute, Outlet, Link, useRouterState } from "@tanstack/react-router";
import { PageHeader } from "@/components/page-header";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/dashboard/settings")({
  component: SettingsLayout,
});

const tabs = [
  { to: "/dashboard/settings", label: "Company Info" },
  { to: "/dashboard/settings/bank-accounts", label: "Bank Accounts" },
] as const;

function SettingsLayout() {
  const router = useRouterState();
  const pathname = router.location.pathname;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Settings"
        description="Manage company information and payment details"
      />
      <div className="flex gap-1 border-b border-border">
        {tabs.map((tab) => {
          const isActive =
            tab.to === "/dashboard/settings"
              ? pathname === "/dashboard/settings" || pathname === "/dashboard/settings/"
              : pathname.startsWith(tab.to);
          return (
            <Link
              key={tab.to}
              to={tab.to}
              className={cn(
                "border-b-2 px-4 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground",
              )}
            >
              {tab.label}
            </Link>
          );
        })}
      </div>
      <Outlet />
    </div>
  );
}
