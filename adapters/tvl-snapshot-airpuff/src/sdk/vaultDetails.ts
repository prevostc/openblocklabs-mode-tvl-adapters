import {
  CHAINS,
  LENDS,
  LP_VAULT_MAP,
  PROTOCOLS,
  VAULTS,
  VAULT_API_URLS,
} from './config';
import { getLpTokenPriceUSD } from './price';

export type Position = {
  user: string;
  vault: string;
  block: number;
  position: number;
  lpValue: number;
  lpValueUsd?: number;
};
export async function getAllPositionsAtBlock(
  protocol: PROTOCOLS,
  block: number
) {
  const renzo =
    (await getVaultPositionsAtBlock(protocol, VAULTS.RENZO, block)) ?? [];
  const renzo1x =
    (await getVaultPositionsAtBlock(protocol, VAULTS.RENZO1x, block)) ?? [];
  const ethLendMode =
    (await getLendPositionAtBlock(protocol, LENDS.ETHLEND, block)) ?? [];

  const result = [...renzo, ...renzo1x, ...ethLendMode];

  return result.sort((a, b) => {
    if (a.user === b.user) {
      return a.block - b.block;
    } else {
      return a.user.localeCompare(b.user);
    }
  });
}

export async function getVaultPositionsAtBlock(
  protocol: PROTOCOLS,
  vault: VAULTS,
  block: number
) {
  const url = VAULT_API_URLS[CHAINS.MODE][protocol][vault];
  const body = { blockNumber: block };
  const res = await fetch(url, {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  });
  const lpAsset = LP_VAULT_MAP[vault];
  const lpUsdValue = await getLpTokenPriceUSD(lpAsset, block);
  const data = await res.json();
  const positions: Position[] = data?.data;

  return positions.map((p) => ({
    ...p,
    lpValueUsd: p.lpValue * lpUsdValue,
  }));
}

export async function getLendPositionAtBlock(
  protocol: PROTOCOLS,
  lend: LENDS,
  block: number
) {
  const url = VAULT_API_URLS[CHAINS.MODE][protocol][lend];
  const body = { blockNumber: block };
  const res = await fetch(url, {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  });
  const lpAsset = LP_VAULT_MAP[lend];
  const data = await res.json();
  const positions: Position[] = data?.data;
  const lpUsdValue = await getLpTokenPriceUSD(lpAsset, block);

   return positions.map((p) => ({
    ...p,
    lpValueUsd: p.lpValue * lpUsdValue,
  }));
}
