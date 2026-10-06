"use client";

import * as React from "react";
import { Link } from "@/i18n/navigation";
import { usePathname } from "@/i18n/navigation";
import { Menu } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

interface NavLink {
  href: string;
  label: string;
}

interface Props {
  links: NavLink[];
}

export function MobileNavToggle({ links }: Props) {
  const [open, setOpen] = React.useState(false);
  const pathname = usePathname();

  React.useEffect(() => {
    setOpen(false);
  }, [pathname]);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        aria-label="Open menu"
        className="md:hidden inline-flex items-center justify-center h-10 w-10 rounded-md text-text-muted hover:text-text hover:bg-surface-2 transition-colors"
      >
        <Menu className="h-5 w-5" />
      </SheetTrigger>
      <SheetContent side="right" className="w-[280px] max-w-[85vw]">
        <nav className="flex flex-col gap-1 mt-8">
          {links.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className="px-3 py-3 rounded-[var(--pe-r-md)] text-base text-text hover:bg-surface-2 transition-colors"
            >
              {label}
            </Link>
          ))}
        </nav>
      </SheetContent>
    </Sheet>
  );
}
