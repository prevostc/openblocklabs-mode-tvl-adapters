import * as path from "path";
import { CHAINS, PROTOCOLS, AMM_TYPES } from "./sdk/config";
import { getLPValueByUserAndPoolFromPositions, getPositionAtBlock, getPositionDetailsFromPosition, getPositionsForAddressByPoolAtBlock } from "./sdk/subgraphDetails";
(BigInt.prototype as any).toJSON = function () {
  return this.toString();
};

import csv from 'csv-parser';
import fs from 'fs';

const { ParquetWriter, ParquetSchema } = require('parquetjs-lite');
//Uncomment the following lines to test the getPositionAtBlock function

// const position = getPositionAtBlock(
//         0, // block number 0 for latest block
//         2, // position id
//         CHAINS.MODE, // chain id
//         PROTOCOLS.SUPSWAP, // protocol
//         AMM_TYPES.UNISWAPV3 // amm type
//     );
// position.then((position) => {
//     // print response
//     const result = getPositionDetailsFromPosition(position);
//     console.log(`${JSON.stringify(result,null, 4)}
//     `)
// });

interface LPValueDetails {
  pool: string;
  lpValue: string;
}

interface UserLPData {
  totalLP: string;
  pools: LPValueDetails[];
}

// Define the schema for the Parquet file
const schema = new ParquetSchema({
  user: { type: 'UTF8' },
  pool: { type: 'UTF8' },
  pair_name: { type:  'UTF8'},
  block: { type: 'INT64' },
  position: { type: 'INT32' },
  token0_balance: { type: 'FLOAT' },
  token1_balance: { type: 'FLOAT' },
  lpvalue: { type: 'FLOAT' },
});

interface CSVRow {
  user: string;
  pool: string;
  pair_name: string;
  block: number;
  position: number;
  token0_balance: string;
  token1_balance: string;
  lpvalue: string;
}


// Assuming you have the following functions and constants already defined
// getPositionsForAddressByPoolAtBlock, CHAINS, PROTOCOLS, AMM_TYPES, getPositionDetailsFromPosition, getLPValueByUserAndPoolFromPositions, BigNumber

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
  const csvFilePath = path.resolve(__dirname, '../../../../data/mode_izumi_hourly_blocks.csv');
  const snapshotBlocks = await readBlocksFromCSV(csvFilePath);
  
  const csvRows: CSVRow[] = [];

  for (let block of snapshotBlocks) {
    const positions = await getPositionsForAddressByPoolAtBlock(
      block, "", "", CHAINS.MODE, PROTOCOLS.IZISWAP, AMM_TYPES.IZISWAP
    );

    console.log(`Block: ${block}`);
    console.log("Positions: ", positions.length);

    // Assuming this part of the logic remains the same
    let positionsWithUSDValue = positions.map(getPositionDetailsFromPosition);
    let lpValueByUsers = getLPValueByUserAndPoolFromPositions(positionsWithUSDValue);

    lpValueByUsers.forEach((value, key) => {
      let positionIndex = 0; // Define how you track position index
      value.forEach((lpValue, poolKey) => {
        // const lpValueStr = lpValue.toString();
        // Accumulate CSV row data
        csvRows.push({
          user: key,
          pool: poolKey,
          pair_name: lpValue.poolName,
          block,
          position: positions.length, // Adjust if you have a specific way to identify positions
          token0_balance: lpValue.totalToken0.toString(),
          token1_balance: lpValue.totalToken1.toString(),
          lpvalue: lpValue.totalValue.toString(),
        });
      });
    });
  }

  const outputPath = path.resolve(__dirname, '../../../../data/mode_izumi_tvl_snapshot.parquet');
  const writer = await ParquetWriter.openFile(schema, outputPath);

  for (let row of csvRows) {
    await writer.appendRow(row);
  }

  await writer.close();
  console.log("Parquet file has been written.");
};

getData().then(() => {
  console.log("Done");
});
// getPrice(new BigNumber('1579427897588720602142863095414958'), 6, 18); //Uniswap
// getPrice(new BigNumber('3968729022398277600000000'), 18, 6); //SupSwap

