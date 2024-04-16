"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// import { getLPValueByUserAndPoolFromPositions, getPositionAtBlock, getPositionDetailsFromPosition, getPositionsForAddressByPoolAtBlock } from "./sdk/subgraphDetails";
BigInt.prototype.toJSON = function () {
    return this.toString();
};
const util_1 = require("util");
const stream_1 = __importDefault(require("stream"));
const csv_parser_1 = __importDefault(require("csv-parser"));
const fs_1 = __importDefault(require("fs"));
const fast_csv_1 = require("fast-csv");
const vaultDetails_1 = require("./sdk/vaultDetails");
const path_1 = __importDefault(require("path"));
const pipeline = (0, util_1.promisify)(stream_1.default.pipeline);
// Assuming you have the following functions and constants already defined
// getPositionsForAddressByPoolAtBlock, CHAINS, PROTOCOLS, AMM_TYPES, getPositionDetailsFromPosition, getLPValueByUserAndPoolFromPositions, BigNumber
const readBlocksFromCSV = async (filePath) => {
    return new Promise((resolve, reject) => {
        const blocks = [];
        fs_1.default.createReadStream(filePath)
            .pipe((0, csv_parser_1.default)())
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
    const csvFilePath = path_1.default.resolve(__dirname, '../../../../data/mode_airpuff_hourly_blocks.csv');
    const snapshotBlocks = await readBlocksFromCSV(csvFilePath);
    const csvRows = [];
    for (let block of snapshotBlocks) {
        const positions = await (0, vaultDetails_1.getAllPositionsAtBlock)(0 /* PROTOCOLS.AIRPUFF */, block);
        console.log(`Block: ${block}`);
        console.log('Positions: ', positions.length);
        const positionsRow = positions.map((p) => {
            return {
                user: p.user,
                vault: p.vault,
                block: block,
                position: p.position,
                lpvalue: p.lpValue,
                lpvalueusd: p.lpValueUsd,
            };
        });
        csvRows.push(...positionsRow);
        // // Assuming this part of the logic remains the same
        // let positionsWithUSDValue = positions.map(getPositionDetailsFromPosition);
        // let lpValueByUsers = getLPValueByUserAndPoolFromPositions(
        //   positionsWithUSDValue
        // );
        // lpValueByUsers.forEach((value, key) => {
        //   let positionIndex = 0; // Define how you track position index
        //   value.forEach((lpValue, poolKey) => {
        //     const lpValueStr = lpValue.toString();
        //     // Accumulate CSV row data
        //     csvRows.push({
        //       user: key,
        //       pool: poolKey,
        //       block,
        //       position: positions.length, // Adjust if you have a specific way to identify positions
        //       lpvalue: lpValueStr,
        //     });
        //   });
        // });
    }
    //Write the CSV output to a file
    const outputPath = path_1.default.resolve(__dirname, '../../../../data/mode_airpuff_tvl_snapshot.csv');
    const ws = fs_1.default.createWriteStream(outputPath);
    (0, fast_csv_1.write)(csvRows, { headers: true })
        .pipe(ws)
        .on('finish', () => {
        console.log('CSV file has been written.');
    });
};
getData().then(() => {
    console.log('Done');
});
// getPrice(new BigNumber('1579427897588720602142863095414958'), 6, 18); //Uniswap
// getPrice(new BigNumber('3968729022398277600000000'), 18, 6); //SupSwap
