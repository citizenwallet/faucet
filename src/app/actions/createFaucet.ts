"use server";

import { getServiceRoleClient } from "@/db";
import { upsertFaucet } from "@/db/faucets";

export const createFaucetAction = async (
  slug: string,
  alias: string,
  title: string,
  description: string,
  amount: number,
  frequency: number
) => {
  const client = getServiceRoleClient();

  return upsertFaucet(
    client,
    slug,
    alias,
    title,
    description,
    amount,
    frequency
  );
};
