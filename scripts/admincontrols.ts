import {ethers} from "hardhat";
import * as dotenv from "dotenv";
import * as BankJson from "../artifacts/contracts/Bank.sol/Bank.json";
import * as FeeCollectorJson from "../artifacts/contracts/FeeCollector.sol/FeeCollector.json";
import fs from "fs";
dotenv.config();

const{
  PRIVATE_KEY,
  TEST_PRIVATE_KEY,
  TEST_PRIVATE_KEY2,
  INFURA_API_URL
} = process.env;

if (!PRIVATE_KEY || !TEST_PRIVATE_KEY || !TEST_PRIVATE_KEY2 || !INFURA_API_URL) {
  throw new Error("Missing required environment variables. Check the dot env file.");
}

async function main(){
  // Admin Control script to interact with the Bank and Fee Collector contract.

  const command = process.argv[2];
  const argAmount = process.argv[3];
  
// The API and Private keys should be specified in the dot env file.
const provider = new ethers.JsonRpcProvider(INFURA_API_URL);
const ownerWallet = new ethers.Wallet(PRIVATE_KEY!, provider);
const testWallet1 = new ethers.Wallet(TEST_PRIVATE_KEY!, provider);
const testWallet2 = new ethers.Wallet(TEST_PRIVATE_KEY2!, provider);

const deployments = JSON.parse(fs.readFileSync("deployments.json", "utf8"));
const bankAddress = deployments["sepolia"]["Bank"];
const feeCollectorAddress = deployments["sepolia"]["FeeCollector"];

// Owner instance connection to the bank contract
const ownerWalletConnectBank = new ethers.Contract(bankAddress, BankJson.abi, ownerWallet);

// Test wallet instance connection to the Bank contract
const testWallet1ConnectBank = new ethers.Contract(bankAddress, BankJson.abi, testWallet1);

// Owner instance connection to the fee collector contract
const ownerWalletConnectFeeCollector = new ethers.Contract(feeCollectorAddress, FeeCollectorJson.abi, ownerWallet);

console.log("Owner Address:", ownerWallet.address);
console.log("Test Wallet1 Address:", testWallet1.address);
console.log("Test Wallet2 Address:", testWallet2.address);

switch (command) {
  case "change_owner": {
// Dangerous write function. owner should be sure before calling it. it changes owner to another address
const tx = await ownerWalletConnectBank.changeOwner(testWallet1.address);
console.log("The owner of this contract has initiated a transaction to change the owner to a new address");
await tx.wait();
console.log(`The new owner of this contract is ${testWallet1.address}`);
break;
  }

case "owner_pause_bank": {
const tx = await ownerWalletConnectBank.pause();
await tx.wait();
console.log("Bank is paused by the owner. Deposit and withdrawal operations are frozen.");
break;
}

case "owner_unpause_bank": {
const tx = await ownerWalletConnectBank.unPause();
await tx.wait();
console.log("Bank is unpaused by owner. Deposit and withdrawal operations have resumed.");
break;
}

case "owner_assign_role_to_address": {
const tx = await ownerWalletConnectBank.assignRoleToAddress(await ownerWalletConnectBank.BANK_OPERATOR_ROLE(), testWallet1.address);
await tx.wait();
console.log(`testWallet1 address ${testWallet1.address} now has the BANK_OPERATOR_ROLE`);
break;
}

case "owner_assign_roleAdmin_to_role": {
const tx = await ownerWalletConnectBank.setRoleAdmin(await ownerWalletConnectBank.BANK_OPERATOR_ROLE(), await ownerWalletConnectBank.OPERATOR_MANAGER_ROLE());
await tx.wait();
console.log("OPERATOR_MANAGER_ROLE is now the admin of BANK_OPERATOR_ROLE");
break;
}

case "owner_revoke_role_for_address": {
const tx = await ownerWalletConnectBank.revokeRoleFromAddress(await ownerWalletConnectBank.BANK_OPERATOR_ROLE(), testWallet1.address);
await tx.wait();
console.log(`hasrole(BANK_OPERATOR_ROLE, test Wallet) is ${await ownerWalletConnectBank.hasRole(await ownerWalletConnectBank.BANK_OPERATOR_ROLE(), testWallet1.address)}`);
break;
}

case "test_wallet_renounceRole": {
const tx = await testWallet1ConnectBank.renounceMyRole(await testWallet1ConnectBank.BANK_OPERATOR_ROLE());
await tx.wait();
console.log(`hasrole(BANK_OPERATOR_ROLE, test Wallet) is ${await ownerWalletConnectBank.hasRole(await ownerWalletConnectBank.BANK_OPERATOR_ROLE(), testWallet1.address)}`);
break;
}

case "owner_set_new_interest_rate": {
  if(!argAmount){
  console.error("Please enter a valid amount. Example 5");
  process.exit(1);
}
if (isNaN(Number(argAmount))) {
  console.error("Amount must be a valid number.");
  process.exit(1);
}
const newInterestRate = BigInt(argAmount);
const tx = await ownerWalletConnectBank.setNewInterestRate(newInterestRate);
console.log("New interest rate of Bank is being set");
await tx.wait();
console.log(`Interest Rate of Bank has been changed to ${await ownerWalletConnectBank.interestRatePerAnnum()}`);
break;
}

case "owner_set_new_deposit_fee_percent": {
  if(!argAmount){
  console.error("Please enter a valid amount. Example 4");
  process.exit(1);
}
if (isNaN(Number(argAmount))) {
  console.error("Amount must be a valid number.");
  process.exit(1);
}
const newDepositFeePercent = BigInt(argAmount);
const tx = await ownerWalletConnectBank.setNewDepositFeePercent(newDepositFeePercent);
console.log("New deposit fee of Bank is being set");
await tx.wait();
console.log(`Deposit fee Percent of Bank has been changed to ${await ownerWalletConnectBank.depositFeePercent()}`);
break;
}

case "owner_set_new_dust_threshold": {
if(!argAmount){
  console.error("Please enter a valid minimum amount in ETH. Example 0.000002");
  process.exit(1);
}
if (isNaN(Number(argAmount))) {
  console.error("Amount must be a valid number.");
  process.exit(1);
}
const newDustThreshold = ethers.parseEther(argAmount);
const tx = await ownerWalletConnectBank.setNewDustThreshold(newDustThreshold);
console.log("New dust threshold of Bank is being set");
await tx.wait();
console.log(`Dust threshold of Bank has been changed to ${await ownerWalletConnectBank.DUST_THRESHOLD()}`);
break;
}

// Administration Scripts for FeeCollector Contract
case "owner_set_new_dust_threshold_fee_collector": {
  if(!argAmount){
  console.error("Please enter a valid minimum amount in ETH. Example 0.000002");
  process.exit(1);
}
if (isNaN(Number(argAmount))) {
  console.error("Amount must be a valid number.");
  process.exit(1);
}
const newDustThreshold = ethers.parseEther(argAmount);
const tx = await ownerWalletConnectFeeCollector.setNewDustThreshold(newDustThreshold);
console.log("New dust threshold is being set for Fee Collector contract");
await tx.wait();
console.log(`Dust threshold of Fee Collector Contract has been changed to ${await ownerWalletConnectFeeCollector.DUST_THRESHOLD()}`);
break;
}
default: {
  console.error("Unknown command. Please use one of the valid commands below:") ;
  console.error("change_owner");
  console.error("owner_pause_bank");
  console.error("owner_unpause_bank");
  console.error("owner_assign_role_to_address");
  console.error("owner_assign_roleAdmin_to_role");
  console.error("owner_revoke_role_for_address");
  console.error("test_wallet_renounceRole");
  console.error("owner_set_new_interest_rate");
  console.error("owner_set_new_deposit_fee_percent");
  console.error("owner_set_new_dust_threshold");
  console.error("owner_set_new_dust_threshold_fee_collector");
  console.error("Usage Example: npx hardhat run scripts/admincontrol.ts <valid case>");
}
}
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
