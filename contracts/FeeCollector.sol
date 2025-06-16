//SPDX-License-Identifier:MIT
pragma solidity ^0.8.5;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol"; 
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title Fee Collector Contract - Used as interface for Bank Contract
 * @author Raymond Abiola: https://github.com/raymondabiola
 */
contract FeeCollector is AccessControl, ReentrancyGuard {

/** 
 * @dev State declarations
 * BANK_ROLE should not be assigned to the dafault admin but bank contract address.
 * */     
bytes32 public constant BANK_ROLE = keccak256("BANK_ROLE");
uint public DUST_THRESHOLD;
uint public constant MINIMUM_DUST_THRESHOLD = 0.000001 ether;

/**
 * @dev The fallback event tracks transaction made to the contract which cannot be
 * matched with any function in this contract
 * @param sender address of the sender of transaction
 * @param value Value of ether captured from the transaction
 */
event Received(address indexed sender, uint value);

/**
 * * @param data Data captured from the transaction
 */
event FallBackCalled(address indexed sender, uint value, bytes data);

/**
 * @param to The address of Bank CA or the address emergency withdrawal was done to.
 * @param time The block time stamp at which the role was set or the emergency withdrawal
 * happened.
 */
event BankRoleWasSet(address indexed to, uint time);

/**
 * 
 * @param by This is the default admin address
 * @param to This is the address the amount was sent to
 * @param amount this is the amount withdrawn
 */
event AdminWithdrawed(address indexed by, address indexed to, uint amount);

/**
 * @param by This is the default admin address
 * @param to This is the address the amount was sent to
 * @param amount This is the amount withdrawn
 * @param time This is the exact time the emergency withdrawal happened
 */
event EmergencyWithdrawalSuccess(address indexed by, address indexed to, uint amount, uint time);

/**
 * @dev This is a list of custom errors used in this contract to save gas
 */
error LowerThanMinimum();

error ValueSameAsCurrent();

error InvalidAddress();

error InputedThisContractAddress();

error FordbidDefaultAdminAddress();

error EOANotAllowed();

error ContractBalanceNotEnough();

error FailedToSendInterest();

error InsignificantAmount();

error FailedWithdrawal();

/**
 * @dev Deployer must initizalize dust threshold during depolyment.
 * @param _dustThreshold This is a defined value by the default admin to regulate spams and 
 * discourage non-feasible transactions.
 */
constructor(uint _dustThreshold){
     require(_dustThreshold>=MINIMUM_DUST_THRESHOLD, LowerThanMinimum());
    _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
    DUST_THRESHOLD = _dustThreshold;
}

/**
 * @dev  default_admin can set new value for contract's DUST_THRESHOLD variable.
 * Dust threshold is to discourage non-feasible withdrawals.
 * @param newDustThreshold new value of minimum dust value to allow succesful transaction
 */
function setNewDustThreshold(uint newDustThreshold)external onlyRole(DEFAULT_ADMIN_ROLE){
    require(newDustThreshold>=MINIMUM_DUST_THRESHOLD, LowerThanMinimum());
    require(newDustThreshold!=DUST_THRESHOLD, ValueSameAsCurrent());
    DUST_THRESHOLD = newDustThreshold;
}

/**
 * @dev The setBankRole function is called by the Default admin to assign BANK_ROLE to the bank 
 * contract address. CA of Bank is only after after Bank contract is deployed.
 * @param bankAddress  The address of the deployed Bank Contract.
 */
function setBankRole(address bankAddress)external onlyRole(DEFAULT_ADMIN_ROLE){
require(bankAddress != address(0), InvalidAddress());
require(bankAddress != address(this), InputedThisContractAddress());
require(bankAddress!=msg.sender, FordbidDefaultAdminAddress());
require(bankAddress.code.length>0, EOANotAllowed());
_grantRole(BANK_ROLE, bankAddress);

emit BankRoleWasSet(bankAddress, block.timestamp);
}

/**
 * @dev the receive function allows this contract accept fee
 * deposits from the Bank contract.
 */
receive() external payable {
    emit Received(msg.sender, msg.value);
}

/**
 * @dev Any other transactions that do not match functions in this contract.
 */
fallback() payable external{
    emit FallBackCalled(msg.sender, msg.value, msg.data);
}

/**
 * @dev This function is called by the bank contract externally whenever a user calls 
 * the claimInterest function in the Bank Contract 
 */
function sendInterest(address _address, uint interest)external onlyRole(BANK_ROLE) nonReentrant{
    require(interest<=address(this).balance, ContractBalanceNotEnough());
    (bool sent,) = payable(_address).call{value:interest}('');
    require(sent, FailedToSendInterest());
}

/**
 * @dev This function is useful if there is a need to withdraw some of the fees by the default admin.
 * @param _to The address the withdrawal is done to.
 * @param _amount The amount of ether to be withdrawn
 */
function adminWithdraw(address _to, uint _amount)external onlyRole(DEFAULT_ADMIN_ROLE) nonReentrant{
   require(_to != address(0), InvalidAddress());
   require(address(this).balance>=_amount, ContractBalanceNotEnough());
   require(_amount>=DUST_THRESHOLD, InsignificantAmount());
   (bool success,) = payable(_to).call{value:_amount}('');
   require(success, FailedWithdrawal());

emit AdminWithdrawed(msg.sender, _to, _amount);
}
/**
 * @dev This function is useful for emergency withdrawals by the Default_Admin
 * whenever there is an issue with the feeCollector contract.
 * In the case of an issue, a new fixed feeCollector contract should be deployed
 * and attached to the Bank Contract.
 * @param _to The address the emergency withdrawal is done to.
 */
function emergencyFeeWithdraw(address _to)external onlyRole(DEFAULT_ADMIN_ROLE) nonReentrant{
   require(_to != address(0), InvalidAddress());
   require(address(this).balance>=DUST_THRESHOLD, ContractBalanceNotEnough());
   (bool success,) = payable(_to).call{value:address(this).balance}('');
   require(success, FailedWithdrawal());

   emit EmergencyWithdrawalSuccess(msg.sender, _to, address(this).balance, block.timestamp);
}
}