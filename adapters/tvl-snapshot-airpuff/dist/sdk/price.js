"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getLpTokenPriceUSD = exports.getLpTokenPriceETH = void 0;
const constant_1 = require("../constant");
const config_1 = require("./config");
// export async function getLpTokenPrice(chainId: CHAINS, vaultId: string): Promise<number> {
//   let response = await fetch(`https://api.steer.finance/pool/lp/value?chain=${chainId}&address=${vaultId}`);
//   let data:any = await response.json();
//   // Access data property directly from response
//   const pricePerLP = (data?.pricePerLP || 0);
//   return pricePerLP;
// }
async function getLpTokenPriceETH(token, blockNumber) {
    const url = config_1.SUBGRAPH_URLS[34443 /* CHAINS.MODE */][0 /* PROTOCOLS.AIRPUFF */][0 /* AMM_TYPES.UNISWAPV3 */];
    const query = `{
        token(id: "${constant_1.addresses[token].toLowerCase()}", 
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
exports.getLpTokenPriceETH = getLpTokenPriceETH;
async function getLpTokenPriceUSD(token, blockNumber) {
    const tokenETHPrice = token != 'eth' ? await getLpTokenPriceETH(token, blockNumber) : 1;
    const usdtETHPrice = await getLpTokenPriceETH('usdt', blockNumber);
    return tokenETHPrice / usdtETHPrice;
}
exports.getLpTokenPriceUSD = getLpTokenPriceUSD;
