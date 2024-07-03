import { Hex, getContract } from "viem";
import { BeefyVault } from "../../vault/getBeefyVaultConfig";
import { BeefyViemClient } from "../../viemClient";
import { BeefyVaultBreakdown } from "../types";
import { BeefyVaultConcLiqAbi } from "../../../abi/BeefyVaultConcLiq";
import { BeefyClmStrategyAbi } from "../../../abi/BeefyClmStrategy";

export const getBeefyClmVaultBreakdown = async (
  client: BeefyViemClient,
  blockNumber: bigint,
  vault: BeefyVault
): Promise<BeefyVaultBreakdown> => {
  const managerContract = getContract({
    client,
    address: vault.vault_address,
    abi: BeefyVaultConcLiqAbi,
  });

  const strategyContract = getContract({
    client,
    address: vault.strategy_address,
    abi: BeefyClmStrategyAbi,
  });

  const [balances, vaultTotalSupply, wants, range, price] = await Promise.all([
    managerContract.read.balances({ blockNumber }),
    managerContract.read.totalSupply({ blockNumber }),
    managerContract.read.wants({ blockNumber }),
    strategyContract.read.range({ blockNumber }),
    strategyContract.read.price({ blockNumber }),
  ]);

  const isLiquidityInRange = price >= range[0] && price <= range[1];
  if (!isLiquidityInRange) {
    console.warn(
      `Beefy CLM Vault ${
        vault.vault_address
      } has liquidity out of range. Price: ${price}, Range: [${range.join(
        ";"
      )}]`
    );
  }

  return {
    vault,
    blockNumber,
    pairName: vault.vault_token_symbol,
    vaultTotalSupply,
    balances: [
      {
        tokenAddress: wants[0].toLocaleLowerCase() as Hex,
        vaultBalance: balances[0],
      },
      {
        tokenAddress: wants[1].toLocaleLowerCase() as Hex,
        vaultBalance: balances[1],
      },
    ],
  };
};
