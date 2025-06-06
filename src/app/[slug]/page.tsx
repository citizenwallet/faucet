import { getServiceRoleClient } from "@/db";
import { getFaucetBySlug } from "@/db/faucets";
import { Suspense } from "react";
import QR from "./qr";
import { getCommunityByAlias } from "@/db/communities";
import { CommunityConfig } from "@citizenwallet/sdk";

export default function Page({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  return (
    <Suspense fallback={<QR loading />}>
      <RedeemPage params={params} />
    </Suspense>
  );
}

async function RedeemPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  const client = getServiceRoleClient();

  const { data: faucet, error } = await getFaucetBySlug(client, slug);
  if (error || !faucet) {
    return <QR error="Faucet not found" />;
  }

  const { data: config, error: configError } = await getCommunityByAlias(
    client,
    faucet.alias
  );
  if (configError || !config) {
    return <QR error="Community not found" />;
  }

  const community = new CommunityConfig(config.json);
  const token = community.primaryToken;

  return (
    <QR
      faucet={faucet}
      currencyLogo={community.community.logo}
      symbol={token.symbol}
      decimals={token.decimals}
    />
  );
}
