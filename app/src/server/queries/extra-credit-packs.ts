import "server-only";
import { db } from "@/db/client";

export type ActivePack = {
  id: string;
  slug: string;
  name: string;
  credits: number;
  priceUsd: number;
  paddlePriceId: string | null;
  validityDays: number;
};

export async function listActiveExtraCreditPacks(): Promise<ActivePack[]> {
  const packs = await db.extraCreditPack.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: "asc" },
  });
  return packs.map((p) => ({
    id: p.id,
    slug: p.slug,
    name: p.name,
    credits: p.credits,
    priceUsd: Number(p.priceUsd),
    paddlePriceId: p.paddlePriceId,
    validityDays: p.validityDays,
  }));
}
