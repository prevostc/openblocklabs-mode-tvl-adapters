import BigNumber from "bignumber.js";
import { AMM_TYPES, CHAINS, PROTOCOLS, SUBGRAPH_URLS } from "./config";
import { PositionMath } from "./utils/positionMath";

export interface Position{
    id: string;
    liquidity: string;
    owner: string;
    pool: {
        tick: number;
        id: string;
    };
    leftPt: number;
    rightPt: number;
    tokenX: {
        id: string;
        decimals: number;
        priceUSD: number;
        name: string;
        symbol: string;
    };
    tokenY: {
        id: string;
        decimals: number;
        priceUSD: number;
        name: string;
        symbol: string;
    }
};


export interface PositionWithUSDValue extends Position{
    token0USDValue: string;
    token1USDValue: string;
    token0AmountsInWei: bigint;
    token1AmountsInWei: bigint;
    token0DecimalValue: number;
    token1DecimalValue: number;
}

export interface UserPoolInfo {
    totalToken0: BigNumber;
    totalToken1: BigNumber;
    totalValue: BigNumber;
}
    
export const getPositionsForAddressByPoolAtBlock = async (
    blockNumber: number,
    address: string,
    poolId: string,
    chainId: CHAINS,
    protocol: PROTOCOLS,
    ammType: AMM_TYPES
): Promise<Position[]> => {
    let subgraphUrl = (SUBGRAPH_URLS as any)[chainId][protocol][ammType];
    let blockQuery = blockNumber !== 0 ? ` block: {number: ${blockNumber}}` : ``;
    let poolQuery = poolId !== "" ? ` pool_:{id: "${poolId.toLowerCase()}"}` : ``;
    let ownerQuery = address !== "" ? `owner: "${address.toLowerCase()}"` : ``;

    let whereQuery = ownerQuery !== "" && poolQuery !== "" ? `where: {${ownerQuery} , ${poolQuery}}` : ownerQuery !== "" ?`where: {${ownerQuery}}`: poolQuery !== "" ? `where: {${poolQuery}}`: ``;
    let lastTimestamp = 0;
    let fetchNext = true;
    let result: Position[] = [];
    while(fetchNext){
        let query = `{
            liquidities(${whereQuery} ${blockQuery} orderBy: transaction__timestamp, first:1000, where:{transaction_:{timestamp_gt:${lastTimestamp}}}) {
            id

                liquidity
                owner
                pool {
                    tick
                    id
                }
                leftPt
                rightPt
                tokenX {
                    id
                    decimals
                    priceUSD
                    name
                    symbol
                }
                tokenY {
                    id
                    decimals
                    priceUSD
                    name
                    symbol
                }
                transaction{
                    timestamp
                }
            },
            _meta{
                    block{
                    number
                }
            }
        }`;

       // console.log(query)

        let response = await fetch(subgraphUrl, {
            method: "POST",
            body: JSON.stringify({ query }),
            headers: { "Content-Type": "application/json" },
        });
        let data = await response.json();
        let positions = data.data.liquidities;
        for (let i = 0; i < positions.length; i++) {
            let position = positions[i];
            let transformedPosition: Position = {
                id: position.id,
                liquidity: position.liquidity,
                owner: position.owner,
                pool: {
                    tick: Number(position.pool.tick),
                    id: position.pool.id,
                },
                leftPt: position.leftPt,
                rightPt: position.rightPt,
                tokenX: {
                    id: position.tokenX.id,
                    decimals: position.tokenX.decimals,
                    priceUSD: position.tokenX.priceUSD,
                    name: position.tokenX.name,
                    symbol: position.tokenX.symbol,
                },
                tokenY: {
                    id: position.tokenY.id,
                    decimals: position.tokenY.decimals,
                    priceUSD: position.tokenY.priceUSD,
                    name: position.tokenY.name,
                    symbol: position.tokenY.symbol,
                },
            };
            result.push(transformedPosition);
            lastTimestamp = position.transaction.timestamp
            
        }
        if(positions.length < 1000){
            fetchNext = false;
        }
    }
    return result;
}


