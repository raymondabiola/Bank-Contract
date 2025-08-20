# Bank Contract

This project comprises of two connected contracts deployed on the sepoila Ethereum testnet: 

- **Bank Contract** – Takes care of user deposits, withdrawals and interest claims in sepolia ETH.
- **FeeCollector Contract** – The feeCollector contracts receives deposit fees from the Bank contract, a source of interest payment.

> Both Contracts simulates a banking system where users can receive interests on their deposits.

---

## Features

- **Ether deposits and withdrawal** 
- **Interest calculation and payout** 
- **DepositFee pool(feeCollector contract)** 
- **Pause/unpause transactions Bank administration**
- **Access control Implementation with open-zeppelin (role based)** 
- **Reentrancy proof implemented with open-zeppelin reentrancy guard** 
- **Modular architeture with seperation of concerns**

## Quick Step by Step Guide

**install dependencies** <br>
```
$ npm install
```
**Create a dot(.)env file in the root directory of your project to contain the following variables**
- PRIVATE_KEY = owner_wallet_private_key
- TEST_PRIVATE_KEY = test_wallet_1_private_key
- TEST_PRIVATE_KEY2 = test_wallet_2_private_key
- INFURA_API_URL = https://sepolia.infura.io/v3/YOUR_INFURA_PROJECT_ID

### Run Tests Command 
```
$ npx hardhat test
```
### Run Interaction Scripts examples
<br>

**Administration Scripts Command Examples**
- Owner changes owner to test wallet 1 address
```
$ npx hardhat run scripts/admincontrol.ts change_owner
```
- owner Pauses the bank to freeze financial operations
```
$ npx hardhat run scripts/admincontrol.ts owner_pause_bank
```
- Owner unpauses the bank to resume financial operations
```
$ npx hardhat run scripts/admincontrol.ts owner_unpause_bank
```
- Assign role to test wallet 1 address using Owner wallet
```
$ npx hardhat run scripts/admincontrol.ts owner_assign_role_to_address
```
- Owner sets new interest rate for Bank contract
```
$ npx hardhat run scripts/admincontrol.ts owner_set_new_interest rate 5
```
- Owner set new dust threshold for Bank contract
```
$ npx hardhat run scripts/admincontrol.ts owner_set_new_dust_threshold 0.000002
```
- Owner set new dust threshold for fee collector contract
```
$ npx hardhat run scripts/admincontrol.ts owner_set_new_dust_threshold_fee_collector 0.000002
```
<br><br>

**Deposit Interaction script Commands Examples**
- deposit 1 eth using test wallet 1 
```
$ npx hardhat run scripts/deposit.ts test_wallet1_deposit 1 
```
- Deposit 3 eth using owner wallet
```
$ npx hardhat run scripts/deposit.ts owner_wallet_deposit 3
```
<br><br>

**Withdrawal Interaction Script Commands Examples**
- test wallet 1 withdraw 0.8 ether
```
$ npx hardhat run scripts/withdraw.ts test_wallet1_withdraw 0.8
```
- test wallet 2 withdraw all their balance
```
$ npx hardhat run scripts/withdraw.ts test_wallet2_withdrawAll
```
- withdrawal from fee collector contract by the owner
```
$ npx hardhat run scripts/withdraw.ts owner_wallet_withdraw_from_feeCollector 0.5
```
- emergency fee withdrawal from fee collector by the owner
```
$ npx hardhat run scripts/withdraw.ts owner_wallet_withdrawAll_from_feeCollector
```

## Contracts Overview
**Bank.sol**
- Accepts deposits in ether
- Deducts a defined fee percent and sneds it to the feeCollector contract
- Tracks balances and deposit timestamps of users.
- Distributes interest based on a defined APR.
- Admins can do administrator duties such as:
- Pause and unpause Bank
- Assign role to subordinates
- Revoke roles for subordinates
- Renounce their roles
- The Default Admin(owner) can change ownership to a new address.
- Re-configure bank key parameters if they have such privileges <br>

**FeeCollector.sol** <br>
- Receives and holds ether
- Can Send Interest to the Bank Contract for interest payouts
- Admins have access for sensitive operations

## Built With
[Solidity](https://docs.soliditylang.org/en/v0.8.30/) <br>
[Hardhat](https://hardhat.org/) <br>
[TypeScript](https://www.typescriptlang.org/docs/) <br>
[Openzeppelin](https://docs.openzeppelin.com/) <br>

## Author
Built with 🤍 by Raymond Abiola <br>
Feel free to [follow my Github account](https://github.com/raymondabiola) or fork this repo for learning and testing.
