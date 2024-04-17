import { GraphQLClient, gql } from "graphql-request";
import { BigNumber } from "bignumber.js";
import { join } from "path";
import { commify } from "ethers/lib/utils";
import { ethers } from "ethers";
import fs from "fs";
import * as path from "path";
import csv from 'csv-parser';

const createCsvWriter = require("csv-writer").createObjectCsvWriter;

const modeV2Client = new GraphQLClient(
  "https://api.goldsky.com/api/public/project_cltceeuudv1ij01x7ekxhfl46/subgraphs/swapmode-v2/1.0.4/gn"
);
const modeNFTPoolsClient = new GraphQLClient(
  "https://api.goldsky.com/api/public/project_cltceeuudv1ij01x7ekxhfl46/subgraphs/nft-pools-mode/prod/gn"
);
const provider = new ethers.providers.JsonRpcProvider("https://mainnet.mode.network/");

async function getBlockData(block: number) {
  try {
    // To filter pool addresses out of snapshot list
    const pools: any = await modeNFTPoolsClient.request(gql`
      query GetNFTPools {
        nftpools {
          id
        }
      }
    `);

    const nftPoolAddresses: string[] = pools.nftpools.map((p) => p.id);

    // Aggregate any needed "pages" from subgraph for the block
    // Max page size is 1000
    const fileData = [];

    const pageSize = 1000;
    let skip = 0;
    let moreToFetch = true;

    while (moreToFetch) {
      const [walletData, positionData]: [any, any] = await Promise.all([
        modeV2Client.request(gql`
        query UsersQuery {
          users(block: { number: ${block} }, first: ${pageSize}, skip: ${skip}) {
            id
            liquidityPositions {
              liquidityTokenBalance
              pair {
                id
                reserveUSD
                totalSupply
              }
            }
          }
        }
      `),
        modeNFTPoolsClient.request(gql`
        query UserPositionQuery {
          userTotalBalanceForPools(block: { number: ${block} }, first: ${pageSize}, skip: ${skip}) {
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
    `),
      ]);

      // If the max 1000 items are returned then there are more to fetch
      moreToFetch = walletData.users.length === pageSize;
      skip += pageSize;

      for (const user of walletData.users) {
        const userAddress = user.id;
        const userNftPoolPositions = positionData.userTotalBalanceForPools.filter((pos) => {
          return pos.user?.id === userAddress;
        });

        user.liquidityPositions.forEach((pos) => {
          // Link the V2 pool with the NFTPool lpToken
          const totalPositionsBalance =
            userNftPoolPositions.find((p) => p.pool.lpToken === pos.pair.id)?.balance || "0";

          const liquidityTokenBalance = new BigNumber(pos.liquidityTokenBalance).plus(
            totalPositionsBalance
          );
          const reserveUSD = new BigNumber(pos.pair.reserveUSD);
          const totalSupply = new BigNumber(pos.pair.totalSupply);
          const lpPrice = reserveUSD.div(totalSupply);

          const lpvalue = lpPrice.isFinite()
            ? liquidityTokenBalance.multipliedBy(lpPrice).toFixed(4)
            : "0";

          // console.log("liquidityTokenBalance", liquidityTokenBalance.toString());
          // console.log("totalPositionsBalance", totalPositionsBalance.toString());
          // console.log("reserveUSD", reserveUSD.toString());
          // console.log("lpPrice", lpPrice.toString());
          // console.log("lpvalue", lpvalue);

          if (
            user.id !== "0x0000000000000000000000000000000000000000" &&
            !nftPoolAddresses.includes(user.id)
          ) {
            fileData.push({
              user: userAddress,
              pool: pos.pair.id,
              block,
              lpvalue: commify(lpvalue),
            });
          }
        });
      }
    }

    return fileData;
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
export function sleepWaitPromise(milliseconds = 100, log = true) {
  if (log) {
    console.log(`sleepWaitPromise: waiting delay of ${milliseconds} ms...`);
  }

  return new Promise((res) => setTimeout(() => res(null), milliseconds));
}

async function run() {
  try {
    const nftPoolFactoryStartBlock = 3359145; // block first pool was created (subgraph first data block says 3_326_752)
    const v2FactoryBlock = 3326753; // V2 factory first pair creation block 3326753
    // Each block ~1 hour after the previous
    const csvFilePath = path.resolve(__dirname, '../../../../data/mode_swapmodev2_hourly_blocks.csv');
    const hourlyBlocks = await readBlocksFromCSV(csvFilePath);

    let fileData = [];
    for (const block of hourlyBlocks) {
      console.log(`Getting snapshot data for block (${block})`);
      const data = await getBlockData(block);
      await sleepWaitPromise();
      fileData = [...fileData, ...data];
    }

        // Write the CSV output to a file
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
