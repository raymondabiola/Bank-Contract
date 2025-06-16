# Bank Smart Contract

This project comprises of two connected contracts deployed on the sepoila Ethereum testnet: 

- **Bank Contract** – Takes care of user deposits, withdrawals and interest claims in sepolia ETH.
- **FeeCollector Contract** – The feeCollector contracts receives deposit fees from the Bank contract which is a source of interest payment.

> Both Contracts simulates a banking system where users can receive interests on their deposits.

---

## Features

**Ether deposits and withdrawal**
**Interest calculation and payout**
**DepositFee pool(feeCollector contract)**
**Pause/unpause transactions Bank administration**
**Access control Implementation with open-zeppelin (role based)**
**Reentrancy proof implemented with open-zeppelin reentrancy guard**
**Modular architeture with seperation of concerns**

## Quick Step by Step Guide

**install dependencies**
npm install

**Create a dot(.)env file in the root directory of your project to contain the following variables**
PRIVATE_KEY= owner_wallet_private_key
TEST_PRIVATE_KEY= test_wallet_1_private_key
TEST_PRIVATE_KEY2= test_wallet_2_private_key
INFURA_API_URL= https://sepolia.infura.io/v3/YOUR_INFURA_PROJECT_ID
BANK_CONTRACT_ADDRESS= deployed_bank_contract_address
FEE_COLLECTOR_CONTRACT_ADDRESS= deployed_fee_collector_contract_address

**Run Tests Command**
npx hardhat test

**Run Scripts Commands**
deposit 1 eth using test wallet 1
npx hardhat run scripts/deposit.ts test_wallet1_deposit 1

pause all ether related write transactions as the owner.
npx hardhat run scripts/admin.ts owner_pause_bank

## Contracts Overview
**Bank.sol**
Accepts deposits in ether
Deducts a defined fee percent and sneds it to the feeCollector contract
Tracks balances and deposit timestamps of users.
Distributes interest based on a defined APR.
Admins can do administrator duties such as:
Pause and unpause Bank
Assign role to subordinates
Revoke roles for subordinates
Renounce their roles
The Default Admin(owner) can change ownership to a new address.
Re-configure bank key parameters if they have such privileges

## FeeCollector.sol
Receives and holds ether
Can Send Interest to the Bank Contract for interest payouts
Admins have access for sensitive operations

## Built With
[Solidity](https://docs.soliditylang.org/en/v0.8.30/)
[Hardhat](https://hardhat.org/)
[TypeScript](https://www.typescriptlang.org/docs/)
[Openzeppelin](https://docs.openzeppelin.com/)

## Author
Built with by Raymond Abiola
Feel free to follow my Github account or fork this repo for learning and testing.

##License
MIT License