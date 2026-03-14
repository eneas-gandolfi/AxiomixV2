/**
 * Arquivo: src/services/social/best-times.ts
 * Propósito: Analisar os melhores horários para postar com base nos posts publicados.
 * Autor: AXIOMIX
 * Data: 2026-03-13
 */

import "server-only";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type {
  BestTimeSlot,
  BestTimesData,
  SocialPlatform,
} from "@/types/modules/social-publisher.types";

export async function analyzeBestTimes(
  companyId: string,
  platform?: SocialPlatform
): Promise<BestTimesData> {
  const supabase = createSupabaseAdminClient();

  let query = supabase
    .from("scheduled_posts")
    .select("published_at, platforms")
    .eq("company_id", companyId)
    .eq("status", "published")
    .not("published_at", "is", null);

  const { data: rows, error } = await query;

  if (error) {
    return {
      platform: platform ?? "all",
      slots: [],
      totalPublished: 0,
    };
  }

  const filtered = (rows ?? []).filter((row) => {
    if (!row.published_at) return false;
    if (!platform) return true;

    const platforms = Array.isArray(row.platforms) ? row.platforms : [];
    return platforms.includes(platform);
  });

  const buckets = new Map<string, number>();

  for (const row of filtered) {
    const date = new Date(row.published_at!);
    const dayOfWeek = date.getUTCDay();
    const hour = date.getUTCHours();
    const key = `${dayOfWeek}-${hour}`;
    buckets.set(key, (buckets.get(key) ?? 0) + 1);
  }

  const slots: BestTimeSlot[] = [];
  for (const [key, postCount] of buckets) {
    const [day, h] = key.split("-");
    slots.push({
      dayOfWeek: Number(day),
      hour: Number(h),
      postCount,
    });
  }

  slots.sort((a, b) => b.postCount - a.postCount);

  return {
    platform: platform ?? "all",
    slots,
    totalPublished: filtered.length,
  };
}
