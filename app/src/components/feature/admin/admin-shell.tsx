import { AdminSidebar } from "./admin-sidebar";
import { AdminSidebarDrawer } from "./admin-sidebar-drawer";

interface Props {
  current: string;
  userEmail?: string | null;
  children: React.ReactNode;
}

export function AdminShell({ current, userEmail, children }: Props) {
  return (
    <div className="flex min-h-screen bg-bg">
      <AdminSidebar current={current} />

      <div className="flex-1 min-w-0 flex flex-col">
        {/* Top bar */}
        <header className="sticky top-0 z-40 flex items-center justify-between px-4 py-3 md:px-9 md:py-3.5 border-b border-border bg-bg/90 backdrop-blur-sm">
          <AdminSidebarDrawer current={current} />
          <div className="flex items-center gap-3 text-sm text-text-muted">
            {userEmail && <span className="hidden sm:inline">{userEmail}</span>}
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-error/15 text-error">ADMIN</span>
          </div>
        </header>

        <main className="flex-1 px-4 py-6 md:px-9 md:py-7">{children}</main>
      </div>
    </div>
  );
}
