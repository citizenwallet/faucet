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
import {
  createFaucetRedemption,
  getLastFaucetRedemptionForAccount,
} from "@/db/faucet_redemptions";
import { formatCurrencyNumber } from "@/lib/currency";
import App from "./app";
import { notFound } from "next/navigation";

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
  const { account, sigAuthAccount, sigAuthRedirect } = await searchParams;

  const redirect = sigAuthRedirect ? `${sigAuthRedirect}/close` : undefined;

  const client = getServiceRoleClient();

  const { data: faucet, error } = await getFaucetBySlug(client, slug);
  if (error || !faucet) {
    notFound();
  }

  const destination = account ?? sigAuthAccount;
  if (!destination) {
    return <App alias={faucet.alias} slug={slug} />;
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
      <Redeem
        error="Something went wrong when contacting the server. Please try again."
        redirect={redirect}
      />
    );
  }

  if (lastRedemption !== null) {
    const secondsSinceLastRedemption = Math.floor(
      (Date.now() - new Date(lastRedemption.created_at).getTime()) / 1000
    );
    if (secondsSinceLastRedemption < faucet.frequency) {
      const remainingTime = faucet.frequency - secondsSinceLastRedemption;

      const redeemableDate = new Date(Date.now() + remainingTime * 1000);
      return (
        <Redeem
          error={`You have already redeemed this faucet recently. Please wait until ${redeemableDate.toLocaleString()} before redeeming again.`}
          redirect={redirect}
        />
      );
    }
  }

  const instance = process.env.CARD_MANAGER_INSTANCE_ID;
  if (!instance) {
    return (
      <Redeem error="Community is missing a card manager" redirect={redirect} />
    );
  }

  const privateKey = process.env.FAUCET_PRIVATE_KEY;
  if (!privateKey) {
    return (
      <Redeem
        error="Server is not configured with a private key"
        redirect={redirect}
      />
    );
  }

  const signer = new Wallet(privateKey);

  const signerAccountAddress = await getAccountAddress(
    community,
    signer.address
  );
  if (!signerAccountAddress) {
    return (
      <Redeem
        error="Server account not found. Something is wrong with the key or community file."
        redirect={redirect}
      />
    );
  }

  const faucetAccountHash = id(`${faucet.salt}`);

  const faucetAccount = await getCardAddress(
    community,
    faucetAccountHash,
    instance
  );
  if (!faucetAccount) {
    return (
      <Redeem
        error="Unable to determine account address of faucet."
        redirect={redirect}
      />
    );
  }

  const balance =
    (await getAccountBalance(community, faucetAccount)) ?? BigInt(0);
  if (!balance || balance === BigInt(0) || balance < BigInt(faucet.amount)) {
    return (
      <Redeem
        empty
        faucetAccount={faucetAccount}
        symbol={token.symbol}
        redirect={redirect}
      />
    );
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
    transferCalldata,
    instance
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

  try {
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
      throw new Error("No hash returned from bundler");
    }

    await bundler.awaitSuccess(hash);

    await createFaucetRedemption(client, slug, destination);
  } catch (error) {
    console.error(error);
    return (
      <Redeem
        error="There was an error redeeming from this faucet."
        redirect={redirect}
      />
    );
  }

  return (
    <Redeem
      faucet={faucet}
      currencyLogo={community.community.logo}
      symbol={token.symbol}
      decimals={token.decimals}
      redirect={redirect}
    />
  );
}
