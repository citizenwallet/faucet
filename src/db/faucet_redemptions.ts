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
): Promise<PostgrestSingleResponse<FaucetRedemption>> {
  return client
    .from("faucet_redemptions")
    .select("*")
    .eq("faucet_slug", slug)
    .eq("account", account)
    .order("created_at", { ascending: false })
    .maybeSingle();
}
