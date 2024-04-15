"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const path = __importStar(require("path"));
const subgraphDetails_1 = require("./sdk/subgraphDetails");
BigInt.prototype.toJSON = function () {
    return this.toString();
};
const fast_csv_1 = require("fast-csv");
const fs_1 = __importDefault(require("fs"));
const csv_parser_1 = __importDefault(require("csv-parser"));
const price_1 = require("./sdk/price");
const bignumber_js_1 = __importDefault(require("bignumber.js"));
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
    const csvFilePath = path.resolve(__dirname, '../../../../data/mode_steer_hourly_blocks.csv');
    const snapshotBlocks = await readBlocksFromCSV(csvFilePath); //await readBlocksFromCSV('src/sdk/mode_chain_daily_blocks.csv');
    let csvRows = [];
    for (let block of snapshotBlocks) {
        const depositors = await (0, subgraphDetails_1.getDepositorsForAddressByVaultAtBlock)(block, "", "", 34443 /* CHAINS.MODE */, 0 /* PROTOCOLS.STEER */);
        console.log(`Block: ${block}`);
        console.log("Positions: ", depositors.length);
        const depositorsRow = depositors.map((depositor) => {
            return {
                user: depositor.account,
                vaultId: depositor.vault.id,
                poolId: depositor.vault.pool,
                block: block,
                lpvalue_amount: depositor.shares.toString()
            };
        });
        csvRows = csvRows.concat(depositorsRow);
    }
    const vaultsPositions = {};
    const lpTokenPrices = {};
    for (const csvRow of csvRows) {
        let vaultPositions = [];
        let lpPriceUsd = 0;
        if (vaultsPositions[csvRow.vaultId]) {
            vaultPositions = vaultsPositions[csvRow.vaultId];
        }
        else {
            vaultPositions = await (0, subgraphDetails_1.getVaultPositions)(34443 /* CHAINS.MODE */, 0 /* PROTOCOLS.STEER */, csvRow.vaultId);
            vaultsPositions[csvRow.vaultId] = vaultPositions;
        }
        if (lpTokenPrices[csvRow.vaultId]) {
            lpPriceUsd = lpTokenPrices[csvRow.vaultId];
        }
        else {
            lpPriceUsd = await (0, price_1.getLpTokenPrice)(34443 /* CHAINS.MODE */, csvRow.vaultId);
            lpTokenPrices[csvRow.vaultId] = lpPriceUsd;
        }
        const lpTokenEth = new bignumber_js_1.default(csvRow.lpvalue_amount).div(10 ** 18);
        csvRow.lpvalue = lpPriceUsd * lpTokenEth.toNumber();
        csvRow.positions = vaultPositions.length > 0 ? vaultPositions[0].lowerTick.length : 0;
    }
    const csvOutPath = path.resolve(__dirname, "../../../data/mode_steer_tvl_snapshot.csv");
    const ws = fs_1.default.createWriteStream(csvOutPath);
    (0, fast_csv_1.write)(csvRows, { headers: true }).pipe(ws).on('finish', () => {
        console.log("CSV file has been written.");
    });
};
getData().then(() => {
    console.log("Done");
});
// getPrice(new BigNumber('1579427897588720602142863095414958'), 6, 18); //Uniswap
// getPrice(new BigNumber('3968729022398277600000000'), 18, 6); //SupSwap
