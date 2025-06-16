import {ethers} from "hardhat";
import * as dotenv from "dotenv";
import * as BankJson from "../artifacts/contracts/Bank.sol/Bank.json";
dotenv.config();

const{
  PRIVATE_KEY,
  TEST_PRIVATE_KEY,
  TEST_PRIVATE_KEY2,
  INFURA_API_URL,
  BANK_CONTRACT_ADDRESS,
} = process.env;

if (!PRIVATE_KEY || !TEST_PRIVATE_KEY || !TEST_PRIVATE_KEY2 || !INFURA_API_URL || !BANK_CONTRACT_ADDRESS) {
  throw new Error("Missing required environment variables. Check the dot env file.");
}


async function main(){
  // Deposit script to interact with the Bank contract.
  const command = process.argv[2];
  const argAmount = process.argv[3];

// The API and Private keys should be specified in the dot env file.
const provider = new ethers.JsonRpcProvider(INFURA_API_URL);
const ownerWallet = new ethers.Wallet(PRIVATE_KEY!, provider);
const testWallet1 = new ethers.Wallet(TEST_PRIVATE_KEY!, provider);
const testWallet2 = new ethers.Wallet(TEST_PRIVATE_KEY2!, provider);

const bankAddress = BANK_CONTRACT_ADDRESS!;

// Owner instance connection to the bank contract
const ownerWalletConnectBank = new ethers.Contract(bankAddress, BankJson.abi, ownerWallet);

// Test wallet instance connection to the Bank contract
const testWallet1ConnectBank = new ethers.Contract(bankAddress, BankJson.abi, testWallet1);

console.log("Owner Address:", ownerWallet.address);
console.log("Test Wallet1 Address:", testWallet1.address);
console.log("Test Wallet2 Address:", testWallet2.address);

switch (command){
//Uncomment this part if you want owner to deposit.
case "owner_wallet_deposit": {
  if(!argAmount){
    console.error("Please enter an amount of ether. Example 3");
    process.exit(1);
  }
  if (isNaN(Number(argAmount))) {
  console.error("Amount must be a valid number.");
  process.exit(1);
}
const depositAmount = ethers.parseEther(argAmount);
const tx = await ownerWalletConnectBank.deposit({value: depositAmount});
console.log(`Owner is depositing ${ethers.formatEther(depositAmount)} ETH`);
await tx.wait();
console.log("Owner deposit confirmed at transaction hash", tx.hash);
break;
}

case "test_wallet1_deposit": {
  if(!argAmount){
    console.error("Please enter an ETH amount. Example 2");
    process.exit(1);
  }
  if (isNaN(Number(argAmount))) {
  console.error("Amount must be a valid number.");
  process.exit(1);
}
const depositAmount = ethers.parseEther(argAmount);
const tx = await testWallet1ConnectBank.deposit({value: depositAmount});
console.log(`testWallet1 is depositing ${ethers.formatEther(depositAmount)} ETH`);
await tx.wait();
console.log("testWallet1 deposit confirmed at transaction hash", tx.hash);
break;
}

default: {
  console.error("Unknown command. Please use any of the valid cases below:");
  console.error("owner_wallet_deposit");
    console.error("test_wallet1_deposit");
   console.error("Usage Example: npx hardhat run scripts/deposit.ts <valid case>");
}
}
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});