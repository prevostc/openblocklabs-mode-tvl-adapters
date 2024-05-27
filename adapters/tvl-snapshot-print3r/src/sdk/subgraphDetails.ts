import { CHAINS, PROTOCOLS, SUBGRAPH_URLS } from "./config";
import { Position } from "../types";

export const getLiquidityProviders = async (block: number) => {
  let subgraphUrl = SUBGRAPH_URLS[CHAINS.MODE][PROTOCOLS.PRINT3R][0];

  let skip = 0;
  let fetchNext = true;
  let liquidityProviders: Position[] = [];
  while (fetchNext) {
    const query = `{
      brrrStats(
        where: { period: total, mintAmount_gt: "0", account_not: "0x0000000000000000000000000000000000000000" }
        first: 1000
        skip: ${skip}
      ) {
        blockNumber
        account
        mintAmount
      }
    }`;

    let response = await fetch(subgraphUrl, {
      method: "POST",
      body: JSON.stringify({ query }),
      headers: { "Content-Type": "application/json" },
    });

    let data: any = await response.json();

    const fetchedProviders = data.data.brrrStats || [];

    for (let provider of fetchedProviders) {
      console.log(
        "Provider Block Number:",
        provider.blockNumber,
        "Type:",
        typeof provider.blockNumber
      );
      let transformedPosition: Position = {
        account: provider.account,
        amount: BigInt(provider.mintAmount),
        blockNumber: parseInt(provider.blockNumber), // Convert to number
      };
      liquidityProviders.push(transformedPosition);
    }

    if (fetchedProviders.length < 1000) {
      fetchNext = false;
    } else {
      skip += 1000;
    }
  }

  console.log("Filtering by Block:", block, "Type:", typeof block);

  // Filter the results to only include positions with the specified block number
  const filteredProviders = liquidityProviders.filter(
    (provider) => provider.blockNumber === block
  );

  console.log("Filtered Providers:", filteredProviders);

  return filteredProviders;
};
