import { GraphQLClient, gql } from "graphql-request";
import { BigNumber } from "bignumber.js";
import { ethers } from "ethers";
import fs from "fs";
import * as path from "path";
import csv from 'csv-parser';

const createCsvWriter = require("csv-writer").createObjectCsvWriter;

const modeV2Client = new GraphQLClient(
  "https://api.goldsky.com/api/public/project_cltceeuudv1ij01x7ekxhfl46/subgraphs/swapmode-v2/prod/gn"
);
const modeV3Client = new GraphQLClient(
  "https://api.goldsky.com/api/public/project_cltceeuudv1ij01x7ekxhfl46/subgraphs/swapmode-v3/prod/gn"
);
const modeNFTPoolsClient = new GraphQLClient(
  "https://api.goldsky.com/api/public/project_cltceeuudv1ij01x7ekxhfl46/subgraphs/nft-pools-mode/prod/gn"
);

const provider = new ethers.providers.JsonRpcProvider("https://mainnet.mode.network/");
const BN_ZERO = new BigNumber(0);
// TODO: add V3

const pools: {
  [pool: string]: {
    lpPrice: BigNumber;
    reserveUSD: BigNumber;
    totalSupply: BigNumber;
  };
} = {};
let nftPoolAddresses: string[];

// const them = ["0x78d42f467b225655ecc1cab6e19e0b901caae72c"];

function getLpInfo(user) {
  let totalWalletLpValue = BN_ZERO;

  user.liquidityPositions.forEach((pos) => {
    const lpPrice = pools[pos.pair.id]?.lpPrice || BN_ZERO;
    const positionBalance = new BigNumber(pos.liquidityTokenBalance);
    totalWalletLpValue = totalWalletLpValue.plus(positionBalance.multipliedBy(lpPrice));

    // if (them.includes(user.id)) {
    //   console.log(user.id);
    //   console.log(pos.pair);
    //   console.log(lpPrice.toString());
    //   console.log(totalWalletLpValue.toString());
    // }
  });

  return {
    user: user.id,
    totalWalletLpValue,
  };
}

function getNftInfo(userInfo) {
  const lpPrice = pools[userInfo.pool.lpToken].lpPrice;
  const totalNftPoolBalance = new BigNumber(userInfo.balance);
  const totalNftPoolValue = lpPrice.times(totalNftPoolBalance);

  if (!userInfo.pool) {
    console.log(userInfo);
  }

  return {
    pool: userInfo.pool.lpToken,
    totalNftPoolBalance: totalNftPoolBalance.toString(),
    totalNftPoolValue: totalNftPoolValue.toFixed(4),
  };
}

async function getUserWalletLps(block: number) {
  //  return readJSON(usersPath);

  // console.log("Fetching user wallet LP balances..");
  const pageSize = 1000;
  let skip = 0;
  let moreToFetch = true;

  let userData = [];

  while (moreToFetch) {
    const users: any = await modeV2Client.request(gql`
      query UsersQuery {
        users(
          block: { number: ${block} },
          first: ${pageSize},
          skip: ${skip},
          where: {
            liquidityPositions_ : {
              liquidityTokenBalance_gt: "0"
            }
          }) {
          id
          liquidityPositions {
            liquidityTokenBalance
            pair {
              id
              reserveUSD
              totalSupply
              reserve0
              reserve1
              token0 {
                id
                symbol
              }
              token1 {
                id
                symbol
              }
            }
          }
        }
      }`);

    // If the max 1000 items are returned then there are more to fetch
    moreToFetch = users.users.length === pageSize;
    skip += pageSize;

    userData = [...userData, ...users.users];
    // console.log(`${users.users.length} users`);

    await sleepWaitPromise();
  }

  console.log(`${userData.length} total users`);
  // await writeJSON(usersPath, userData);

  return userData;
}

async function getUserNFTPositionBalances(block: number) {
  // return readJSON(userPositionsPath);
  // console.log("Fetching user NFTPool balances..");
  const pageSize = 1000;
  let skip = 0;
  let moreToFetch = true;
  let userData = [];

  while (moreToFetch) {
    const positionData: any = await modeNFTPoolsClient.request(gql`
      query UserPositionQuery {
        userTotalBalanceForPools(
          block: { number: ${block} },
          first: ${pageSize},
          skip: ${skip},
          where: { balance_gt: "0" }
        ) {
          balance
          pool {
            id
            lpToken
          }
          user {
            id
          }
        }
      }
    `);
    moreToFetch = positionData.userTotalBalanceForPools.length === pageSize;
    skip += pageSize;
    console.log(`${positionData.userTotalBalanceForPools.length} user nft balances`);
    userData = [...userData, ...positionData.userTotalBalanceForPools];

    await sleepWaitPromise();
  }

  console.log(`${userData.length} total user position balances`);

  return userData;
}

// To filter pool addresses out of snapshot list
async function getNFTPoolAddresses() {
  const pools: any = await modeNFTPoolsClient.request(gql`
    query GetNFTPools {
      nftpools {
        id
      }
    }
  `);

  nftPoolAddresses = pools.nftpools.map((p) => p.id);
}

