"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getLendPositionAtBlock = exports.getVaultPositionsAtBlock = exports.getAllPositionsAtBlock = void 0;
const config_1 = require("./config");
const price_1 = require("./price");
async function getAllPositionsAtBlock(protocol, block) {
    const renzo = (await getVaultPositionsAtBlock(protocol, "renzoMode" /* VAULTS.RENZO */, block)) ?? [];
    const renzo1x = (await getVaultPositionsAtBlock(protocol, "renzoMode1x" /* VAULTS.RENZO1x */, block)) ?? [];
    const ethLendMode = (await getLendPositionAtBlock(protocol, "ethlend" /* LENDS.ETHLEND */, block)) ?? [];
    const result = [...renzo, ...renzo1x, ...ethLendMode];
    return result.sort((a, b) => {
        if (a.user === b.user) {
            return a.block - b.block;
        }
        else {
            return a.user.localeCompare(b.user);
        }
    });
}
exports.getAllPositionsAtBlock = getAllPositionsAtBlock;
async function getVaultPositionsAtBlock(protocol, vault, block) {
    const url = config_1.VAULT_API_URLS[34443 /* CHAINS.MODE */][protocol][vault];
    const body = { blockNumber: block };
    const res = await fetch(url, {
        method: 'POST',
        body: JSON.stringify(body),
        headers: { 'Content-Type': 'application/json' },
    });
    const lpAsset = config_1.LP_VAULT_MAP[vault];
    const lpUsdValue = await (0, price_1.getLpTokenPriceUSD)(lpAsset, block);
    const data = await res.json();
    const positions = data?.data;
    return positions.map((p) => ({
        ...p,
        lpValueUsd: p.lpValue * lpUsdValue,
    }));
}
exports.getVaultPositionsAtBlock = getVaultPositionsAtBlock;
async function getLendPositionAtBlock(protocol, lend, block) {
    const url = config_1.VAULT_API_URLS[34443 /* CHAINS.MODE */][protocol][lend];
    const body = { blockNumber: block };
    const res = await fetch(url, {
        method: 'POST',
        body: JSON.stringify(body),
        headers: { 'Content-Type': 'application/json' },
    });
    const lpAsset = config_1.LP_VAULT_MAP[lend];
    const data = await res.json();
    const positions = data?.data;
    const lpUsdValue = await (0, price_1.getLpTokenPriceUSD)(lpAsset, block);
    return positions.map((p) => ({
        ...p,
        lpValueUsd: p.lpValue * lpUsdValue,
    }));
}
exports.getLendPositionAtBlock = getLendPositionAtBlock;
