"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { createPlan, updatePlan, deletePlan } from "@/server/actions/admin-plans";

type PlanRow = {
  id: string;
  name: string;
  slug: string;
  priceMonthly: number;
  priceYearly: number;
  monthlyCredits: number;
  isActive: boolean;
  featured?: boolean;
  features?: string[];
  sortOrder: number;
  activeSubscriberCount?: number;
};

type Mode = { type: "create" } | { type: "edit"; plan: PlanRow };

function PlanForm({
  mode,
  onClose,
}: {
  mode: Mode;
  onClose: () => void;
}) {
  const initial = mode.type === "edit" ? mode.plan : {
    name: "", slug: "", priceMonthly: 0, priceYearly: 0,
    monthlyCredits: 0, isActive: true, featured: false, features: [] as string[], sortOrder: 0,
  };

  const [name, setName] = useState(initial.name);
  const [slug, setSlug] = useState(initial.slug);
  const [priceMonthly, setPriceMonthly] = useState(String(initial.priceMonthly));
  const [priceYearly, setPriceYearly] = useState(String(initial.priceYearly));
  const [monthlyCredits, setMonthlyCredits] = useState(String(initial.monthlyCredits));
  const [isActive, setIsActive] = useState(initial.isActive);
  const [featured, setFeatured] = useState(Boolean(initial.featured));
  const [featuresText, setFeaturesText] = useState(
    Array.isArray(initial.features) ? initial.features.join("\n") : ""
  );
  const [sortOrder, setSortOrder] = useState(String(initial.sortOrder));
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const payload = {
      name, slug,
      priceMonthly: Number(priceMonthly),
      priceYearly: Number(priceYearly),
      monthlyCredits: Number(monthlyCredits),
      isActive,
      featured,
      features: featuresText.split("\n").map((s) => s.trim()).filter(Boolean),
      sortOrder: Number(sortOrder),
    };
    startTransition(async () => {
      try {
        if (mode.type === "edit") {
          await updatePlan(mode.plan.id, payload);
        } else {
          await createPlan(payload);
        }
        onClose();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Save failed");
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Field label="Plan name" required>
          <input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} required />
        </Field>
        <Field label="Slug (URL)" required>
          <input className={inputCls} value={slug} onChange={(e) => setSlug(e.target.value.toLowerCase())} required placeholder="free, starter, pro" />
        </Field>
        <Field label="Monthly price ($)">
          <input type="number" min="0" step="0.01" className={inputCls} value={priceMonthly} onChange={(e) => setPriceMonthly(e.target.value)} />
        </Field>
        <Field label="Yearly price ($)">
          <input type="number" min="0" step="0.01" className={inputCls} value={priceYearly} onChange={(e) => setPriceYearly(e.target.value)} />
        </Field>
        <Field label="Monthly credits">
          <input type="number" min="0" className={inputCls} value={monthlyCredits} onChange={(e) => setMonthlyCredits(e.target.value)} />
        </Field>
        <Field label="Sort order">
          <input type="number" className={inputCls} value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} />
        </Field>
      </div>

      <Field label="Features (one per line — listed on the landing pricing card)">
        <textarea
          className={inputCls + " min-h-[110px] font-mono text-xs"}
          value={featuresText}
          onChange={(e) => setFeaturesText(e.target.value)}
          placeholder={"All models supported\nCommunity templates\nQuality scoring"}
        />
      </Field>

      <label className="flex items-center gap-2 text-sm cursor-pointer">
        <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} className="accent-primary h-4 w-4" />
        Active (visible on the site)
      </label>

      <label className="flex items-center gap-2 text-sm cursor-pointer">
        <input type="checkbox" checked={featured} onChange={(e) => setFeatured(e.target.checked)} className="accent-primary h-4 w-4" />
        Featured — highlighted card (gradient frame on landing, primary CTA)
      </label>

      {error && <p className="text-sm text-error">{error}</p>}

      <div className="flex items-center justify-between pt-2 border-t border-border">
        {mode.type === "edit" && (
          <DeletePlanButton
            planId={mode.plan.id}
            planName={mode.plan.name}
            activeSubscriberCount={mode.plan.activeSubscriberCount ?? 0}
            onDeleted={onClose}
          />
        )}
        <div className={`flex gap-2 ${mode.type !== "edit" ? "ml-auto" : ""}`}>
          <Button type="button" variant="ghost" size="sm" onClick={onClose}>Cancel</Button>
          <Button type="submit" size="sm" disabled={pending}>
            {pending ? "Saving…" : mode.type === "edit" ? "Update" : "Create"}
          </Button>
        </div>
      </div>
    </form>
  );
}

