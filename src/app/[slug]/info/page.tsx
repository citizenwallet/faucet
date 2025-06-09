import { getServiceRoleClient } from "@/db";
import { getFaucetBySlug } from "@/db/faucets";
import { Suspense } from "react";
import QR from "./qr";
import { getCommunityByAlias } from "@/db/communities";
import {
  CommunityConfig,
  getAccountBalance,
  getCardAddress,
} from "@citizenwallet/sdk";
import { id } from "ethers";
import { formatCurrencyNumber } from "@/lib/currency";

export default function Page({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  return (
    <Suspense fallback={<QR loading />}>
      <InfoPage params={params} />
    </Suspense>
  );
}

async function InfoPage({ params }: { params: Promise<{ slug: string }> }) {
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

  const instance = process.env.CARD_MANAGER_INSTANCE_ID;
  if (!instance) {
    return <QR error="Community is missing a card manager" />;
  }

  const faucetAccountHash = id(`${faucet.salt}`);

  const faucetAccount = await getCardAddress(
    community,
    faucetAccountHash,
    instance
  );
  if (!faucetAccount) {
    return <QR error="Unable to determine account address of faucet." />;
  }

  const balance = await getAccountBalance(community, faucetAccount);
  const formattedBalance = formatCurrencyNumber(
    Number(balance),
    token.decimals
  );

  return (
    <QR
      faucet={faucet}
      config={config.json}
      faucetAccount={faucetAccount}
      currencyLogo={community.community.logo}
      symbol={token.symbol}
      decimals={token.decimals}
      balance={formattedBalance}
    />
  );
}
