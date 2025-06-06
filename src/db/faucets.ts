import "server-only";

import { PostgrestSingleResponse, SupabaseClient } from "@supabase/supabase-js";

export interface Faucet {
  slug: string;
  created_at: string;
  alias: string;
  title: string;
  description: string;
  amount: number;
  frequency: number;
}

export async function getFaucetBySlug(
  client: SupabaseClient,
  slug: string
): Promise<PostgrestSingleResponse<Faucet>> {
  return client.from("faucets").select("*").eq("slug", slug).single();
}

export async function upsertFaucet(
  client: SupabaseClient,
  slug: string,
  alias: string,
  title: string,
  description: string,
  amount: number,
  frequency: number
): Promise<PostgrestSingleResponse<Faucet>> {
  return client
    .from("faucets")
    .upsert({ slug, alias, title, description, amount, frequency })
    .select()
    .single();
}
