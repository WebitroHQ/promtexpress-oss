import { auth } from "@/lib/auth";
import { HelpDialogButton } from "./help-dialog-button";
import { getAdminHelp, type AdminHelpKey } from "@/lib/admin/help-content";

interface Props {
  title: string;
  sub?: string;
  actions?: React.ReactNode;
  breadcrumb?: React.ReactNode;
  helpKey?: AdminHelpKey;
}

export async function AdminPageHeader({ title, sub, actions, breadcrumb, helpKey }: Props) {
  let helpEl: React.ReactNode = null;
  if (helpKey) {
    const session = await auth();
    const locale = (session?.user as { locale?: string } | undefined)?.locale ?? "en";
    const help = getAdminHelp(helpKey, locale);
    if (help) {
      helpEl = (
        <HelpDialogButton content={help.content} triggerLabel={help.ui.triggerLabel} />
      );
    }
  }

  return (
    <div className="mb-5">
      {breadcrumb && (
        <div className="text-xs text-text-faint mb-1.5">{breadcrumb}</div>
      )}
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-[26px] font-semibold tracking-[-0.025em]">{title}</h1>
          {sub && <p className="text-sm text-text-muted mt-1">{sub}</p>}
        </div>
        {(helpEl || actions) && (
          <div className="flex gap-2">
            {helpEl}
            {actions}
          </div>
        )}
      </div>
    </div>
  );
}
