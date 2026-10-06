import Link from "next/link";
import {
  LayoutDashboard, Users, FileText, Cpu, GitBranch,
  FolderTree, BookOpen, Mail, BarChart3, ShieldAlert,
  Network, Settings, ScrollText, Target, HelpCircle, Database, Upload, SlidersHorizontal,
  Bot, Scroll, UserCircle2, AlertOctagon, GraduationCap, Activity,
  } from "lucide-react";
import { Logo } from "@/components/feature/layout/logo";

const BASE = "/pr/yonet";

export const ADMIN_NAV = [
  {
    group: "Overview",
    items: [
      { href: BASE, label: "Dashboard", icon: LayoutDashboard, id: "dashboard" },
      { href: `${BASE}/analytics`, label: "Analytics", icon: BarChart3, id: "analytics" },
    ],
  },
  {
    group: "Community",
    items: [
      { href: `${BASE}/users`, label: "Users", icon: Users, id: "users" },
      { href: `${BASE}/feedback`, label: "Feedback", icon: Mail, id: "feedback" },
      { href: `${BASE}/abuse`, label: "Abuse & Reports", icon: ShieldAlert, id: "abuse" },
    ],
  },
  {
    group: "Prompt engine",
    items: [
      { href: `${BASE}/agent-roles`, label: "Agent Roles", icon: Bot, id: "agent-roles" },
      { href: `${BASE}/constitution`, label: "Constitution", icon: Scroll, id: "constitution" },
      { href: `${BASE}/personas`, label: "Expert Personas", icon: UserCircle2, id: "personas" },
      { href: `${BASE}/antipatterns`, label: "Anti-Patterns", icon: AlertOctagon, id: "antipatterns" },
      { href: `${BASE}/target-engines`, label: "Target AIs", icon: Target, id: "target-engines" },
      { href: `${BASE}/mapping`, label: "Modality Mapping", icon: GitBranch, id: "mapping" },
      { href: `${BASE}/engines`, label: "AI Engines", icon: Cpu, id: "engines" },
      { href: `${BASE}/traces`, label: "Generation Traces", icon: Activity, id: "traces" },
      { href: `${BASE}/observability`, label: "Observability", icon: Activity, id: "observability" },
    ],
  },
  {
    group: "Library",
    items: [
      { href: `${BASE}/library`, label: "Prompt Library", icon: Database, id: "library" },
      { href: `${BASE}/library/import`, label: "Import", icon: Upload, id: "library-import" },
      { href: `${BASE}/library/settings`, label: "Library AI", icon: SlidersHorizontal, id: "library-settings" },
      { href: `${BASE}/taxonomy`, label: "Taxonomy", icon: FolderTree, id: "taxonomy" },
      { href: `${BASE}/training/resources`, label: "Training Resources", icon: GraduationCap, id: "training" },
      { href: `${BASE}/training/distillations`, label: "Distillation Queue", icon: GraduationCap, id: "training" },
    ],
  },
  {
    group: "Content",
    items: [
      { href: `${BASE}/blog`, label: "Blog", icon: BookOpen, id: "blog" },
      { href: `${BASE}/emails`, label: "Emails", icon: Mail, id: "emails" },
    ],
  },
  {
    group: "System",
    items: [
      { href: `${BASE}/api`, label: "API Logs", icon: Network, id: "api" },
      { href: `${BASE}/system-settings`, label: "Settings", icon: Settings, id: "system-settings" },
      { href: `${BASE}/audit`, label: "Audit Log", icon: ScrollText, id: "audit" },
    ],
  },
  {
    group: "Legacy",
    items: [
      { href: `${BASE}/templates`, label: "Templates (v1)", icon: FileText, id: "templates" },
      { href: `${BASE}/questions`, label: "Questions (v1)", icon: HelpCircle, id: "questions" },
    ],
  },
];

export const ADMIN_BASE = BASE;

export function AdminSidebarContent({ current }: { current: string }) {
  return (
    <>
      <div className="px-5 py-5 border-b border-border">
        <Logo href={BASE} size="md" />
        <span className="mt-1.5 inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-error/15 text-error">
          ADMIN
        </span>
      </div>

      <nav className="flex-1 px-3 py-4 overflow-y-auto">
        {ADMIN_NAV.map((section) => (
          <div key={section.group} className="mb-5">
            <p className="px-2 mb-1.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-text-faint">
              {section.group}
            </p>
            {section.items.map((item) => {
              const Icon = item.icon;
              const active = current === item.id;
              return (
                <Link
                  key={item.id}
                  href={item.href}
                  className={`flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm mb-0.5 transition-colors ${
                    active
                      ? "bg-primary/10 text-primary font-medium"
                      : "text-text-muted hover:bg-surface-2 hover:text-text"
                  }`}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  {item.label}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      <div className="px-4 py-4 border-t border-border">
        <Link href="/dashboard" className="text-xs text-text-muted hover:text-text transition-colors">
          ← Back to app
        </Link>
      </div>
    </>
  );
}

interface Props {
  current: string;
  className?: string;
}

export function AdminSidebar({ current, className }: Props) {
  return (
    <aside className={`hidden md:flex w-[260px] shrink-0 border-r border-border bg-surface flex-col min-h-screen ${className ?? ""}`}>
      <AdminSidebarContent current={current} />
    </aside>
  );
}
