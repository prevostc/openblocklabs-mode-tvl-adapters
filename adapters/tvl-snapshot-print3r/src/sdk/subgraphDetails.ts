import { CHAINS, PROTOCOLS, SUBGRAPH_URLS } from "./config";
import { Position } from "../types";

export const getLiquidityProviders = async () => {
  let subgraphUrl = SUBGRAPH_URLS[CHAINS.MODE][PROTOCOLS.PRINT3R][0];

  let skip = 0;
  let fetchNext = true;
  let liquidityProviders: Position[] = [];
  while (fetchNext) {
    const query = `{
    brrrStats(
        where: { period: hourly}
    ) {
      account
      mintAmount
      timestamp
    }   
    _meta {
        block {
            number
        }
    }
  }`;

    let response = await fetch(subgraphUrl, {
      method: "POST",
      body: JSON.stringify({ query }),
      headers: { "Content-Type": "application/json" },
    });

    let data: any = await response.json();

    const fetchedProviders = data.data.brrrStats || [];
    const blockNumber = data.data._meta.block.number;

    const validProviders = fetchedProviders.filter(
      (provider: any) =>
        BigInt(provider.mintAmount) > 0 &&
        provider.account.toLowerCase() !==
          "0x0000000000000000000000000000000000000000"
    );

    for (let provider of validProviders) {
      let transformedPosition: Position = {
        account: provider.account,
        amount: BigInt(provider.mintAmount),
        blockNumber: blockNumber,
      };
      liquidityProviders.push(transformedPosition);
    }

    if (liquidityProviders.length < 1000) {
      fetchNext = false;
    } else {
      skip += 1000;
    }
  }

  // Access data property directly from response

  return liquidityProviders;
};
