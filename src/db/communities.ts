import "server-only";

import {
  PostgrestResponse,
  PostgrestSingleResponse,
  SupabaseClient,
} from "@supabase/supabase-js";
import { Config } from "@citizenwallet/sdk";

export interface Community {
  alias: string;
  chain_id: number;
  json: Config;
  created_at: string;
  updated_at: string;
  active: boolean;
}

export async function getCommunityByAlias(
  client: SupabaseClient,
  alias: string
): Promise<PostgrestSingleResponse<Community>> {
  return client.from("communities").select("*").eq("alias", alias).single();
}

export async function getActiveCommunities(
  client: SupabaseClient
): Promise<PostgrestResponse<Community>> {
  return client.from("communities").select("*").eq("active", true);
}
