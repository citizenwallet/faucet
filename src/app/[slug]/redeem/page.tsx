import { getServiceRoleClient } from "@/db";
import { getFaucetBySlug } from "@/db/faucets";
import { Suspense } from "react";
import Redeem from "./redeem";
import { getCommunityByAlias } from "@/db/communities";
import {
  BundlerService,
  callOnCardCallData,
  CommunityConfig,
  getAccountAddress,
  getAccountBalance,
  getCardAddress,
  tokenTransferCallData,
  tokenTransferEventTopic,
  UserOpData,
  UserOpExtraData,
} from "@citizenwallet/sdk";
import { id, Wallet } from "ethers";
import { getLastFaucetRedemptionForAccount } from "@/db/faucet_redemptions";
import { formatCurrencyNumber } from "@/lib/currency";

export default function Page({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{
    account?: string;
    sigAuthAccount?: string;
    sigAuthExpiry?: string;
    sigAuthSignature?: string;
    sigAuthRedirect?: string;
  }>;
}) {
  return (
    <Suspense fallback={<Redeem loading />}>
      <RedeemPage params={params} searchParams={searchParams} />
    </Suspense>
  );
}

async function RedeemPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{
    account?: string;
    sigAuthAccount?: string;
    sigAuthExpiry?: string;
    sigAuthSignature?: string;
    sigAuthRedirect?: string;
  }>;
}) {
  const { slug } = await params;
  const {
    account,
    sigAuthAccount,
    sigAuthExpiry,
    sigAuthSignature,
    sigAuthRedirect,
  } = await searchParams;

  console.log("sigAuthAccount", sigAuthAccount);
  console.log("sigAuthExpiry", sigAuthExpiry);
  console.log("sigAuthSignature", sigAuthSignature);
  console.log("sigAuthRedirect", sigAuthRedirect);
  const destination = account ?? sigAuthAccount;
  if (!destination) {
    return <Redeem error="Please open this from Citizen Wallet" />;
  }

  const client = getServiceRoleClient();

  const { data: faucet, error } = await getFaucetBySlug(client, slug);
  if (error || !faucet) {
    return <Redeem error="Faucet not found" />;
  }

  const { data: config, error: configError } = await getCommunityByAlias(
    client,
    faucet.alias
  );
  if (configError || !config) {
    return <Redeem error="Community not found" />;
  }

  const community = new CommunityConfig(config.json);
  const token = community.primaryToken;
  const cardConfig = community.primarySafeCardConfig;

  const { data: lastRedemption, error: lastRedemptionError } =
    await getLastFaucetRedemptionForAccount(client, slug, destination);
  if (lastRedemptionError) {
    console.error(lastRedemptionError);
    return (
      <Redeem error="Something went wrong when contacting the server. Please try again." />
    );
  }

  if (lastRedemption !== null) {
    const secondsSinceLastRedemption = Math.floor(
      (Date.now() - new Date(lastRedemption.created_at).getTime()) / 1000
    );
    if (secondsSinceLastRedemption < faucet.frequency) {
      const remainingTime = faucet.frequency - secondsSinceLastRedemption;
      return (
        <Redeem
          error={`You have already redeemed this faucet recently. Please wait ${remainingTime} seconds before redeeming again.`}
        />
      );
    }
  }

  const cardManagerInstanceId = process.env.CARD_MANAGER_INSTANCE_ID;
  if (!cardManagerInstanceId) {
    return <Redeem error="Community is missing a card manager" />;
  }

  const instance = `${cardConfig.chain_id}:${cardConfig.address}:${cardManagerInstanceId}`;

  const privateKey = process.env.FAUCET_PRIVATE_KEY;
  if (!privateKey) {
    return <Redeem error="Server is not configured with a private key" />;
  }

  const signer = new Wallet(privateKey);

  const signerAccountAddress = await getAccountAddress(
    community,
    signer.address
  );
  console.log("signerAccountAddress", signerAccountAddress);
  if (!signerAccountAddress) {
    return (
      <Redeem error="Server account not found. Something is wrong with the key or community file." />
    );
  }

  const faucetAccountHash = id(`${slug}`);

  console.log("faucetAccountHash", faucetAccountHash);

  const faucetAccount = await getCardAddress(
    community,
    faucetAccountHash,
    instance
  );
  if (!faucetAccount) {
    return <Redeem error="Unable to determine account address of faucet." />;
  }

  const balance =
    (await getAccountBalance(community, faucetAccount)) ?? BigInt(0);
  if (!balance || balance === BigInt(0) || balance < BigInt(faucet.amount)) {
    return <Redeem empty faucetAccount={faucetAccount} symbol={token.symbol} />;
  }

  const bundler = new BundlerService(community);

  const transferCalldata = tokenTransferCallData(
    destination,
    BigInt(faucet.amount)
  );

  const calldata = callOnCardCallData(
    community,
    faucetAccountHash,
    token.address,
    BigInt(0),
    transferCalldata
  );

  const userOpData: UserOpData = {
    topic: tokenTransferEventTopic,
    from: faucetAccount,
    to: destination,
    value: BigInt(faucet.amount).toString(),
  };

  const extraData: UserOpExtraData = {
    description: `Redeemed ${formatCurrencyNumber(
      faucet.amount,
      token.decimals
    )} ${token.symbol} from ${faucet.title} faucet`,
  };

  const hash = await bundler.call(
    signer,
    cardConfig.address,
    signerAccountAddress,
    calldata,
    BigInt(0),
    userOpData,
    extraData
  );

  if (!hash) {
    return <Redeem error="There was an error redeeming from this faucet." />;
  }

  await bundler.awaitSuccess(hash);

  return (
    <Redeem
      faucet={faucet}
      currencyLogo={community.community.logo}
      symbol={token.symbol}
      decimals={token.decimals}
      redirect={sigAuthRedirect ? `${sigAuthRedirect}/close` : undefined}
    />
  );
}
