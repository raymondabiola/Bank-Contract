import {ethers} from "hardhat";

async function main(){
    const FeeCollector = await ethers.getContractFactory("FeeCollector");
    const Bank = await ethers.getContractFactory("Bank");
    const dustThreshold = ethers.parseEther("0.000001");

    const feeCollector = await FeeCollector.deploy(dustThreshold);
    await feeCollector.waitForDeployment();
    console.log(`Fee Collector contract deployed to: ${await feeCollector.getAddress()}`);

    const feeCollectorAddress = await feeCollector.getAddress();
    const interestRatePerAnnum = 6n;
    const depositFeePercent = 5n;

    const bank = await Bank.deploy(feeCollectorAddress, interestRatePerAnnum, depositFeePercent, dustThreshold);
    await bank.waitForDeployment();

console.log(`Bank contract deployed to: ${await bank.getAddress()}`);
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
}
)