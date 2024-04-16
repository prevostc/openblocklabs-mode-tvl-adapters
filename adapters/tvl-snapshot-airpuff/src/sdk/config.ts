import { Token } from '../types';

export const enum CHAINS {
  MODE = 34443,
}
export const enum PROTOCOLS {
  AIRPUFF = 0,
}

export const enum AMM_TYPES {
  UNISWAPV3 = 0,
}

export const enum VAULTS {
  RENZO = 'renzoMode',
  RENZO1x = 'renzoMode1x',
}
export const enum LENDS {
  ETHLEND = 'ethlend'
}
export const SUBGRAPH_URLS = {
  [CHAINS.MODE]: {
    [PROTOCOLS.AIRPUFF]: {
      [AMM_TYPES.UNISWAPV3]:
        'https://api.goldsky.com/api/public/project_clmqdcfcs3f6d2ptj3yp05ndz/subgraphs/Algebra/0.0.1/gn',
    },
  },
};

export const VAULT_API_URLS = {
  [CHAINS.MODE]: {
    [PROTOCOLS.AIRPUFF]: {
      [VAULTS.RENZO]: 'https://api.airpuff.io/vault/userBalances/renzoMode',
      [VAULTS.RENZO1x]: 'https://api.airpuff.io/vault/userBalances/renzoMode1x',
      [LENDS.ETHLEND]: 'https://api.airpuff.io/lend/userBalances/ethMode',
    },
  },
};

export const LP_VAULT_MAP: { [key in  VAULTS | LENDS]:  Token } = {
  [VAULTS.RENZO]: 'ezETH',
  [VAULTS.RENZO1x]: 'ezETH',
  [LENDS.ETHLEND]: 'eth',
};

export const RPC_URLS = {
  [CHAINS.MODE]: 'https://rpc.goldsky.com',
};
