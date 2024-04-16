import { addresses } from '../constant';
import { Token } from '../types';
import { AMM_TYPES, CHAINS, PROTOCOLS, SUBGRAPH_URLS } from './config';

// export async function getLpTokenPrice(chainId: CHAINS, vaultId: string): Promise<number> {

//   let response = await fetch(`https://api.steer.finance/pool/lp/value?chain=${chainId}&address=${vaultId}`);
//   let data:any = await response.json();

//   // Access data property directly from response
//   const pricePerLP = (data?.pricePerLP || 0);

//   return pricePerLP;
// }

export async function getLpTokenPriceETH(token: Token, blockNumber: number) {
  const url =
    SUBGRAPH_URLS[CHAINS.MODE][PROTOCOLS.AIRPUFF][AMM_TYPES.UNISWAPV3];
  const query = `{
        token(id: "${addresses[token].toLowerCase()}", 
          block: {number: ${blockNumber}}) {
          id
          symbol
          name
          decimals
          derivedMatic
        }
      }`;
  const res = await fetch(url, {
    method: 'POST',
    body: JSON.stringify({ query }),
    headers: { 'Content-Type': 'application/json' },
  });
  
  const data = await res.json();
  const derivedMatic = data?.data?.token?.derivedMatic;
  return derivedMatic;
}

export async function getLpTokenPriceUSD(token: Token, blockNumber: number) {
    const tokenETHPrice = token != 'eth' ? await getLpTokenPriceETH(token,blockNumber) : 1
    const usdtETHPrice = await getLpTokenPriceETH('usdt',blockNumber)
    
    return tokenETHPrice /  usdtETHPrice
}   