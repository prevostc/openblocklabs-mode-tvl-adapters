"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const axios_1 = __importDefault(require("axios"));
const ethers_1 = require("ethers");
const fs_1 = __importDefault(require("fs"));
require("dotenv").config();
const GRAPHQL_API_URL = process.env.GRAPHQL_API_URL;
const POOL_ADDRESS = process.env.POOL_ADDRESS;
const PROVIDER_URL = process.env.PROVIDER_URL;
const POOL_CURRENCY = process.env.POOL_CURRENCY;
const contractABI = [
    "function getCurrencyBalance(address) view returns (uint256)",
];
const provider = new ethers_1.ethers.providers.JsonRpcProvider(PROVIDER_URL);
const contract = new ethers_1.ethers.Contract(POOL_ADDRESS, contractABI, provider);
async function fetchUniqueDepositors() {
    const query = `
        query MyQuery {
            Deposits(filter: {currency: "${POOL_CURRENCY}"}) {
                user
            }
        }
    `;
    try {
        const response = await axios_1.default.post(GRAPHQL_API_URL, { query });
        const deposits = response.data.data.Deposits;
        return Array.from(new Set(deposits.map((deposit) => deposit.user)));
    }
    catch (error) {
        console.error("Error fetching unique depositors:", error);
        return [];
    }
}
async function fetchActualDeposits() {
    const uniqueDepositors = await fetchUniqueDepositors();
    let totalStaked = ethers_1.ethers.BigNumber.from(0);
    const userStakes = {};
    for (const user of uniqueDepositors) {
        try {
            const actualBalance = await contract.getCurrencyBalance(user);
            totalStaked = totalStaked.add(actualBalance);
            userStakes[user] = { stake: actualBalance, rewardShare: "" };
        }
        catch (error) {
            console.error(`Error fetching balance for ${user}:`, error);
        }
    }
    const currentBlockNumber = await provider.getBlockNumber();
    const currentTimestamp = Date.now();
    // Create CSV data
    const csvData = [
        ["User", "Pool", "Block", "Timestamp", "Staked"],
    ];
    for (const user in userStakes) {
        if (userStakes[user].stake.isZero()) {
            continue; // Skip to the next iteration if the stake is zero
        }
        csvData.push([
            user,
            POOL_ADDRESS,
            currentBlockNumber.toString(),
            currentTimestamp.toString(),
            ethers_1.ethers.utils.formatUnits(userStakes[user].stake, 18),
        ]);
    }
    // Convert CSV data to string
    const csvString = csvData.map((row) => row.join(",")).join("\n");
    // Write CSV data to file
    const ws = fs_1.default.createWriteStream("../../../data/mode_swapmode_tvl_snapshot.csv");
    fs_1.default.writeFileSync("../../../data/mode_unidex_tvl_snapshot.csv", csvString);
    console.log("CSV file generated successfully.");
}
fetchActualDeposits();
