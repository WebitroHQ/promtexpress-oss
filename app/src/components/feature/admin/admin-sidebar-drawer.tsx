"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { AdminSidebarContent } from "./admin-sidebar";

export function AdminSidebarDrawer({ current }: { current: string }) {
  const [open, setOpen] = React.useState(false);
  const pathname = usePathname();

  React.useEffect(() => {
    setOpen(false);
  }, [pathname]);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        aria-label="Open admin menu"
        className="md:hidden inline-flex items-center justify-center h-10 w-10 rounded-md text-text-muted hover:text-text hover:bg-surface-2 transition-colors"
      >
        <Menu className="h-5 w-5" />
      </SheetTrigger>
      <SheetContent side="left" className="w-[280px] max-w-[85vw] p-0 flex flex-col">
        <AdminSidebarContent current={current} />
      </SheetContent>
    </Sheet>
  );
}
