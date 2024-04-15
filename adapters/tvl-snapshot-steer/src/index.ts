import * as path from "path";
import { CHAINS, PROTOCOLS } from "./sdk/config";
import { VaultPositions, getDepositorsForAddressByVaultAtBlock, getVaultPositions } from "./sdk/subgraphDetails";
(BigInt.prototype as any).toJSON = function () {
  return this.toString();
};

import { write } from 'fast-csv';
import fs from 'fs';
import csv from 'csv-parser';
import { getLpTokenPrice } from "./sdk/price";
import BigNumber from "bignumber.js";



interface CSVRow {
  user: string;
  vaultId: string;
  block: number;
  lpvalue_amount: string;
  poolId: string,
  positions: number,
  lpvalue: number
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

const getData = async () => {
  const csvFilePath = path.resolve(__dirname, '../../../../data/mode_steer_hourly_blocks.csv');
  const snapshotBlocks = await readBlocksFromCSV(csvFilePath); //await readBlocksFromCSV('src/sdk/mode_chain_daily_blocks.csv');
  
  let csvRows: CSVRow[] = [];

  for (let block of snapshotBlocks) {
    const depositors = await getDepositorsForAddressByVaultAtBlock(
      block, "", "", CHAINS.MODE, PROTOCOLS.STEER
    );

    console.log(`Block: ${block}`);
    console.log("Positions: ", depositors.length);


    const depositorsRow: CSVRow[] = depositors.map((depositor) => {
      return {
        user: depositor.account,
        vaultId: depositor.vault.id,
        poolId: depositor.vault.pool,
        block: block,
        lpvalue_amount: depositor.shares.toString()
      } as CSVRow
    });

    csvRows = csvRows.concat(depositorsRow);
  }   

  const vaultsPositions: {
    [key: string]: VaultPositions[]
  } = {};

  const lpTokenPrices: {
    [key: string]: number
  } = {};

  for (const csvRow of csvRows) {
    let vaultPositions = [];
    let lpPriceUsd = 0;

    if (vaultsPositions[csvRow.vaultId]) {
      vaultPositions = vaultsPositions[csvRow.vaultId];
    } else {
      vaultPositions = await getVaultPositions( CHAINS.MODE, PROTOCOLS.STEER, csvRow.vaultId)
      vaultsPositions[csvRow.vaultId] = vaultPositions;
    }

    if (lpTokenPrices[csvRow.vaultId]) {
      lpPriceUsd = lpTokenPrices[csvRow.vaultId];
    } else {
      lpPriceUsd = await getLpTokenPrice(
        CHAINS.MODE,
        csvRow.vaultId
      )
      lpTokenPrices[csvRow.vaultId] = lpPriceUsd;
    }

    const lpTokenEth = new BigNumber(csvRow.lpvalue_amount).div(10**18);  
    
    csvRow.lpvalue = lpPriceUsd * lpTokenEth.toNumber();
   
    csvRow.positions = vaultPositions.length > 0 ? vaultPositions[0].lowerTick.length: 0;
  }

  const csvOutPath = path.resolve(__dirname, "../../../data/mode_steer_tvl_snapshot.csv");
  const ws = fs.createWriteStream(csvOutPath);
  write(csvRows, { headers: true }).pipe(ws).on('finish', () => {
    console.log("CSV file has been written.");
  });
};

getData().then(() => {
  console.log("Done");
});
// getPrice(new BigNumber('1579427897588720602142863095414958'), 6, 18); //Uniswap
// getPrice(new BigNumber('3968729022398277600000000'), 18, 6); //SupSwap

