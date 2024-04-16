# TVL by User - Mode Adapters - OpenBlock Labs

This repository aims to serve as a source for all adapters we use to fetch TVL by users for protocols on the Mode Chain. The goal is to simplify the process of adding new protocols, making data ingestion straightforward and thereby making the data available for the OpenBlock Labs team.

## How to add new adapters?

The process to add a new adapters is provide a script similar to what you can see here in the [adapter example](https://github.com/delta-hq/openblocklabs-mode-tvl-adapters/tree/main/adapters/example/). 

Here is a onboarding checklist:

1.  Set up a subquery indexer (e.g. Goldsky Subgraph)
    1.  Follow the docs here: https://docs.goldsky.com/guides/create-a-no-code-subgraph
    2. General Steps
        1.  create an account at app.goldsky.com
        2.  deploy a subgraph or migrate an existing subgraph - https://docs.goldsky.com/subgraphs/introduction
        3.  Use the slugs `mode-testnet` and `mode` when deploying the config
2.  Prepare Subquery query code according to the Data Requirement section below.
3.  Submit your response as a Pull Request to: https://github.com/delta-hq/openblocklabs-mode-tvl-adapters.git
    1.  Copy the `example` adapter and create a new one inside the `adapters` folder following this pattern: `tvl-snapshot-<protocol_name>`
    2.  Add in the script `index.ts` a function to read a CSV file with a block list, this [function](https://github.com/delta-hq/openblocklabs-mode-tvl-adapters/blob/main/adapters/example/src/index.ts#L52)
    3.  Add in the script `index.ts` the hourly blocks as input for the CSV function [example](https://github.com/delta-hq/openblocklabs-mode-tvl-adapters/blob/main/adapters/example/src/index.ts#L78)


### Data Requirements:
Goal: **Hourly snapshot of TVL by User by Asset**

For each protocol, we are looking for the following: 
1.  Query that fetches all relevant events required to calculate User TVL in the Protocol at hourly level.
2.  Code that uses the above query, fetches all the data and converts it to csv file in below given format.


### Output Data Schema

| Data Field                | Notes                                                                                  |
|---------------------------|----------------------------------------------------------------------------------------|
| user                      |                                                                                        |
| pool                      |                                                                                        |
| block                     |                                                                                        |
| lp_value                  | Converted to USD                                                                       |


Sample output:
```
user,pool,block,lpvalue
0xff...,0xeb4b0563aac65980245660496e76d03c90ad7b26,3330408,0.0
0xff...,0x04627b24ede101b0a92211a92f996eda3fa6cc75,3332208,1.0
0xff...,0x50273860341bb80de359cd391bef9b2eb228753c,3332208,1.92
0xff...,0xeb4b0563aac65980245660496e76d03c90ad7b26,3332208,0.0
```

### Notes

Once you provide the repository, we need to execute the following steps:
* Check if the repo is funcional, test it for small block list
* Check if the output is accordingly wwhat we need.