"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDepositorsForAddressByVaultAtBlock = exports.getVaultPositions = void 0;
const config_1 = require("./config");
async function getVaultPositions(chainId, protocol, vaultId) {
    let subgraphUrl = config_1.SUBGRAPH_URLS[chainId][protocol];
    const query = `{
    vaultPositions(where:{vault: "${vaultId}"}, first: 1) {
        id
        vault {
          id
        }
        upperTick
        lowerTick
      }
    }
    `;
    let response = await fetch(subgraphUrl, {
        method: "POST",
        body: JSON.stringify({ query }),
        headers: { "Content-Type": "application/json" },
    });
    let data = await response.json();
    // Access data property directly from response
    let vaultPositions = (data.data.vaultPositions || []);
    return vaultPositions;
}
exports.getVaultPositions = getVaultPositions;
const getDepositorsForAddressByVaultAtBlock = async (blockNumber, address, vaultId, chainId, protocol) => {
    let subgraphUrl = config_1.SUBGRAPH_URLS[chainId][protocol];
    let blockQuery = blockNumber !== 0 ? ` block: {number: ${blockNumber}}` : ``;
    let poolQuery = vaultId !== "" ? ` vault_:{id: "${vaultId.toLowerCase()}"}` : ``;
    let ownerQuery = address !== "" ? `account: "${address.toLowerCase()}"` : ``;
    let whereQuery = ownerQuery !== "" && poolQuery !== ""
        ? `where: {${ownerQuery} , ${poolQuery}}`
        : ownerQuery !== ""
            ? `where: {${ownerQuery}}`
            : poolQuery !== ""
                ? `where: {${poolQuery}}`
                : ``;
    let skip = 0;
    let fetchNext = true;
    let result = [];
    while (fetchNext) {
        let query = `{
        vaultDeposits(${whereQuery} ${blockQuery} orderBy: timeStamp, first:1000,skip:${skip}) {
                id
                shares
                sender
                vault {
                  id
                  pool
                }
                blockNumber
            }
        }`;
        // console.log(query);
        let response = await fetch(subgraphUrl, {
            method: "POST",
            body: JSON.stringify({ query }),
            headers: { "Content-Type": "application/json" },
        });
        let data = await response.json();
        let depositors = data.data.vaultDeposits || [];
        for (let i = 0; i < depositors.length; i++) {
            let depositor = depositors[i];
            let transformedPosition = {
                id: depositor.id,
                shares: BigInt(depositor.shares),
                account: depositor.sender,
                vault: {
                    id: depositor.vault.id,
                    pool: depositor.vault.pool,
                },
                blockNumber: depositor.blockNumber,
            };
            result.push(transformedPosition);
        }
        if (depositors.length < 1000) {
            fetchNext = false;
        }
        else {
            skip += 1000;
        }
    }
    return result;
};
exports.getDepositorsForAddressByVaultAtBlock = getDepositorsForAddressByVaultAtBlock;
