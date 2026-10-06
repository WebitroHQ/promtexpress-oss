/**
 * Credit cost per generation, by modality.
 *
 * PromtExpress is free: users bring their own AI provider key, so a generation costs no credits.
 * The function stays so the ledger and admin screens keep working with a cost of zero.
 */
export function creditCost(_modality: string): number {
  return 0;
}