function DeletePlanButton({
  planId,
  planName,
  activeSubscriberCount,
  onDeleted,
}: {
  planId: string;
  planName: string;
  activeSubscriberCount: number;
  onDeleted: () => void;
}) {
  const [confirm, setConfirm] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const handleConfirm = () => {
    setError(null);
    startTransition(async () => {
      try {
        const result = await deletePlan(planId);
        if (result.action === "deactivated") {
          // Plan devre dışı bırakıldı, dialog kapansın — sayfa yenilenir
          onDeleted();
        } else {
          onDeleted();
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Operation failed");
        setConfirm(false);
      }
    });
  };

  if (error) return <p className="text-xs text-error max-w-[280px]">{error}</p>;

  if (confirm) {
    const hasSubscribers = activeSubscriberCount > 0;
    return (
      <div className="flex flex-col gap-2 max-w-[320px]">
        {hasSubscribers ? (
          <p className="text-xs text-warning leading-relaxed">
            ⚠ This plan has <strong>{activeSubscriberCount}</strong> active subscribers.
            If you confirm, the plan will be <strong>closed to new sales</strong>; existing subscribers
            keep access until the end of their period.
          </p>
        ) : (
          <p className="text-xs text-error">
            "{planName}" will be permanently deleted. This cannot be undone.
          </p>
        )}
        <div className="flex gap-2">
          <Button type="button" size="sm" variant="ghost" onClick={() => setConfirm(false)} disabled={pending}>
            Cancel
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={handleConfirm}
            disabled={pending}
            className={hasSubscribers
              ? "bg-warning text-primary-text hover:bg-warning/90"
              : "bg-error text-primary-text hover:bg-error/90"}
          >
            {pending
              ? "Processing…"
              : hasSubscribers
                ? "Got it, close to new sales"
                : "Yes, delete permanently"}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <button type="button" onClick={() => setConfirm(true)} className="text-xs text-error hover:underline">
      Delete plan
    </button>
  );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs text-text-muted">{label}{required && " *"}</label>
      {children}
    </div>
  );
}

const inputCls = "h-8 rounded-md border border-border bg-surface px-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40";

export function NewPlanButton() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button size="sm" onClick={() => setOpen(true)}>
        <span className="mr-1 text-base leading-none">+</span> New plan
      </Button>
      {open && (
        <Modal title="Create new plan" onClose={() => setOpen(false)}>
          <PlanForm mode={{ type: "create" }} onClose={() => setOpen(false)} />
        </Modal>
      )}
    </>
  );
}

export function EditPlanButton({ plan }: { plan: PlanRow }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button onClick={() => setOpen(true)} className="text-xs text-primary hover:underline">
        Edit
      </button>
      {open && (
        <Modal title={`Edit plan: ${plan.name}`} onClose={() => setOpen(false)}>
          <PlanForm mode={{ type: "edit", plan }} onClose={() => setOpen(false)} />
        </Modal>
      )}
    </>
  );
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-overlay backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-surface border border-border rounded-xl shadow-xl w-full max-w-lg mx-4 p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-semibold text-[15px]">{title}</h2>
          <button onClick={onClose} className="text-text-faint hover:text-text text-xl leading-none">×</button>
        </div>
        {children}
      </div>
    </div>
  );
}
