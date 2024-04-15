"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getLpTokenPrice = void 0;
async function getLpTokenPrice(chainId, vaultId) {
    let response = await fetch(`https://api.steer.finance/pool/lp/value?chain=${chainId}&address=${vaultId}`);
    let data = await response.json();
    // Access data property directly from response
    const pricePerLP = (data?.pricePerLP || 0);
    return pricePerLP;
}
exports.getLpTokenPrice = getLpTokenPrice;
