import fs from "fs";
import path from "path";
import { promisify } from "util";
import stream from "stream";
import csv from "csv-parser";
import { format, write } from "fast-csv";
import { Position } from "./types";
import { calculateLpValue } from "./utils/price";
import { getLiquidityProviders } from "./sdk/subgraphDetails";
import { VAULT } from "./utils/constants";

interface CSVRow {
  user: string;
  pool: string;
  block: number;
  lpvalue: number;
}

const pipeline = promisify(stream.pipeline);

/**
 * ======================================== Test ========================================

 const testFetchingPositions = async () => {
   const positions = await getLiquidityProviders(); 
   const result: CSVRow[] = [];
   for (let position of positions) {
     const lpValue = await calculateLpValue(position.amount);
     result.push({
       user: position.account,
       pool: VAULT,
       block: position.blockNumber,
       lpvalue: lpValue,
     });
   }

   console.log(`${JSON.stringify(result, null, 4)}
     `);
 };

 testFetchingPositions().then(() => {
   console.log("Data processing complete.");
 });


 * ======================================================================================
 */

const convertPositionsToCsvRow = async (
  positions: Position[]
): Promise<CSVRow[]> => {
  const rows: CSVRow[] = [];

  for (let position of positions) {
    const lpValue = await calculateLpValue(position.amount);
    rows.push({
      user: position.account,
      pool: VAULT,
      block: position.blockNumber,
      lpvalue: lpValue,
    });
  }

  return rows;
};

const processData = async () => {
  const outputPath = path.resolve(
    __dirname,
    "../../../../data/tvl_hourly_snapshot.csv"
  );
  const ws = fs.createWriteStream(outputPath);
  const positions = await getLiquidityProviders(); // Fetch positions

  const csvRows = await convertPositionsToCsvRow(positions);

  write(csvRows, { headers: true })
    .pipe(ws)
    .on("finish", () => {
      console.log("CSV file has been written with hourly TVL snapshot.");
    });
};

processData().then(() => {
  console.log("Data processing complete.");
});
