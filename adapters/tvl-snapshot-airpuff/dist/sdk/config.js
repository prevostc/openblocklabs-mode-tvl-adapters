"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RPC_URLS = exports.LP_VAULT_MAP = exports.VAULT_API_URLS = exports.SUBGRAPH_URLS = void 0;
exports.SUBGRAPH_URLS = {
    [34443 /* CHAINS.MODE */]: {
        [0 /* PROTOCOLS.AIRPUFF */]: {
            [0 /* AMM_TYPES.UNISWAPV3 */]: 'https://api.goldsky.com/api/public/project_clmqdcfcs3f6d2ptj3yp05ndz/subgraphs/Algebra/0.0.1/gn',
        },
    },
};
exports.VAULT_API_URLS = {
    [34443 /* CHAINS.MODE */]: {
        [0 /* PROTOCOLS.AIRPUFF */]: {
            ["renzoMode" /* VAULTS.RENZO */]: 'https://api.airpuff.io/vault/userBalances/renzoMode',
            ["renzoMode1x" /* VAULTS.RENZO1x */]: 'https://api.airpuff.io/vault/userBalances/renzoMode1x',
            ["ethlend" /* LENDS.ETHLEND */]: 'https://api.airpuff.io/lend/userBalances/ethMode',
        },
    },
};
exports.LP_VAULT_MAP = {
    ["renzoMode" /* VAULTS.RENZO */]: 'ezETH',
    ["renzoMode1x" /* VAULTS.RENZO1x */]: 'ezETH',
    ["ethlend" /* LENDS.ETHLEND */]: 'eth',
};
exports.RPC_URLS = {
    [34443 /* CHAINS.MODE */]: 'https://rpc.goldsky.com',
};
