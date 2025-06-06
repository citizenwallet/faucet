import {
  CommunityConfig,
  createInstanceCallData,
  instanceOwner,
  updateInstanceContractsCallData,
} from "@citizenwallet/sdk";
import { Wallet, ZeroAddress } from "ethers";
import { BundlerService, getAccountAddress } from "@citizenwallet/sdk";
import { getCommunityByAlias } from "@/db/communities";
import { getServiceRoleClient } from "@/db";

interface CommunityWithContracts {
  community: CommunityConfig;
  contracts: string[];
}

/**
 * This script is used to configure the card manager for the community.
 * It will create or update the card manager for the community.
 * It will also add the primary token and profile to the card manager.
 * It will also add the primary token and profile to the card manager.
 */
const main = async () => {
  const alias = process.argv[2];
  if (!alias) {
    throw new Error("Alias is required");
  }

  const client = getServiceRoleClient();

  const { data: communityData, error } = await getCommunityByAlias(
    client,
    alias
  );
  if (error || !communityData) {
    throw new Error("Error fetching community: " + error.message);
  }

  const { json } = communityData;

  const community = new CommunityConfig(json);

  const privateKey = process.env.FAUCET_PRIVATE_KEY;
  if (!privateKey) {
    throw new Error("FAUCET_PRIVATE_KEY is not set");
  }

  const signer = new Wallet(privateKey);

  const cardConfig = community.primarySafeCardConfig;

  const cardManagerMap: Record<string, CommunityWithContracts> = {};

  const cardManagerInstanceId = process.env.CARD_MANAGER_INSTANCE_ID;
  if (!cardManagerInstanceId) {
    throw new Error("CARD_MANAGER_INSTANCE_ID is not set");
  }

  const instance = `${cardConfig.chain_id}:${cardConfig.address}:${cardManagerInstanceId}`;

  if (!cardManagerMap[instance]) {
    const contracts: string[] = [];

    contracts.push(community.primaryToken.address);
    contracts.push(community.community.profile.address);

    cardManagerMap[instance] = {
      community,
      contracts,
    };
  }

  cardManagerMap[instance].contracts.push(community.primaryToken.address);
  cardManagerMap[instance].contracts.push(community.community.profile.address);

  console.log("creating,", Object.values(cardManagerMap).length, "instances");
  for (const communityMap of Object.values(cardManagerMap)) {
    const signerAccountAddress = await getAccountAddress(
      communityMap.community,
      signer.address
    );
    if (!signerAccountAddress) {
      throw new Error("Could not find an account for you!");
    }

    const bundler = new BundlerService(communityMap.community);
    const cardConfig = communityMap.community.primarySafeCardConfig;

    console.log("contracts", communityMap.contracts);

    const owner = await instanceOwner(
      communityMap.community,
      cardManagerInstanceId
    );
    if (owner === ZeroAddress) {
      const ccalldata = createInstanceCallData(
        communityMap.community,
        communityMap.contracts,
        cardManagerInstanceId
      );

      const hash = await bundler.call(
        signer,
        cardConfig.address,
        signerAccountAddress,
        ccalldata
      );

      console.log("submitted:", hash);

      await bundler.awaitSuccess(hash);

      console.log("Instance created");

      continue;
    }

    const calldata = updateInstanceContractsCallData(
      communityMap.community,
      communityMap.contracts,
      cardManagerInstanceId
    );

    const hash = await bundler.call(
      signer,
      cardConfig.address,
      signerAccountAddress,
      calldata
    );

    console.log("submitted:", hash);

    await bundler.awaitSuccess(hash);

    console.log("Instance updated");
  }
};

main();