async function getBlockData(block: number) {
  try {
    const userWalletLps: any[] = await getUserWalletLps(block);
    let positions: any[] = await getUserNFTPositionBalances(block);

    positions = positions.filter((uw) => uw.user);

    let uniqueUserIds = [];

    for (const user of userWalletLps) {
      if (!uniqueUserIds.includes(user.id)) uniqueUserIds.push(user.id);

      // Set LP prices for NFTPool only snapshots to use
      user.liquidityPositions.forEach((lp) => {
        const pair = lp.pair;
        if (pools[pair.id]) return;

        const reserveUSD = new BigNumber(pair.reserveUSD);
        // if (reserveUSD.lt(1000)) continue;
        const totalSupply = new BigNumber(pair.totalSupply);
        const lpPrice = reserveUSD.div(totalSupply);

        pools[pair.id] = {
          lpPrice,
          reserveUSD,
          totalSupply,
        };
      });
    }

    for (const pos of positions) {
      if (!uniqueUserIds.includes(pos.user.id)) uniqueUserIds.push(pos.user.id);
    }

    const hasBoth = [];
    const lpOnly = [];
    const nftOnly = [];

    uniqueUserIds = uniqueUserIds.filter(
      (id) =>
        id !== "0x0000000000000000000000000000000000000000" &&
        id !== "0x000000000000000000000000000000000000dead" &&
        !nftPoolAddresses.includes(id)
    );

    for (const id of uniqueUserIds) {
      const lpMatch = userWalletLps.find((u) => u.id === id);
      const nftMatch = positions.find((p) => p.user.id === id);

      if (lpMatch && nftMatch) {
        hasBoth.push(id);
        continue;
      }

      if (lpMatch) {
        lpOnly.push(id);
        continue;
      }

      if (nftMatch) {
        nftOnly.push(id);
      }
    }

    const withData = [];

    for (const userId of hasBoth) {
      const lpMatch = userWalletLps.find((u) => u.id === userId);
      const nftMatch = positions.find((p) => p.user.id === userId);

      const { totalWalletLpValue } = getLpInfo(lpMatch);
      const { totalNftPoolBalance, totalNftPoolValue } = getNftInfo(nftMatch);

      const totalLpValue = totalWalletLpValue.plus(totalNftPoolValue);

      withData.push({
        user: userId,
        totalWalletLpValue: totalWalletLpValue.toFixed(4),
        totalNftPoolBalance,
        totalNftPoolValue,
        totalLpValue: totalLpValue.toFixed(4),
      });
    }

    for (const userId of lpOnly) {
      const lpMatch = userWalletLps.find((u) => u.id === userId);
      const { totalWalletLpValue } = getLpInfo(lpMatch);

      withData.push({
        user: userId,

        totalWalletLpValue: totalWalletLpValue.toFixed(4),
        totalNftPoolBalance: "0",
        totalNftPoolValue: "0",
        totalLpValue: totalWalletLpValue.toFixed(4),
      });
    }

    for (const userId of nftOnly) {
      const nftMatch = positions.find((p) => p.user.id === userId);
      const { totalNftPoolBalance, totalNftPoolValue, pool } = getNftInfo(nftMatch);

      withData.push({
        user: userId,
        pool,
        totalNftPoolBalance,
        totalNftPoolValue,
        totalLpValue: totalNftPoolValue,
      });
    }

    // await writeJSON(userDataPath, withData);

    return withData.map((d) => {
      return {
        user: d.user,
        pool: d.pool,
        lpvalue: d.totalLpValue,
        block,
      };
    });
  } catch (error) {
    console.error(error);
  }
}

const readBlocksFromCSV = async (filePath: string): Promise<number[]> => {
  return new Promise((resolve, reject) => {
    const blocks: number[] = [];

    fs.createReadStream(filePath)
      .pipe(csv())
      .on('data', (row) => {
        for (let key in row) {
          const blockNumber = parseInt(row[key]);
          if (!isNaN(blockNumber)) { // Ensure it's a valid number before pushing
            blocks.push(blockNumber);
          }
        }
      })
      .on('end', () => {
        console.log('CSV file successfully processed.');
        resolve(blocks); // Resolve the promise with the blocks array
      })
      .on('error', (error) => {
        reject(error); // Reject the promise if an error occurs
      });
  });
};

async function writeCSV(
  outputPath: string,
  headers: {
    id: string;
    title: string;
  }[],
  data: any[]
) {
  try {
    const csvWriter = createCsvWriter({
      path: outputPath,
      header: headers,
    });
    await csvWriter.writeRecords(data);
  } catch (error) {
    throw error;
  }
}


// Goldsky rate limit of 50 requests per 10 seconds (= 5 per second = 200ms delay. Using buffer with 300ms)
export function sleepWaitPromise(milliseconds = 500, log = true) {
  if (log) {
    console.log(`sleepWaitPromise: waiting delay of ${milliseconds} ms...`);
  }

  return new Promise((res) => setTimeout(() => res(null), milliseconds));
}

async function run() {
  try {
    await getNFTPoolAddresses();

    // const testBlock = 6599713; // 4/17 11:17am EST
    // const fileData = await getBlockData(testBlock);

    const csvFilePath = path.resolve(__dirname, '../../../../data/mode_swapmodev2_hourly_blocks.csv');
    const hourlyBlocks = await readBlocksFromCSV(csvFilePath);

    let fileData = [];
    for (const block of hourlyBlocks) {
      console.log(`Getting snapshot data for block (${block})`);
      const data = await getBlockData(block);
      await sleepWaitPromise();
      fileData = [...fileData, ...data];
    }

    const csvOutPath = path.resolve(__dirname, "../../../../data/mode_swapmodev2_tvl_snapshot.csv");
    const ws = fs.createWriteStream(csvOutPath);
    await writeCSV(
      csvOutPath,
      [
        { id: "user", title: "user" },
        { id: "pool", title: "pool" },
        { id: "block", title: "block" },
        { id: "lpvalue", title: "lpvalue" },
      ],
      fileData
    );

  } catch (error) {
    console.log(error);
  }
}

run();
