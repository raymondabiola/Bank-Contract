import { ethers } from "hardhat";
import { expect } from "chai";
import { clear, error } from "console";

describe("Bank", function () {
  let bank: any,
    feeCollector: any,
    owner: any,
    addr1: any,
    addr2: any,
    addr3: any,
    addr4: any,
    addr5: any;

  beforeEach(async function () {
    const FeeCollector = await ethers.getContractFactory("FeeCollector");
    const Bank = await ethers.getContractFactory("Bank");
    [owner, addr1, addr2, addr3, addr4, addr5] = await ethers.getSigners();
    const dustThreshold = ethers.parseEther("0.000001");

    feeCollector = await FeeCollector.deploy(dustThreshold);
    await feeCollector.waitForDeployment();

    const feeCollectorAddress = await feeCollector.getAddress();

    const interestRatePerAnnum = 6n;
    const depositFeePercent = 5n;

    bank = await Bank.deploy(
      feeCollectorAddress,
      interestRatePerAnnum,
      depositFeePercent,
      dustThreshold
    );
    await bank.waitForDeployment();

    const bankAddress = await bank.getAddress();

    await feeCollector.connect(owner).setBankRole(bankAddress);
  });

  // ADMINISTRATIVE TESTS

  it("should allow only default admin to set newFeeCollectorAddress and do it correctly", async function () {
    expect(await bank.feeCollectorAddress()).to.equal(
      await feeCollector.getAddress()
    );
    await bank
      .connect(owner)
      .assignRoleToAddress(await bank.OPERATOR_MANAGER_ROLE(), addr1.address);
    await bank
      .connect(owner)
      .assignRoleToAddress(await bank.BANK_OPERATOR_ROLE(), addr2.address);
    await expect(
      bank.connect(addr1).setNewFeeCollectorAddress(feeCollector.getAddress())
    ).to.be.revertedWithCustomError(bank, "AccessControlUnauthorizedAccount");
    await expect(
      bank.connect(addr2).setNewFeeCollectorAddress(feeCollector.getAddress())
    ).to.be.revertedWithCustomError(bank, "AccessControlUnauthorizedAccount");
    await expect(
      bank.connect(addr3).setNewFeeCollectorAddress(feeCollector.getAddress())
    ).to.be.revertedWithCustomError(bank, "AccessControlUnauthorizedAccount");
  });
  it("should grant DEFAULT_ADMIN_ROLE to owner on deploy of bank and fee collector contract", async function () {
    expect(await bank.hasRole(await bank.DEFAULT_ADMIN_ROLE(), owner.address))
      .to.be.true;
    expect(
      await feeCollector.hasRole(
        await feeCollector.DEFAULT_ADMIN_ROLE(),
        owner.address
      )
    ).to.be.true;
  });

  it("should grant MANAGER_ADMIN, MANAGER_SETTER, and BANK_OPERATOR_ROLE to owner on deploy of bank contract", async function () {
    expect(
      await bank.hasRole(await bank.OPERATOR_MANAGER_ROLE(), owner.address)
    ).to.be.true;
    expect(await bank.hasRole(await bank.CONFIG_MANAGER_ROLE(), owner.address))
      .to.be.true;
    expect(await bank.hasRole(await bank.BANK_OPERATOR_ROLE(), owner.address))
      .to.be.true;
  });

  it("owner should be able to grant BANK_ROLE to the bank contract address on deploy after deployment of bank contract", async function () {
    expect(
      await feeCollector.hasRole(
        await feeCollector.BANK_ROLE(),
        await bank.getAddress()
      )
    ).to.be.true;
  });

  it("should allow the owner to set a role ADMIN", async function () {
    bank
      .connect(owner)
      .setRoleAdmin(
        await bank.BANK_OPERATOR_ROLE(),
        await bank.OPERATOR_MANAGER_ROLE()
      );
    bank
      .connect(owner)
      .setRoleAdmin(
        await bank.BANK_CONFIG_ROLE(),
        await bank.CONFIG_MANAGER_ROLE()
      );
    expect(await bank.getRoleAdmin(await bank.BANK_OPERATOR_ROLE())).to.equal(
      await bank.OPERATOR_MANAGER_ROLE()
    );
    expect(await bank.getRoleAdmin(await bank.BANK_CONFIG_ROLE())).to.equal(
      await bank.CONFIG_MANAGER_ROLE()
    );
  });

  it("should allow owner and MANAGER role to assign a role(that are subordinate to them) to an address", async function () {
    // set role admin of admin role
    await bank
      .connect(owner)
      .setRoleAdmin(
        await bank.BANK_OPERATOR_ROLE(),
        await bank.OPERATOR_MANAGER_ROLE()
      );

    // Assign manager roles
    await bank
      .connect(owner)
      .assignRoleToAddress(await bank.OPERATOR_MANAGER_ROLE(), addr1.address);
    await bank
      .connect(owner)
      .assignRoleToAddress(await bank.CONFIG_MANAGER_ROLE(), addr2.address);

    // assign roles
    await bank
      .connect(owner)
      .assignRoleToAddress(await bank.BANK_OPERATOR_ROLE(), addr3.address);
    await bank
      .connect(addr1)
      .assignRoleToAddress(await bank.BANK_OPERATOR_ROLE(), addr4.address);

    // expect, should revert on the last line
    expect(await bank.hasRole(await bank.BANK_OPERATOR_ROLE(), addr3.address))
      .to.be.true;
    expect(await bank.hasRole(await bank.BANK_OPERATOR_ROLE(), addr4.address))
      .to.be.true;
    await expect(
      bank
        .connect(addr2)
        .assignRoleToAddress(await bank.BANK_OPERATOR_ROLE(), addr5.address)
    ).to.be.reverted;
  });

  it("should allow manager admins including owner to revoke subordinates and reassign them", async function () {
    // set role admin of admin role
    await bank
      .connect(owner)
      .setRoleAdmin(
        await bank.BANK_OPERATOR_ROLE(),
        await bank.OPERATOR_MANAGER_ROLE()
      );

    //assign roles
    await bank
      .connect(owner)
      .assignRoleToAddress(await bank.OPERATOR_MANAGER_ROLE(), addr1.address);
    await bank
      .connect(owner)
      .assignRoleToAddress(await bank.CONFIG_MANAGER_ROLE(), addr2.address);
    await bank
      .connect(owner)
      .assignRoleToAddress(await bank.BANK_OPERATOR_ROLE(), addr3.address);

    // owner can revoke anyone
    await expect(
      bank
        .connect(owner)
        .revokeRole(await bank.OPERATOR_MANAGER_ROLE(), addr1.address)
    ).not.to.be.reverted;
    await expect(
      bank
        .connect(owner)
        .revokeRole(await bank.CONFIG_MANAGER_ROLE(), addr2.address)
    ).not.to.be.reverted;

    //reassign roles
    await bank
      .connect(owner)
      .assignRoleToAddress(await bank.OPERATOR_MANAGER_ROLE(), addr1.address);
    await bank
      .connect(owner)
      .assignRoleToAddress(await bank.CONFIG_MANAGER_ROLE(), addr2.address);

    //Only manager admin role can revoke and assign admin role
    await expect(
      bank
        .connect(addr1)
        .revokeRole(await bank.BANK_OPERATOR_ROLE(), addr3.address)
    ).not.to.be.reverted;
    await expect(
      bank
        .connect(addr2)
        .assignRoleToAddress(await bank.BANK_OPERATOR_ROLE(), addr3.address)
    ).to.be.reverted;
    await expect(
      bank
        .connect(addr1)
        .assignRoleToAddress(await bank.BANK_OPERATOR_ROLE(), addr3.address)
    ).not.to.be.reverted;
  });

  it("It should allow only addresses with BANK_OPERATOR_ROLE to pause and unpause the contract", async function () {
    // set role admin of admin role
    await bank
      .connect(owner)
      .setRoleAdmin(
        await bank.BANK_OPERATOR_ROLE(),
        await bank.OPERATOR_MANAGER_ROLE()
      );

    //assign roles
    await bank
      .connect(owner)
      .assignRoleToAddress(await bank.OPERATOR_MANAGER_ROLE(), addr1.address);
    await bank
      .connect(owner)
      .assignRoleToAddress(await bank.CONFIG_MANAGER_ROLE(), addr2.address);
    await bank
      .connect(owner)
      .assignRoleToAddress(await bank.BANK_OPERATOR_ROLE(), addr3.address);
    await bank
      .connect(owner)
      .assignRoleToAddress(await bank.BANK_CONFIG_ROLE(), addr4.address);

    //The expect lines below should fail since they dont have admin role.
    await expect(bank.connect(addr1).pause()).to.be.revertedWithCustomError(
      bank,
      "AccessControlUnauthorizedAccount"
    );
    await expect(bank.connect(addr2).pause()).to.be.revertedWithCustomError(
      bank,
      "AccessControlUnauthorizedAccount"
    );
    await expect(bank.connect(addr4).pause()).to.be.revertedWithCustomError(
      bank,
      "AccessControlUnauthorizedAccount"
    );
    //The line below will pause so we need to unpause.
    await expect(bank.connect(addr3).pause()).not.to.be.reverted;
    //unpause bank by owner should not be reverted- has admin role
    await expect(bank.connect(owner).unPause()).not.to.be.reverted;
    //Owner is expected to pause and unpause bank since they have admin role.
    await expect(bank.connect(owner).pause()).not.to.be.reverted;

    //trying to unpause with addresses without admin role should revert
    await expect(bank.connect(addr1).unPause()).to.be.revertedWithCustomError(
      bank,
      "AccessControlUnauthorizedAccount"
    );
    await expect(bank.connect(addr2).unPause()).to.be.revertedWithCustomError(
      bank,
      "AccessControlUnauthorizedAccount"
    );
    await expect(bank.connect(addr4).unPause()).to.be.revertedWithCustomError(
      bank,
      "AccessControlUnauthorizedAccount"
    );
    await expect(bank.connect(addr3).unPause()).not.to.be.reverted;
  });

  it("should allow only addresses with the Setter Admin role to set a newInterestRate, newDustThreshold,and newDepositFeePercent on bank contract", async function () {
    const newInterestRate = 2n;
    const newInterestRate2 = 3n;
    const newDustThreshold = ethers.parseEther("0.00001");
    const newDustThreshold2 = ethers.parseEther("0.00002");
    const newDepositFeePercent = 3n;
    const newDepositFeePercent2 = 4n;

    await bank
      .connect(owner)
      .assignRoleToAddress(await bank.BANK_CONFIG_ROLE(), addr2.address);
    await bank
      .connect(owner)
      .assignRoleToAddress(await bank.CONFIG_MANAGER_ROLE(), addr1.address);
    await bank
      .connect(owner)
      .assignRoleToAddress(await bank.OPERATOR_MANAGER_ROLE(), addr3.address);

    await expect(
      bank.connect(addr1).setNewInterestRate(newInterestRate)
    ).to.be.revertedWithCustomError(bank, "AccessControlUnauthorizedAccount");
    await expect(
      bank.connect(addr3).setNewInterestRate(newInterestRate)
    ).to.be.revertedWithCustomError(bank, "AccessControlUnauthorizedAccount");
    await expect(
      bank.connect(addr4).setNewInterestRate(newInterestRate)
    ).to.be.revertedWithCustomError(bank, "AccessControlUnauthorizedAccount");
    await expect(bank.connect(owner).setNewInterestRate(newInterestRate)).not.to
      .be.reverted;
    await expect(bank.connect(addr2).setNewInterestRate(newInterestRate2)).not
      .to.be.reverted;

    await expect(
      bank.connect(addr1).setNewDustThreshold(newDustThreshold)
    ).to.be.revertedWithCustomError(bank, "AccessControlUnauthorizedAccount");
    await expect(
      bank.connect(addr3).setNewDustThreshold(newDustThreshold)
    ).to.be.revertedWithCustomError(bank, "AccessControlUnauthorizedAccount");
    await expect(
      bank.connect(addr4).setNewDustThreshold(newDustThreshold)
    ).to.be.revertedWithCustomError(bank, "AccessControlUnauthorizedAccount");
    await expect(bank.connect(owner).setNewDustThreshold(newDustThreshold)).not
      .to.be.reverted;
    await expect(bank.connect(addr2).setNewDustThreshold(newDustThreshold2)).not
      .to.be.reverted;

    await expect(
      bank.connect(addr1).setNewDepositFeePercent(newDepositFeePercent)
    ).to.be.revertedWithCustomError(bank, "AccessControlUnauthorizedAccount");
    await expect(
      bank.connect(addr3).setNewDepositFeePercent(newDepositFeePercent)
    ).to.be.revertedWithCustomError(bank, "AccessControlUnauthorizedAccount");
    await expect(
      bank.connect(addr4).setNewDepositFeePercent(newDepositFeePercent)
    ).to.be.revertedWithCustomError(bank, "AccessControlUnauthorizedAccount");
    await expect(
      bank.connect(owner).setNewDepositFeePercent(newDepositFeePercent)
    ).not.to.be.reverted;
    await expect(
      bank.connect(addr2).setNewDepositFeePercent(newDepositFeePercent2)
    ).not.to.be.reverted;
  });

  it("should not allow Interestrate, newDepositFeePercent and newDustThreshold to be set to new values if the new values are same as current value and are not within their limits ", async function () {
    const newInterestRate = 6n;
    const newInterestRate2 = 101n;
    const newDustThreshold = ethers.parseEther("0.000001");
    const newDustThreshold2 = ethers.parseEther("0.0000009");
    const newDepositFeePercent = 5n;
    const newDepositFeePercent2 = 51n;

    await expect(
      bank.connect(owner).setNewInterestRate(newInterestRate)
    ).to.be.revertedWithCustomError(bank, "ValueSameAsCurrent");
    await expect(
      bank.connect(owner).setNewInterestRate(newInterestRate2)
    ).to.be.revertedWithCustomError(bank, "NotWithinValidRange");
    await expect(
      bank.connect(owner).setNewDustThreshold(newDustThreshold)
    ).to.be.revertedWithCustomError(bank, "ValueSameAsCurrent");
    await expect(
      bank.connect(owner).setNewDustThreshold(newDustThreshold2)
    ).to.be.revertedWithCustomError(bank, "LowerThanMinimum");
    await expect(
      bank.connect(owner).setNewDepositFeePercent(newDepositFeePercent)
    ).to.be.revertedWithCustomError(bank, "ValueSameAsCurrent");
    await expect(
      bank.connect(owner).setNewDepositFeePercent(newDepositFeePercent2)
    ).to.be.revertedWithCustomError(bank, "NotWithinValidRange");
  });

  it("should allow only the default admin to change owner to a new address and correctly do so ", async function () {
    await bank
      .connect(owner)
      .assignRoleToAddress(await bank.OPERATOR_MANAGER_ROLE(), addr3.address);
    await expect(bank.connect(owner).changeOwner(addr1.address)).not.to.be
      .reverted;
    expect(await bank.hasRole(await bank.DEFAULT_ADMIN_ROLE(), addr1.address))
      .to.be.true;
    expect(
      await bank.hasRole(await bank.OPERATOR_MANAGER_ROLE(), addr1.address)
    ).to.be.true;
    expect(await bank.hasRole(await bank.CONFIG_MANAGER_ROLE(), addr1.address))
      .to.be.true;
    expect(await bank.hasRole(await bank.BANK_OPERATOR_ROLE(), addr1.address))
      .to.be.true;
    expect(await bank.hasRole(await bank.BANK_CONFIG_ROLE(), addr1.address)).to
      .be.true;

    await expect(
      bank.connect(addr2).changeOwner(addr3.address)
    ).to.be.revertedWithCustomError(bank, "AccessControlUnauthorizedAccount");
    await expect(
      bank.connect(addr3).changeOwner(addr2.address)
    ).to.be.revertedWithCustomError(bank, "AccessControlUnauthorizedAccount");
  });

  it("should not allow default admin or any other address to assign default admin to an address via the assign role function ", async function () {
    await expect(
      bank
        .connect(owner)
        .assignRoleToAddress(await bank.DEFAULT_ADMIN_ROLE(), addr1.address)
    ).to.be.revertedWithCustomError(
      bank,
      "DefaultAdminAssignForbidden_UseChangeOwnerFunction"
    );
    await expect(
      bank
        .connect(addr1)
        .assignRoleToAddress(await bank.DEFAULT_ADMIN_ROLE(), addr2.address)
    ).to.be.revertedWithCustomError(
      bank,
      "DefaultAdminAssignForbidden_UseChangeOwnerFunction"
    );
    await bank
      .connect(owner)
      .assignRoleToAddress(await bank.OPERATOR_MANAGER_ROLE(), addr3.address);
    await expect(
      bank
        .connect(addr3)
        .assignRoleToAddress(await bank.DEFAULT_ADMIN_ROLE(), addr2.address)
    ).to.be.revertedWithCustomError(
      bank,
      "DefaultAdminAssignForbidden_UseChangeOwnerFunction"
    );
  });

  it("should not allow default admin or any other address to revoke the default admin role via the revoke function ", async function () {
    await expect(
      bank
        .connect(owner)
        .revokeRoleFromAddress(await bank.DEFAULT_ADMIN_ROLE(), owner.address)
    ).to.be.revertedWithCustomError(
      bank,
      "DefaultAdminRevokeForbidden_UseChangeOwnerFunction"
    );
    await bank
      .connect(owner)
      .assignRoleToAddress(await bank.OPERATOR_MANAGER_ROLE(), addr3.address);
    await expect(
      bank
        .connect(addr3)
        .revokeRoleFromAddress(await bank.DEFAULT_ADMIN_ROLE(), owner.address)
    ).to.be.revertedWithCustomError(
      bank,
      "DefaultAdminRevokeForbidden_UseChangeOwnerFunction"
    );
    await expect(
      bank
        .connect(addr1)
        .revokeRoleFromAddress(await bank.DEFAULT_ADMIN_ROLE(), owner.address)
    ).to.be.revertedWithCustomError(
      bank,
      "DefaultAdminRevokeForbidden_UseChangeOwnerFunction"
    );
  });

  it("should not allow default admin to renounce the default admin role via the renounce function ", async function () {
    await expect(
      bank.connect(owner).renounceMyRole(await bank.DEFAULT_ADMIN_ROLE())
    ).to.be.revertedWithCustomError(
      bank,
      "DefaultAdminRevokeForbidden_UseChangeOwnerFunction"
    );
  });

  it("should allow other address to renounce their role and do it correctly", async function () {
    await bank
      .connect(owner)
      .assignRoleToAddress(await bank.OPERATOR_MANAGER_ROLE(), addr1.address);
    await bank
      .connect(owner)
      .assignRoleToAddress(await bank.BANK_OPERATOR_ROLE(), addr2.address);
    await bank
      .connect(owner)
      .assignRoleToAddress(await bank.BANK_CONFIG_ROLE(), addr3.address);
    await expect(
      bank.connect(addr1).renounceMyRole(await bank.OPERATOR_MANAGER_ROLE())
    ).not.to.be.reverted;
    expect(
      await bank.hasRole(await bank.OPERATOR_MANAGER_ROLE(), addr1.address)
    ).to.equal(false);
    await expect(
      bank.connect(addr2).renounceMyRole(await bank.BANK_OPERATOR_ROLE())
    ).not.to.be.reverted;
    expect(
      await bank.hasRole(await bank.BANK_OPERATOR_ROLE(), addr2.address)
    ).to.equal(false);
    await expect(
      bank.connect(addr3).renounceMyRole(await bank.BANK_CONFIG_ROLE())
    ).not.to.be.reverted;
    expect(
      await bank.hasRole(await bank.BANK_CONFIG_ROLE(), addr3.address)
    ).to.equal(false);
  });

  it("should allow default admin to renounce his lower privileges via the renounce function ", async function () {
    await expect(
      bank.connect(owner).renounceMyRole(await bank.OPERATOR_MANAGER_ROLE())
    ).not.to.be.reverted;
    await expect(
      bank.connect(owner).renounceMyRole(await bank.CONFIG_MANAGER_ROLE())
    ).not.to.be.reverted;
    await expect(
      bank.connect(owner).renounceMyRole(await bank.BANK_OPERATOR_ROLE())
    ).not.to.be.reverted;
    await expect(
      bank.connect(owner).renounceMyRole(await bank.BANK_CONFIG_ROLE())
    ).not.to.be.reverted;
  });

  it("should allow only default admin to set roleAdmin and do it correctly", async function () {
    await bank
      .connect(owner)
      .setRoleAdmin(
        await bank.BANK_OPERATOR_ROLE(),
        await bank.OPERATOR_MANAGER_ROLE()
      );
    expect(await bank.checkRoleAdmin(await bank.BANK_OPERATOR_ROLE())).to.equal(
      await bank.OPERATOR_MANAGER_ROLE()
    );
    await bank
      .connect(owner)
      .assignRoleToAddress(await bank.OPERATOR_MANAGER_ROLE(), addr2.address);
    await expect(
      bank
        .connect(addr1)
        .setRoleAdmin(
          await bank.BANK_CONFIG_ROLE(),
          await bank.CONFIG_MANAGER_ROLE()
        )
    ).to.be.revertedWithCustomError(bank, "AccessControlUnauthorizedAccount");
    await expect(
      bank
        .connect(addr2)
        .setRoleAdmin(
          await bank.BANK_CONFIG_ROLE(),
          await bank.CONFIG_MANAGER_ROLE()
        )
    ).to.be.revertedWithCustomError(bank, "AccessControlUnauthorizedAccount");
  });

  // TRANSACTION TESTS
  it("Should allow users to deposit ETH and the deposit fee is deducted correctly and sent to the feeCollector contract", async function () {
    //fresh deposits
    const depositAmount = ethers.parseEther("1");
    await bank.connect(addr1).deposit({ value: depositAmount });
    const balance = await bank.connect(addr1).getMyBalance();
    const feeCollectorBalance = await ethers.provider.getBalance(
      feeCollector.getAddress()
    );
    expect(balance).to.equal((depositAmount * 95n) / 100n);
    expect(feeCollectorBalance).to.equal((depositAmount * 5n) / 100n);

    //more deposits
    const depositAmount2 = ethers.parseEther("2");
    await bank.connect(addr1).deposit({ value: depositAmount2 });
    const OldBal = (depositAmount * 95n) / 100n;
    const expectedNewBal = OldBal + (depositAmount2 * 95n) / 100n;
    const oldFeeCollectorBal = (depositAmount * 5n) / 100n;
    const expectedNewFeeCollectorBal =
      oldFeeCollectorBal + (depositAmount2 * 5n) / 100n;
    const newBalance = await bank.connect(addr1).getMyBalance();
    const newFeeCollectorBalance = await ethers.provider.getBalance(
      feeCollector.getAddress()
    );
    expect(newBalance).to.equal(expectedNewBal);
    expect(newFeeCollectorBalance).to.equal(expectedNewFeeCollectorBal);
  });

  it("Should fail if a user tries to deposit an insignificant ETH amount", async function () {
    const dustDepositAmount = ethers.parseEther("0.0000001");
    const depositAmount = ethers.parseEther("0.000001");
    await expect(
      bank.connect(addr2).deposit({ value: dustDepositAmount })
    ).to.be.revertedWithCustomError(bank, "InsignificantAmount");
    await expect(bank.connect(addr2).deposit({ value: depositAmount })).not.to
      .be.reverted;
  });

  it("Should allow a user to withdraw part of their deposited ETH and set their depositTimeStamp to block.timestamp", async function () {
    const depositAmount = ethers.parseEther("2");
    await bank.connect(addr1).deposit({ value: depositAmount });
    const withdrawAmount = ethers.parseEther("1");
    const tx = await bank.connect(addr1).withdraw(withdrawAmount);
    const receipt = await tx.wait();
    const block = await ethers.provider.getBlock(receipt.blockNumber);
    const timeOfTransaction = block?.timestamp;
    const balanceLeft = await bank.connect(addr1).getMyBalance();
    expect(balanceLeft).to.equal((depositAmount * 95n) / 100n - withdrawAmount);
    expect(await bank.connect(addr1).depositTimeStamp(addr1.address)).to.equal(
      timeOfTransaction
    );
  });

  it("Should fail if a user tries to withdraw more than their balance", async function () {
    const depositAmount = ethers.parseEther("3");
    await bank.connect(addr2).deposit({ value: depositAmount });
    await expect(
      bank.connect(addr2).withdraw(depositAmount)
    ).to.be.revertedWithCustomError(bank, "NotEnoughBalance");
  });

  it("Should fail if a user tries to withdraw with zero balance or if a user tries to withdraw balance below dust threshold", async function () {
    await expect(
      bank.connect(addr2).withdraw(ethers.parseEther("1"))
    ).to.be.revertedWithCustomError(bank, "InsignificantBalance");
    const depositAmount = ethers.parseEther("3");
    await bank.connect(addr2).deposit({ value: depositAmount });
    const withdrawAmount = ethers.parseEther("0.0000009");
    await expect(
      bank.connect(addr2).withdraw(withdrawAmount)
    ).to.be.revertedWithCustomError(bank, "InsignificantAmount");
  });

  it("It should reduce the user balance after a successful withdrawal", async function () {
    const depositAmount = ethers.parseEther("5");
    await bank.connect(addr1).deposit({ value: depositAmount });
    const oldBalance = await bank.connect(addr1).depositBalance(addr1.address);
    const withdrawAmount = ethers.parseEther("3");
    await bank.connect(addr1).withdraw(withdrawAmount);
    const newBalance = await bank.connect(addr1).depositBalance(addr1.address);
    expect(newBalance < oldBalance).to.be.true;
  });

  it("should fail if a user tries to deposit when the contract is paused", async function () {
    await bank.connect(owner).pause();
    const depositAmount = ethers.parseEther("2");
    await expect(
      bank.connect(addr1).deposit({ value: depositAmount })
    ).to.be.revertedWithCustomError(bank, "EnforcedPause");
  });

  it("should fail if a user tries to withdraw when paused", async function () {
    const depositAmount = ethers.parseEther("2");
    await bank.connect(addr1).deposit({ value: depositAmount });
    await bank.connect(owner).pause();
    const withdrawAmount = ethers.parseEther("1");
    await expect(
      bank.connect(addr1).withdraw(withdrawAmount)
    ).to.be.revertedWithCustomError(bank, "EnforcedPause");
  });

  it("It should work normally after being unpaused", async function () {
    const depositAmount = ethers.parseEther("2");
    await bank.connect(addr1).deposit({ value: depositAmount });
    await bank.connect(owner).pause();
    const withdrawAmount = ethers.parseEther("1");
    await expect(
      bank.connect(addr1).withdraw(withdrawAmount)
    ).to.be.revertedWithCustomError(bank, "EnforcedPause");
    await bank.connect(owner).unPause();
    await expect(bank.connect(addr1).withdraw(withdrawAmount)).not.to.be
      .reverted;
  });

  it("It should calculate correct interest after a deposit", async function () {
    const depositAmount = ethers.parseEther("8");

    const depositAmount2 = ethers.parseEther("5");
    const tx = await bank.connect(addr1).deposit({ value: depositAmount });
    const receipt = await tx.wait();

    // Get timestamp at deposit Block
    const depositBlock = await ethers.provider.getBlock(receipt.blockNumber);
    const depositTimeStamp = depositBlock?.timestamp;

    // Fast-forward time by 10 hrs (36000 seconds)
    await ethers.provider.send("evm_increaseTime", [36_000]);
    await ethers.provider.send("evm_mine", []);

    const tx2 = await bank.connect(addr1).deposit({ value: depositAmount2 });
    const receipt2 = await tx2.wait();

    // Get calculated interest via the view function
    const expectedInterest = await bank
      .connect(addr1)
      .totalInterest(addr1.address);

    // Do the math on test side for expected value
    const calculatedInterest =
      (((depositAmount * 95n) / 100n) * 6n * 36_000n) / (100n * 365n * 86_400n); // 6% * 10hrs||36000secs

    expect(calculatedInterest).to.be.closeTo(
      expectedInterest,
      ethers.parseEther("1000000000000")
    );
  });

  // check
  it("claim interest function works properly and all variables are correctly updated", async function () {
    const depositAmount = ethers.parseEther("100");
    const tx = await bank.connect(addr1).deposit({ value: depositAmount });
    await tx.wait();
    const balanceAfterDeposit = await ethers.provider.getBalance(addr1.address);

    // Fast-forward time by 10 hours (36000 seconds)
    await ethers.provider.send("evm_increaseTime", [36_000]);
    await ethers.provider.send("evm_mine", []);

    // Get calculated interest via the view function
    const calculatedTotalInterest =
      (((depositAmount * 95n) / 100n) * 6n * 36_000n) / (100n * 365n * 86_400n);

    const claimTransaction = await bank.connect(addr1).claimInterest();
    await claimTransaction.wait();
    const balanceAfterClaim = await ethers.provider.getBalance(addr1.address);
    const expectedInterest = balanceAfterClaim - balanceAfterDeposit;
    expect(expectedInterest).to.be.closeTo(
      calculatedTotalInterest,
      ethers.parseEther("100000000000000")
    );
  });

  it("It should revert with no interest for users with zero balance", async function () {
    //increase time by 10hours
    await ethers.provider.send("evm_increaseTime", [36_000]);
    await ethers.provider.send("evm_mine", []);

    await expect(
      bank.connect(addr1).claimInterest()
    ).to.be.revertedWithCustomError(bank, "NoInterest");
  });

  it("It should reflect changes after updating interest rate", async function () {
    const oldInterestRate = await bank.interestRatePerAnnum();
    const newInterestRate = 3n;
    await bank.connect(owner).setNewInterestRate(newInterestRate);
    expect(newInterestRate).to.equal(await bank.interestRatePerAnnum());
  });

  it("Should emit a Deposit event on deposit", async function () {
    const depositAmount = ethers.parseEther("2");
    await expect(bank.connect(addr2).deposit({ value: depositAmount }))
      .to.emit(bank, "Deposited")
      .withArgs(
        addr2.address,
        depositAmount,
        (depositAmount * 95n) / 100n,
        await bank.totalInterest(addr2.address)
      );
  });

  it("Should emit a Withdraw event on withdrawal", async function () {
    const depositAmount = ethers.parseEther("2");
    await bank.connect(addr2).deposit({ value: depositAmount });
    const withdrawAmount = ethers.parseEther("1");
    await expect(bank.connect(addr2).withdraw(withdrawAmount))
      .to.emit(bank, "Withdrawn")
      .withArgs(addr2.address, withdrawAmount);
  });

  it("should correctly calculate the depositTimeStamp of a user deposit for both fresh and accumulated deposits", async function () {
    const amount = ethers.parseEther("100");
    const depositAmount = (amount * 95n) / 100n;

    const tx1 = await bank.connect(addr1).deposit({ value: amount });
    const receipt = await tx1.wait();
    const block = await ethers.provider.getBlock(receipt.blockNumber);

    if (!block || block.timestamp === undefined) {
      throw new Error("Block or blocktimestamp is undefined");
    }
    const blockTime = BigInt(block?.timestamp);
    expect(await bank.depositTimeStamp(addr1.address)).to.equal(blockTime);

    // Fast-forward time by 5 days (432000 seconds)
    await ethers.provider.send("evm_increaseTime", [432_000]);
    await ethers.provider.send("evm_mine", []);

    const amount2 = ethers.parseEther("50");
    const depositAmount2 = (amount2 * 95n) / 100n;
    const tx2 = await bank.connect(addr1).deposit({ value: amount2 });
    const receipt2 = await tx2.wait();
    const block2 = await ethers.provider.getBlock(receipt2.blockNumber);
    if (!block2 || block2.timestamp === undefined) {
      throw new Error("Block or blocktimestamp is undefined");
    }
    const blockTime2 = BigInt(block2?.timestamp);

    const calculateddepositTimeStamp =
      (blockTime * depositAmount + blockTime2 * depositAmount2) /
      (depositAmount + depositAmount2);
    const expectedDepositTimeStamp = await bank.depositTimeStamp(addr1.address);
    expect(calculateddepositTimeStamp).to.equal(expectedDepositTimeStamp);
  });

  it("withdraw function works correctly and all variables are correctly updated", async function () {
    const depositAmount = ethers.parseEther("2");
    const initialBalance = (depositAmount * 95n) / 100n;
    await bank.connect(addr1).deposit({ value: depositAmount });
    const initialBalAddr1 = await ethers.provider.getBalance(addr1.address);
    const withdrawAmount = ethers.parseEther("1");
    const tx = await bank.connect(addr1).withdraw(withdrawAmount);
    const receipt = await tx.wait();
    const finalBalAddr1 = await ethers.provider.getBalance(addr1.address);
    expect(finalBalAddr1 - initialBalAddr1).to.be.closeTo(
      withdrawAmount,
      ethers.parseEther("0.001")
    );
    const Block = await ethers.provider.getBlock(receipt.blockNumber);
    const blockTime = Block?.timestamp;
    expect(await bank.depositBalance(addr1.address)).to.equal(
      initialBalance - withdrawAmount
    );
    expect(await bank.depositTimeStamp(addr1.address)).to.equal(blockTime);
    const withdrawAmount2 = ethers.parseEther("0.8999999");
    await bank.connect(addr1).withdraw(withdrawAmount2);
    expect(await bank.depositBalance(addr1.address)).to.equal(0);
    expect(await bank.depositTimeStamp(addr1.address)).to.equal(0);
  });

  it("withdrawAll function works correctly and all variables are correctly updated", async function () {
    const depositAmount = ethers.parseEther("2");
    const externalBalance = await ethers.provider.getBalance(addr1.address);
    const depositTx = await bank
      .connect(addr1)
      .deposit({ value: depositAmount });
    const receipt = await depositTx.wait();
    const gasUsed1 = (await receipt.gasUsed) * receipt.gasPrice;
    const depositFeeCharged = (depositAmount * 5n) / 100n;

    const withdrawalTx = await bank.connect(addr1).withdrawAll();
    const withdrawalReceipt = await withdrawalTx.wait();
    expect(await bank.depositBalance(addr1.address)).to.equal(0n);
    expect(await bank.depositTimeStamp(addr1.address)).to.equal(0n);
    const gasUsed2 =
      (await withdrawalReceipt.gasUsed) * withdrawalReceipt.gasPrice;
    const externalBalance2 = await ethers.provider.getBalance(addr1.address);
    expect(externalBalance).to.equal(
      externalBalance2 + depositFeeCharged + BigInt(gasUsed1 + gasUsed2)
    );
  });

  it("only addresses with BANK_OPERATOR_ROLE can check users balances", async function () {
    await bank
      .connect(owner)
      .assignRoleToAddress(await bank.BANK_OPERATOR_ROLE(), addr2.address);
    await bank
      .connect(owner)
      .assignRoleToAddress(await bank.OPERATOR_MANAGER_ROLE(), addr3.address);
    await bank
      .connect(owner)
      .assignRoleToAddress(await bank.BANK_CONFIG_ROLE(), addr4.address);
    await expect(
      bank.connect(addr1).checkUserBalance(addr2.address)
    ).to.be.revertedWithCustomError(bank, "AccessControlUnauthorizedAccount");
    await expect(
      bank.connect(addr3).checkUserBalance(addr2.address)
    ).to.be.revertedWithCustomError(bank, "AccessControlUnauthorizedAccount");
    await expect(
      bank.connect(addr4).checkUserBalance(addr3.address)
    ).to.be.revertedWithCustomError(bank, "AccessControlUnauthorizedAccount");
    await expect(bank.connect(addr2).checkUserBalance(addr4.address)).not.to.be
      .reverted;
  });

  it("Any address can check their balance with getMyBalance function", async function () {
    expect(await bank.connect(addr4).getMyBalance()).not.to.be.reverted;
  });

  // FeeCollector Contract Tests
  it("Default Admin should be able to call setNewDustThreshold and should do it correctly", async function () {
    const dustThreshold = ethers.parseEther("0.000001");
    const dustThreshold2 = ethers.parseEther("0.0000009");
    const dustThreshold3 = ethers.parseEther("0.000002");
    await expect(
      feeCollector.connect(owner).setNewDustThreshold(dustThreshold)
    ).to.be.revertedWithCustomError(feeCollector, "ValueSameAsCurrent");
    await expect(
      feeCollector.connect(owner).setNewDustThreshold(dustThreshold3)
    ).not.to.be.reverted;
    await expect(
      feeCollector.connect(owner).setNewDustThreshold(dustThreshold2)
    ).to.be.revertedWithCustomError(feeCollector, "LowerThanMinimum");
    expect(await feeCollector.DUST_THRESHOLD()).to.equal(dustThreshold3);
  });

  it("Regular addresses shouldn't be able to call the setNewDustThreshold on feeCollector contract", async function () {
    const dustThreshold = ethers.parseEther("0.000002");
    await expect(
      feeCollector.connect(addr1).setNewDustThreshold(dustThreshold)
    ).to.be.revertedWithCustomError(
      feeCollector,
      "AccessControlUnauthorizedAccount"
    );
  });

  it("no EOA address should be able to call sendInterest function in feeCollector contract", async function () {
    const bankAddress = await bank.getAddress();
    const amount = ethers.parseEther("2");
    const depositAmount = ethers.parseEther("100");
    await bank.connect(addr2).deposit({ value: depositAmount });
    await expect(
      feeCollector.connect(owner).sendInterest(addr2.address, amount)
    ).to.be.revertedWithCustomError(
      feeCollector,
      "AccessControlUnauthorizedAccount"
    );
    await expect(
      feeCollector.connect(addr1).sendInterest(addr2.address, amount)
    ).to.be.revertedWithCustomError(
      feeCollector,
      "AccessControlUnauthorizedAccount"
    );
  });

  it("only Default Admin should be able to call adminWithdraw and should do it correctly", async function () {
    const depositAmount = ethers.parseEther("100");
    await bank.connect(addr2).deposit({ value: depositAmount });
    const initialBalAddr2 = await ethers.provider.getBalance(addr2.address);
    const withdrawalAmount = ethers.parseEther("0.8");
    await expect(
      feeCollector.connect(addr1).adminWithdraw(addr2.address, withdrawalAmount)
    ).to.be.revertedWithCustomError(
      feeCollector,
      "AccessControlUnauthorizedAccount"
    );
    await expect(
      feeCollector.connect(owner).adminWithdraw(addr2.address, withdrawalAmount)
    ).not.to.be.reverted;
    const finalBalAddr2 = await ethers.provider.getBalance(addr2.address);
    expect(finalBalAddr2 - initialBalAddr2).to.be.closeTo(
      withdrawalAmount,
      ethers.parseEther("0.00001")
    );
  });

  it("only Default Admin should be able to call emergencyFeeWithdraw and should do it correctly", async function () {
    const depositAmount = ethers.parseEther("0.000018");
    await bank.connect(addr2).deposit({ value: depositAmount });
    // the below reverts because the deposit fee that came from deposit is lower than the dust threshold.
    await expect(
      feeCollector.connect(owner).emergencyFeeWithdraw(addr2.address)
    ).to.be.revertedWithCustomError(feeCollector, "ContractBalanceNotEnough");

    //deposit of a substantial amount
    const depositAmount2 = ethers.parseEther("100");
    const tx = await bank.connect(addr2).deposit({ value: depositAmount2 });
    await tx.wait();

    //check balance after the successful deposit
    const initialBalAddr2 = await ethers.provider.getBalance(addr2.address);
    await expect(
      feeCollector.connect(addr1).emergencyFeeWithdraw(addr2.address)
    ).to.be.revertedWithCustomError(
      feeCollector,
      "AccessControlUnauthorizedAccount"
    );
    await expect(
      feeCollector.connect(owner).emergencyFeeWithdraw(addr2.address)
    ).not.to.be.reverted;

    //check balance after the emergency withdraw was done to same addr2
    const finalBalAddr2 = await ethers.provider.getBalance(addr2.address);

    //The expected difference should be the deposit fee withdrawn back to addr2.
    const expectedDifference = ethers.parseEther("5");
    expect(finalBalAddr2 - initialBalAddr2).to.be.closeTo(
      expectedDifference,
      ethers.parseEther("0.000001")
    );
  });
});