export const getPositionAtBlock = async (
    blockNumber: number,
    positionId: number,
    chainId: CHAINS,
    protocol: PROTOCOLS,
    ammType: AMM_TYPES
): Promise<Position> => {
    let subgraphUrl = (SUBGRAPH_URLS as any)[chainId][protocol][ammType];
    let blockQuery = blockNumber !== 0 ? `, block: {number: ${blockNumber}}` : ``;
    let query = `{
        position(id: "${positionId}" ${blockQuery}) {
            id
            pool {
                id
                tick
            }
            leftPt
            rightPt
            }
            liquidity
            tokenX {
                id
                decimals
                priceUSD
                name
                symbol
            }
            tokenY {
                id
                decimals
                priceUSD
                name
                symbol
            }
        },
        _meta{
                block{
                number
            }
        }
    }`;
    let response = await fetch(subgraphUrl, {
        method: "POST",
        body: JSON.stringify({ query }),
        headers: { "Content-Type": "application/json" },
    });
    let data = await response.json();
    let position = data.data.position;


    return  {
            id: position.id,
            liquidity: position.liquidity,
            owner: position.owner,
            pool: {
                tick: Number(position.pool.tick),
                id: position.pool.id,
            },
            leftPt: position.leftPt,
            rightPt: position.rightPt,
            tokenX: {
                id: position.tokenX.id,
                decimals: position.tokenX.decimals,
                priceUSD: position.tokenX.priceUSD,
                name: position.tokenX.name,
                symbol: position.tokenX.symbol,
            },
            tokenY: {
                id: position.tokenY.id,
                decimals: position.tokenY.decimals,
                priceUSD: position.tokenY.derivedUSD,
                name: position.tokenY.name,
                symbol: position.tokenY.symbol,
            },
        };

    // let tickLow = Number(position.tickLower.tickIdx);
    // let tickHigh = Number(position.tickUpper.tickIdx);
    // let liquidity = BigInt(position.liquidity);
    // let sqrtPriceX96 = BigInt(position.pool.sqrtPrice);
    // let tick = Number(position.pool.tick);
    // let decimal0 = position.token0.decimals;
    // let decimal1 = position.token1.decimals;
    // let token0DerivedUSD = position.token0.derivedUSD;
    // let token1DerivedUSD = position.token1.derivedUSD;
    // let token0AmountsInWei = PositionMath.getToken0Amount(tick, tickLow, tickHigh, sqrtPriceX96, liquidity);
    // let token1AmountsInWei = PositionMath.getToken1Amount(tick, tickLow, tickHigh, sqrtPriceX96, liquidity);
    

    // let token0DecimalValue = Number(token0AmountsInWei) / 10 ** decimal0;
    // let token1DecimalValue = Number(token1AmountsInWei) / 10 ** decimal1;
    
    // let token0UsdValue = BigNumber(token0AmountsInWei.toString()).multipliedBy(token0DerivedUSD).div(10 ** decimal0).toFixed(4);
    // let token1UsdValue = BigNumber(token1AmountsInWei.toString()).multipliedBy(token1DerivedUSD).div(10 ** decimal1).toFixed(4);


    // return [position.token0, position.token1,token0AmountsInWei, token1AmountsInWei, token0DecimalValue, token1DecimalValue,token0UsdValue, token1UsdValue,data.data._meta];
}

export const getPositionDetailsFromPosition =  (
    position: Position
):PositionWithUSDValue => {
    let leftPoint = position.leftPt;
    let rightPoint = position.rightPt;
    let liquidity = position.liquidity;
    let tick = Number(position.pool.tick);
    let decimalX = position.tokenX.decimals;
    let decimalY = position.tokenY.decimals;
    let tokenXDerivedUSD = position.tokenX.priceUSD;
    let tokenYDerivedUSD = position.tokenY.priceUSD;
    // let token0AmountsInWei = PositionMath.getToken0Amount(tick, tickLow, tickHigh, sqrtPriceX96, liquidity);
    // let token1AmountsInWei = PositionMath.getToken1Amount(tick, tickLow, tickHigh, sqrtPriceX96, liquidity);

    let amountResult = PositionMath.getLiquidityValue({liquidity, leftPoint, rightPoint, decimalX, decimalY}, tick)

    let token0AmountsInWei = BigInt(amountResult.amountX.toFixed())
    let token1AmountsInWei = BigInt(amountResult.amountY.toFixed())

    let token0DecimalValue = amountResult.amountXDecimal;
    let token1DecimalValue = amountResult.amountYDecimal;
    
    let token0UsdValue = BigNumber(token0DecimalValue.toString()).multipliedBy(tokenXDerivedUSD).toFixed(4);
    let token1UsdValue = BigNumber(token1DecimalValue.toString()).multipliedBy(tokenYDerivedUSD).toFixed(4);

    return {...position, token0USDValue: token0UsdValue, token1USDValue: token1UsdValue, token0AmountsInWei, token1AmountsInWei, token0DecimalValue, token1DecimalValue};

}

export const getLPValueByUserAndPoolFromPositions = (
    positions: Position[]
): Map<string, Map<string, UserPoolInfo>> => {
    let result = new Map<string, Map<string, UserPoolInfo>>();
    for (let i = 0; i < positions.length; i++) {
        let position = positions[i];
        let poolId = position.pool.id;
        let owner = position.owner;
        if (owner == '0x0000000000000000000000000000000000000000') continue;
        let userPositions = result.get(owner);
        if (userPositions === undefined) {
            userPositions = new Map<string, UserPoolInfo>();
            result.set(owner, userPositions);
        }
        let poolPositions = userPositions.get(poolId);
        if (poolPositions === undefined) {
            poolPositions = {totalToken0: BigNumber(0), totalToken1: BigNumber(0), totalValue: BigNumber(0)};
        }
        let positionWithUSDValue = getPositionDetailsFromPosition(position);
        poolPositions.totalToken0 = poolPositions.totalToken0.plus(BigNumber(positionWithUSDValue.token0DecimalValue));
        poolPositions.totalToken1 = poolPositions.totalToken1.plus(BigNumber(positionWithUSDValue.token1DecimalValue));
        poolPositions.totalValue = poolPositions.totalValue.plus(BigNumber(positionWithUSDValue.token0USDValue).plus(positionWithUSDValue.token1USDValue));
        userPositions.set(poolId, poolPositions);
    }
    return result;
}
