import { write } from 'fast-csv';
import csv from 'csv-parser';
import path from "path";
import fs from 'fs';

const V2_SUBGRAPH_URL = 'https://api.studio.thegraph.com/proxy/75376/balancer-mode-v2/version/latest';

interface PoolShare {
  id: string;
  userAddress: {
    id: string;
  };
  poolId: {
    address: string;
    totalShares: string;
    totalLiquidity: string;
  };
  balance: number;
}

interface CSVRow {
  user: string;
  pool: string;
  block: number;
  lpvalue: string;
}

export const getV2PoolSharesAtBlock = async (
  blockNumber: number
): Promise<PoolShare[]> => {
  const result: PoolShare[] = [];

  let latestId = '';
  let fetchNext = true;
  while (fetchNext) {
    const query = `
      query {
        poolShares(
          first: 1000,
          where: { id_gt: "${latestId}" },
          block: { number: ${blockNumber} }
        ) {
          id
          userAddress {
            id
          }
          poolId {
            address
            totalShares
            totalLiquidity
          }
          balance
        }
      }`;

    const response = await fetch(V2_SUBGRAPH_URL, {
      method: 'POST',
      body: JSON.stringify({ query }),
      headers: { 'Content-Type': 'application/json' },
    });

    const { data } = await response.json();

    const { poolShares } = data as { poolShares: PoolShare[] };

    for (const poolShare of poolShares) {
      result.push({
        id: poolShare.id,
        userAddress: poolShare.userAddress,
        poolId: poolShare.poolId,
        balance: poolShare.balance,
      });
    }

    if (poolShares.length < 1000) {
      fetchNext = false;
    } else {
      latestId = poolShares[poolShares.length - 1].id;
    }
  }

  return result;
};


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


const getData = async () => {
  const csvFilePath = path.resolve(__dirname, '../data/mode_balancer_hourly_blocks.csv');
  const snapshotBlocks = await readBlocksFromCSV(csvFilePath);

  const csvRows: CSVRow[] = [];

  for (let blockNumber of snapshotBlocks) {
    const poolShares = await getV2PoolSharesAtBlock(blockNumber);

    console.log(`Block: ${blockNumber}`);
    console.log("Positions: ", poolShares.length);

    for (const poolShare of poolShares) {
      // Some BPTs are minted to the zero address at pool creation, we should ignore them
      if (poolShare.userAddress.id === '0x0000000000000000000000000000000000000000') continue;

      const totalLiquidity = Number(poolShare.poolId.totalLiquidity);
      const totalShares = Number(poolShare.poolId.totalShares);
      const userShares = Number(poolShare.balance);

      const lpValue = (totalLiquidity * userShares / totalShares).toString();

      csvRows.push({
        user: poolShare.userAddress.id,
        pool: poolShare.poolId.address,
        block: blockNumber,
        lpvalue: lpValue,
      });
    }
  }

  // Write the CSV output to a file
  const outputPath = path.resolve(__dirname, '../data/mode_balancer_tvl_snapshot.csv');
  const ws = fs.createWriteStream(outputPath);
  write(csvRows, { headers: true }).pipe(ws).on('finish', () => {
    console.log("CSV file has been written.");
  });
};

getData().then(() => {
  console.log("Done");
});
