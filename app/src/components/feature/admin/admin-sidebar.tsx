import Link from "next/link";
import {
  LayoutDashboard, Users, CreditCard, FileText, Cpu, GitBranch,
  FolderTree, BookOpen, Globe, Mail, BarChart3, ShieldAlert,
  Network, Settings, ScrollText, Target, HelpCircle, Database, Upload, Layers, SlidersHorizontal,
  Bot, Scroll, UserCircle2, AlertOctagon, GraduationCap, Activity,
  Receipt, Webhook, Package,
} from "lucide-react";
import { Logo } from "@/components/feature/layout/logo";

const BASE = "/pr/yonet";

export const ADMIN_NAV = [
  {
    group: "Overview",
    items: [
      { href: BASE, label: "Dashboard", icon: LayoutDashboard, id: "dashboard" },
      { href: `${BASE}/live`, label: "Live stats", icon: Activity, id: "live" },
    ],
  },
  {
    group: "Users & Plans",
    items: [
      { href: `${BASE}/users`, label: "Users", icon: Users, id: "users" },
      { href: `${BASE}/plans`, label: "Plans & Pricing", icon: CreditCard, id: "plans" },
    ],
  },
  {
    group: "Billing",
    items: [
      { href: `${BASE}/billing`, label: "Overview", icon: BarChart3, id: "billing" },
      { href: `${BASE}/billing/transactions`, label: "Transactions", icon: Receipt, id: "billing-transactions" },
      { href: `${BASE}/billing/webhook-events`, label: "Webhook Events", icon: Webhook, id: "billing-webhook-events" },
      { href: `${BASE}/billing/credit-audit`, label: "Credit Audit", icon: ScrollText, id: "billing-credit-audit" },
      { href: `${BASE}/billing/packs`, label: "Pack purchases", icon: Package, id: "billing-packs" },
    ],
  },
  {
    group: "v4 Engine ⭐",
    items: [
      { href: `${BASE}/agent-roles`, label: "Agent Roles", icon: Bot, id: "agent-roles" },
      { href: `${BASE}/constitution`, label: "Constitution", icon: Scroll, id: "constitution" },
      { href: `${BASE}/personas`, label: "Expert Personas", icon: UserCircle2, id: "personas" },
      { href: `${BASE}/antipatterns`, label: "Anti-Patterns", icon: AlertOctagon, id: "antipatterns" },
      { href: `${BASE}/training/resources`, label: "Training Resources", icon: GraduationCap, id: "training" },
      { href: `${BASE}/training/distillations`, label: "Distillation Queue", icon: GraduationCap, id: "training" },
      { href: `${BASE}/traces`, label: "Generation Traces", icon: Activity, id: "traces" },
      { href: `${BASE}/observability`, label: "Observability", icon: Activity, id: "observability" },
    ],
  },
  {
    group: "Engine (legacy + target)",
    items: [
      { href: `${BASE}/engines`, label: "AI Engines", icon: Cpu, id: "engines" },
      { href: `${BASE}/mapping`, label: "Modality Mapping", icon: GitBranch, id: "mapping" },
      { href: `${BASE}/target-engines`, label: "Target AIs", icon: Target, id: "target-engines" },
      { href: `${BASE}/templates`, label: "Templates (legacy v1)", icon: FileText, id: "templates" },
      { href: `${BASE}/questions`, label: "Questions (legacy v1)", icon: HelpCircle, id: "questions" },
      { href: `${BASE}/taxonomy`, label: "Taxonomy", icon: FolderTree, id: "taxonomy" },
    ],
  },
  {
    group: "Library",
    items: [
      { href: `${BASE}/library`, label: "Prompt Library", icon: Database, id: "library" },
      { href: `${BASE}/library/import`, label: "Import", icon: Upload, id: "library-import" },
      { href: `${BASE}/embedding-engines`, label: "Embedding Engines", icon: Layers, id: "embedding-engines" },
      { href: `${BASE}/library/settings`, label: "Library AI", icon: SlidersHorizontal, id: "library-settings" },
    ],
  },
  {
    group: "Content",
    items: [
      { href: `${BASE}/blog`, label: "Blog", icon: BookOpen, id: "blog" },
      { href: `${BASE}/i18n`, label: "Languages", icon: Globe, id: "i18n" },
      { href: `${BASE}/emails`, label: "Emails", icon: Mail, id: "emails" },
    ],
  },
  {
    group: "System",
    items: [
      { href: `${BASE}/analytics`, label: "Analytics", icon: BarChart3, id: "analytics" },
      { href: `${BASE}/abuse`, label: "Abuse & Reports", icon: ShieldAlert, id: "abuse" },
      { href: `${BASE}/api`, label: "API Logs", icon: Network, id: "api" },
      { href: `${BASE}/system-settings`, label: "Settings", icon: Settings, id: "system-settings" },
      { href: `${BASE}/welcome-credit`, label: "Welcome Credit", icon: Settings, id: "welcome-credit" },
      { href: `${BASE}/audit`, label: "Audit Log", icon: ScrollText, id: "audit" },
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
