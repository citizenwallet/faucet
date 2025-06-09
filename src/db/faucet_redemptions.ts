import "server-only";

import { PostgrestSingleResponse, SupabaseClient } from "@supabase/supabase-js";

export interface FaucetRedemption {
  id: number;
  created_at: string;
  account: string;
  faucet_slug: string;
}

export async function getLastFaucetRedemptionForAccount(
  client: SupabaseClient,
  slug: string,
  account: string
): Promise<PostgrestSingleResponse<FaucetRedemption | null>> {
  return client
    .from("faucet_redemptions")
    .select("*")
    .eq("faucet_slug", slug)
    .eq("account", account)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
}

export async function createFaucetRedemption(
  client: SupabaseClient,
  slug: string,
  account: string
) {
  return client.from("faucet_redemptions").insert({
    faucet_slug: slug,
    account,
  });
}
