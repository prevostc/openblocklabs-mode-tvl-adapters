export const enum CHAINS{
    MODE = 34443,
}
export const enum PROTOCOLS{
    KIM = 0,
}

export const enum AMM_TYPES{
    KIM = 0,
}

export const SUBGRAPH_URLS = {
    [CHAINS.MODE]: {
        [PROTOCOLS.KIM]: {
            [AMM_TYPES.KIM]: "https://api.goldsky.com/api/public/project_clmqdcfcs3f6d2ptj3yp05ndz/subgraphs/Algebra-Kim/0.0.3/gn"
        }
    }
}
export const RPC_URLS = {
    [CHAINS.MODE]: "https://rpc.goldsky.com"
}