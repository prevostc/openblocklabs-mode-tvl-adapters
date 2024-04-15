import axios from "axios";
import { ethers } from "ethers";
import fs from "fs";
require("dotenv").config();

const GRAPHQL_API_URL = process.env.GRAPHQL_API_URL!;
const POOL_ADDRESS = process.env.POOL_ADDRESS!;
const PROVIDER_URL = process.env.PROVIDER_URL!;
const POOL_CURRENCY = process.env.POOL_CURRENCY!;

const contractABI = [
  "function getCurrencyBalance(address) view returns (uint256)",
];


const provider = new ethers.providers.JsonRpcProvider(PROVIDER_URL);
const contract = new ethers.Contract(POOL_ADDRESS, contractABI, provider);


interface Deposit {
  user: string;
}
interface UserStakes {
  [user: string]: {
    stake: ethers.BigNumber;
    rewardShare: string;
  };
}
async function fetchUniqueDepositors(): Promise<string[]> {
  const query = `
        query MyQuery {
            Deposits(filter: {currency: "${POOL_CURRENCY}"}) {
                user
            }
        }
    `;

  try {
    const response = await axios.post(GRAPHQL_API_URL, { query });
    const deposits: Deposit[] = response.data.data.Deposits;
    return Array.from(new Set(deposits.map((deposit) => deposit.user)));
  } catch (error) {
    console.error("Error fetching unique depositors:", error);
    return [];
  }
}

async function fetchActualDeposits() {
  const uniqueDepositors = await fetchUniqueDepositors();
  let totalStaked = ethers.BigNumber.from(0);
  const userStakes: {
    [user: string]: { stake: ethers.BigNumber; rewardShare: string };
  } = {};

  for (const user of uniqueDepositors) {
    try {
      const actualBalance = await contract.getCurrencyBalance(user);
      totalStaked = totalStaked.add(actualBalance);
      userStakes[user] = { stake: actualBalance, rewardShare: "" };
    } catch (error) {
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
      ethers.utils.formatUnits(userStakes[user].stake, 18),
    ]);
  }

  // Convert CSV data to string
  const csvString = csvData.map((row) => row.join(","  )).join("\n");

  // Write CSV data to file
  fs.writeFileSync("outputData.csv", csvString);

  console.log("CSV file generated successfully.");
}

fetchActualDeposits();