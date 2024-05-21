"use strict";
var __importDefault =
  (this && this.__importDefault) ||
  function (mod) {
    return mod && mod.__esModule ? mod : { default: mod };
  };
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
const csv_parser_1 = __importDefault(require("csv-parser"));
const path_1 = __importDefault(require("path"));
const fast_csv_1 = require("fast-csv");
const axios_1 = __importDefault(require("axios"));
const ethers_1 = require("ethers");
const ATLENDIS_API_URL = "https://atlendis.herokuapp.com/graphql";
const MODE_NETWORK_CHAIN_ID = 34443;
const MODE_NETWORK_URL = "https://mainnet.mode.network/";
const QUERY_FIRST = 100;
const readBlocksFromCSV = async (filePath) => {
  return new Promise((resolve, reject) => {
    const blocks = [];
    fs_1.default
      .createReadStream(filePath)
      .pipe((0, csv_parser_1.default)())
      .on("data", (row) => {
        for (let key in row) {
          const blockNumber = parseInt(row[key]);
          if (!isNaN(blockNumber)) {
            // Ensure it's a valid number before pushing
            blocks.push(blockNumber);
          }
        }
      })
      .on("end", () => {
        console.log("CSV file successfully processed.");
        resolve(blocks); // Resolve the promise with the blocks array
      })
      .on("error", (error) => {
        reject(error); // Reject the promise if an error occurs
      });
  });
};
async function mapBlockNumberToBlockTimestamp(blocks) {
  const modeJsonRcpProvider = new ethers_1.ethers.JsonRpcProvider(
    MODE_NETWORK_URL
  );
  const mappedBlocks = new Map();
  for (const blockNumber of blocks) {
    const block = await modeJsonRcpProvider.getBlock(blockNumber);
    if (!block)
      throw new Error(`Unable to retrieve block for : ${blockNumber}`);
    mappedBlocks.set(blockNumber, block.timestamp);
  }
  return mappedBlocks;
}
const positionHistoryQuery = `query LenderPositionHistoryOnMode($chainId: Int!, $end: Int!, $first: Int!, $skip: Int!) {
  positionHistory(
    where: {
      chainId: $chainId
      blockTimestamp_lte: $end
      type_in: [deposit, partialWithdrawal, withdrawal]
    }, 
    first: $first, 
    skip: $skip
  ) {
    blockNumber
    positionId
    lender
    metadata {
      instanceId
    }
    instanceToken {
      symbol 
      decimals 
      usdValue
    }
    depositAmount
    payload {
      ... on DepositPositionHistoryItemPayload {
        type
      }
      ... on WithdrawalPositionHistoryItemPayload {
        type
        receivedAmount
        fees
      }
    }
  }
}`;
async function getUsersPositionHistoryInModePools(timestamp, first, skip) {
  try {
    const response = await axios_1.default.post(ATLENDIS_API_URL, {
      query: positionHistoryQuery,
      variables: {
        chainId: MODE_NETWORK_CHAIN_ID,
        end: timestamp,
        first: first + 1,
        skip,
      },
    });
    const {
      data: { positionHistory },
    } = response.data;
    return {
      positionHistory,
      isDataFullyQueried: positionHistory.length <= first,
    };
  } catch (err) {
    console.log(err.stack);
    throw new Error("Something went wrong");
  }
}
async function fetchData(blockTimestamp) {
  let skip = 0;
  let usersPositionHistoryInModePools = [];
  const data = await getUsersPositionHistoryInModePools(
    blockTimestamp,
    QUERY_FIRST,
    skip
  );
  let isQueryingProcessOver = data.isDataFullyQueried;
  if (isQueryingProcessOver) {
    return data.positionHistory;
  } else {
    while (!isQueryingProcessOver) {
      skip = skip + QUERY_FIRST;
      const data = await getUsersPositionHistoryInModePools(
        blockTimestamp,
        QUERY_FIRST,
        skip
      );
      usersPositionHistoryInModePools = [
        ...usersPositionHistoryInModePools,
        ...data.positionHistory,
      ];
      isQueryingProcessOver = data.isDataFullyQueried;
    }
    return usersPositionHistoryInModePools;
  }
}
function computeBalanceFromAction(depositAmount, payload) {
  if (payload.type === "deposit") {
    return BigInt(depositAmount);
  }
  return (
    BigInt(depositAmount) -
    BigInt(payload.receivedAmount) -
    BigInt(payload.fees)
  );
}
function mapUsersBalances(targetedBlock, history) {
  const userBalancesMap = {};
  const filteredHistory = history.filter(
    (action) => action.blockNumber <= targetedBlock
  );
  for (const action of filteredHistory) {
    const user = action.lender;
    const pool = action.metadata.instanceId;
    const position = action.positionId;
    if (!userBalancesMap[user]) {
      userBalancesMap[user] = {
        [pool]: {
          [position]: {
            value: computeBalanceFromAction(
              action.depositAmount,
              action.payload
            ),
            token: { ...action.instanceToken },
          },
        },
      };
    } else {
      if (!userBalancesMap[user][pool]) {
        userBalancesMap[user][pool][position] = {
          value: computeBalanceFromAction(action.depositAmount, action.payload),
          token: { ...action.instanceToken },
        };
      } else {
        if (!userBalancesMap[user][pool][position]) {
          userBalancesMap[user][pool][position] = {
            value: computeBalanceFromAction(
              action.depositAmount,
              action.payload
            ),
            token: { ...action.instanceToken },
          };
        }
      }
    }
  }
  return userBalancesMap;
}
function aggregateBalancesPerUserPerPoolInUsd(balances) {
  const aggregatedBalances = {};
  for (const userAddress in balances) {
    const aggregatedBalancePerPoolInUsd = Object.entries(
      balances[userAddress]
    ).reduce((userPoolBalances, [pool, balances]) => {
      const poolBalance = Object.values(balances).reduce(
        (acc, positionBalance) => {
          const {
            value,
            token: { usdValue, decimals },
          } = positionBalance;
          return acc + (Number(value) / Math.pow(10, decimals)) * usdValue;
        },
        0
      );
      return { ...userPoolBalances, [pool]: poolBalance };
    }, {});
    aggregatedBalances[userAddress] = aggregatedBalancePerPoolInUsd;
  }
  return aggregatedBalances;
}
async function run() {
  const csvFilePath = path_1.default.resolve(
    __dirname,
    "./data/mode_atlendisv2_hourly_blocks.csv" // TO BE UPDATED
  );
  const snapshotBlocks = await readBlocksFromCSV(csvFilePath);
  const blockNumberToBlockTimestampMap =
    await mapBlockNumberToBlockTimestamp(snapshotBlocks);
  const latestBlockTimestamp = blockNumberToBlockTimestampMap.get(
    snapshotBlocks[snapshotBlocks.length - 1]
  );
  if (!latestBlockTimestamp) {
    throw new Error("Failed to retrieve last blocktimestamp");
  }
  const data = await fetchData(latestBlockTimestamp);
  const csvRows = [];
  for (let block of snapshotBlocks) {
    const balances = mapUsersBalances(block, data);
    const aggBalances = aggregateBalancesPerUserPerPoolInUsd(balances);
    const csvRowsForBlock = Object.entries(aggBalances).reduce(
      (acc, [user, balancePerPool]) => {
        const userRows = Object.entries(balancePerPool).map(
          ([pool, lpvalue]) => ({
            user,
            pool,
            block,
            lpvalue,
          })
        );
        return [...acc, ...userRows];
      },
      []
    );
    csvRows.push(...csvRowsForBlock);
  }
  // Write the CSV output to a file
  const outputPath = path_1.default.resolve(
    __dirname,
    "./data/mode_atlendisv2_tvl_snapshot.csv" // TO BE UPDATED
  );
  const ws = fs_1.default.createWriteStream(outputPath);
  (0, fast_csv_1.write)(csvRows, { headers: true })
    .pipe(ws)
    .on("finish", () => {
      console.log("CSV file has been written.");
    });
}
run();
