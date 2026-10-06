"use client";

import * as React from "react";
import { toast } from "sonner";
import { useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { submitFeedback } from "@/server/actions/feedback";

const CATEGORIES = [
  { value: "idea", label: "Idea or request" },
  { value: "bug", label: "Something is broken" },
  { value: "other", label: "Something else" },
];

const MAX_LENGTH = 4000;

export function FeedbackForm() {
  const router = useRouter();
  const [category, setCategory] = React.useState("idea");
  const [message, setMessage] = React.useState("");
  const [sending, setSending] = React.useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    try {
      const res = await submitFeedback({ category, message });
      if (res.ok) {
        toast.success("Thanks, your feedback was sent");
        setMessage("");
        router.refresh();
      } else {
        toast.error(res.error);
      }
    } catch {
      toast.error("Could not send your feedback. Please try again.");
    } finally {
      setSending(false);
    }
  };

  return (
    <form onSubmit={onSubmit} className="rounded-xl border border-border bg-surface p-6">
      <fieldset className="mb-5">
        <legend className="text-sm font-medium mb-2">What is it about?</legend>
        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map((c) => (
            <label
              key={c.value}
              className={`cursor-pointer rounded-md border px-3 py-1.5 text-sm transition-colors ${
                category === c.value ? "border-primary text-primary" : "border-border text-text-muted hover:text-text"
              }`}
            >
              <input
                type="radio"
                name="feedback-category"
                value={c.value}
                checked={category === c.value}
                onChange={() => setCategory(c.value)}
                className="sr-only"
              />
              {c.label}
            </label>
          ))}
        </div>
      </fieldset>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="feedback-message">Your feedback</Label>
        <Textarea
          id="feedback-message"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={6}
          maxLength={MAX_LENGTH}
          placeholder="What happened, or what would make PromtExpress better for you?"
          required
        />
        <p className="text-xs text-text-faint self-end tabular-nums">
          {message.length} / {MAX_LENGTH}
        </p>
      </div>

      <Button type="submit" className="mt-3" disabled={sending || message.trim().length < 10}>
        {sending ? "Sending…" : "Send feedback"}
      </Button>
    </form>
  );
}
