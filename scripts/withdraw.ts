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

if (!PRIVATE_KEY || !TEST_PRIVATE_KEY || !TEST_PRIVATE_KEY2 || !INFURA_API_URL || !BANK_CONTRACT_ADDRESS || !FEE_COLLECTOR_CONTRACT_ADDRESS) {
  throw new Error("Missing required environment variables. Check the dot env file.");
}


async function main(){
  const command = process.argv[2];
  const argAmount = process.argv[3];

// The API and Private keys should be specified in the dot env file.
const provider = new ethers.JsonRpcProvider(INFURA_API_URL);
const ownerWallet = new ethers.Wallet(PRIVATE_KEY!, provider);
const testWallet1 = new ethers.Wallet(TEST_PRIVATE_KEY!, provider);
const testWallet2 = new ethers.Wallet(TEST_PRIVATE_KEY2!, provider);

const feeCollectorAddress = FEE_COLLECTOR_CONTRACT_ADDRESS!;
const bankAddress = BANK_CONTRACT_ADDRESS!;

// Owner instance connection to the bank contract
const ownerWalletConnectBank = new ethers.Contract(bankAddress, BankJson.abi, ownerWallet);

// Test wallet instance connection to the Bank contract
const testWallet1ConnectBank = new ethers.Contract(bankAddress, BankJson.abi, testWallet1);
const testWallet2ConnectBank = new ethers.Contract(bankAddress, BankJson.abi, testWallet2);

// Owner instance connection to the fee collector contract
const ownerWalletConnectFeeCollector = new ethers.Contract(feeCollectorAddress, FeeCollectorJson.abi, ownerWallet);

console.log("Owner Address:", ownerWallet.address);
console.log("Test Wallet1 Address:", testWallet1.address);
console.log("Test Wallet2 Address:", testWallet2.address);

//Some Withdrawals Scripts Samples for Bank and Fee Collector Contract.
switch (command) {
//Remember interacting wallets must have some deposits to be able to withdraw.
case "test_wallet1_withdraw": {
  if(!argAmount){
    console.error("Please provide an ETH amount. Example 2");
    process.exit(1);
  }
  if (isNaN(Number(argAmount))) {
  console.error("Amount must be a valid number.");
  process.exit(1);
}
  const withdrawalAmount = ethers.parseEther(argAmount);
const tx = await testWallet1ConnectBank.withdraw(withdrawalAmount);
console.log(`test wallet1 has initiated a withdrawal of ${ethers.formatEther(withdrawalAmount)} and is awaiting confirmation......`);
await tx.wait();
console.log(`Test Wallet1 Withdrawal successful at ${tx.hash}`);
break;
}

case "owner_wallet_withdraw":{
  if(!argAmount){
    console.error("Please provide an ETH amount. Example 2");
    process.exit(1);
  }
  if (isNaN(Number(argAmount))) {
  console.error("Amount must be a valid number.");
  process.exit(1);
}
  const withdrawalAmount = ethers.parseEther(argAmount);
const tx = await ownerWalletConnectBank.withdraw(withdrawalAmount);
console.log(`owner wallet has initiated a withdrawal of ${ethers.formatEther(withdrawalAmount)} and is awaiting confirmation......`)
await tx.wait();
console.log(`Withdrawal successful at ${tx.hash}`);
break;
}

case "test_wallet2_withdrawAll":{
const testWallet2Balance = await testWallet2ConnectBank.getMyBalance();
const tx = await testWallet2ConnectBank.withdrawAll();
console.log("Test wallet2 has initiated a withdrawalAll operation and is awaiting confirmation......")
await tx.wait();
console.log(`tx hash is ${tx.hash}. Test wallet2 has successfully withdrawn all their balances equal to ${ethers.formatEther(testWallet2Balance)}`);
break;
}

case "owner_wallet_withdrawAll": {
const ownerBalance = await ownerWalletConnectBank.getMyBalance();
const tx = await ownerWalletConnectBank.withdrawAll();
console.log("Owner wallet has initiated a withdrawalAll operation and is awaiting confirmation......")
await tx.wait();
console.log(`tx hash is ${tx.hash}. Owner wallet has successfully withdrawn all their balances equal to ${ethers.formatEther(ownerBalance)}`);
break;
}

//Some FeeCollector Withdrawal Script Samples

// The fee collector contract should have a tangible balance for the withdrawal to be possible.
case "owner_wallet_withdraw_wrom_feeCollector": {
  if(!argAmount){
    console.error("Please enter a valid amount to withdraw. Example 6");
    process.exit(1);
  }
  if (isNaN(Number(argAmount))) {
  console.error("Amount must be a valid number.");
  process.exit(1);
}
  const withdrawalAmount = ethers.parseEther(argAmount);
const tx = await ownerWalletConnectFeeCollector.adminWithdraw(testWallet1.address, withdrawalAmount);
console.log(`Owner initiated a withdrawal of ${ethers.formatEther(withdrawalAmount)} ETH from the fee collector contract`);
await tx.wait();
console.log(`Owner withdrawal was successful ${tx.hash}`);
break;
}

// The fee collector contract should have a tangible balance for the withdrawal to be possible.
case "owner_wallet_withdrawAll_from_feeCollector": {
const tx = await ownerWalletConnectFeeCollector.emergencyFeeWithdraw(testWallet1.address);
console.log("Owner initiated an emergency fee withdrawal from the fee collector contract");
await tx.wait();
console.log(`Owner emergency fee withdrawal was successful ${tx.hash}`);
break;
}

default: {
  console.error("Unknown command. Please use one of the valid commands below:") ;
  console.error("test_wallet1_withdraw");
  console.error("owner_wallet_withdraw");
  console.error("test_wallet2_withdrawAll");
  console.error("owner_wallet_withdrawAll");
  console.error("owner_wallet_withdraw_from_feeCollector");
  console.error("owner_wallet_withdrawAll_from_feeCollector");
  console.error("Usage Example: npx hardhat run scripts/withdraw.ts <valid case>");
}
}
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});