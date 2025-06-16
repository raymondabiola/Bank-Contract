import {ethers} from "hardhat";
import * as dotenv from "dotenv";
import * as BankJson from "../artifacts/contracts/Bank.sol/Bank.json";
import * as FeeCollectorJson from "../artifacts/contracts/FeeCollector.sol/FeeCollector.json";
dotenv.config();

const{
  PRIVATE_KEY,
  TEST_PRIVATE_KEY,
  TEST_PRIVATE_KEY2,
  INFURA_API_URL,
  BANK_CONTRACT_ADDRESS,
  FEE_COLLECTOR_CONTRACT_ADDRESS
} = process.env;

if (!PRIVATE_KEY || !TEST_PRIVATE_KEY || !TEST_PRIVATE_KEY2 || INFURA_API_URL || BANK_CONTRACT_ADDRESS || FEE_COLLECTOR_CONTRACT_ADDRESS) {
  throw new Error("Missing required environment variables. Check the dot env file.");
}

async function main(){
// Read Script for interacting with the Bank and Fee Collector Contracts.

const command = process.argv[2];

// The API and Private keys should be specified in the dot env file.
const provider = new ethers.JsonRpcProvider(INFURA_API_URL);
const ownerWallet = new ethers.Wallet(PRIVATE_KEY!, provider);
const testWallet1 = new ethers.Wallet(TEST_PRIVATE_KEY!, provider);
const testWallet2 = new ethers.Wallet(TEST_PRIVATE_KEY2!, provider);

const feeCollectorAddress = FEE_COLLECTOR_CONTRACT_ADDRESS!;
const bankAddress = BANK_CONTRACT_ADDRESS!;

// Owner instance connection to the bank contract
const ownerWalletConnectBank = new ethers.Contract(bankAddress, BankJson.abi, ownerWallet);

// Test wallet1 instance connection to the Bank contract
const testWallet1ConnectBank = new ethers.Contract(bankAddress, BankJson.abi, testWallet1);

//  Test Wallet2 instance connection to the fee collector contract
const testWallet2ConnectFeeCollector = new ethers.Contract(feeCollectorAddress, FeeCollectorJson.abi, testWallet2);

console.log("Owner Address:", ownerWallet.address);
console.log("Test Wallet1 Address:", testWallet1.address);
console.log("Test Wallet2 Address:", testWallet2.address);

switch (command) {
case "owner_balance": {
const ownerBalance = await ownerWalletConnectBank.getMyBalance();
console.log("owner balance is", ethers.formatEther(ownerBalance));
break;
}

case "test-wallet1_balance": {
const testWallet1Balance = await testWallet1ConnectBank.getMyBalance();
console.log("test wallet1 balance is", ethers.formatEther(testWallet1Balance));
break;
}

case "test-wallet1_check_role_admin": {
const roleAdmin = await testWallet1ConnectBank.checkRoleAdmin(await testWallet1ConnectBank.ADMIN_ROLE());
console.log(`The admin of ADMIN_ROLE is ${roleAdmin}`);
break;
}

case "owner_check_wallet2_balance": {
const testWallet2Balance = await ownerWalletConnectBank.checkUserBalance(testWallet2.address);
console.log("test wallet2 balance is", ethers.formatEther(testWallet2Balance));
break;
}

// Read scripts for Fee Collector Contract
case "test_wallet2_read_parameters": {
console.log(`Bank Role of fee collector contract is ${await testWallet2ConnectFeeCollector.BANK_ROLE()}`);
console.log(`Default Admin Role of fee collector contract is ${await testWallet2ConnectFeeCollector.DEFAULT_ADMIN_ROLE()}`);
console.log(`Dust threshold of fe collector contract is ${await testWallet2ConnectFeeCollector.DUST_THRESHOLD()}`);
break;
}

default: {
  console.error("Unknown command. Please use any of the valid cases below:");
  console.error("owner_balance");
  console.error("test-wallet1_balance");
  console.error("test-wallet1_check_role_admin");
  console.error("owner_check_wallet2_balance");
  console.error("test_wallet2_read_parameters");
  console.error("Usage Example: npx hardhat run scripts/withdraw.ts <valid case>");
}
}
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});