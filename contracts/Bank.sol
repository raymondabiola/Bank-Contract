//SPDX-License-Identifier:MIT
pragma solidity ^0.8.5;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";      // gives us owner + onlyOwner
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";      // gives us pause / unpause
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol"; // stops re-entrancy

/**
 * @dev The IFeeCollector interfaces makes this contract aware of/use the sendInterest function in the feeCollector contract.
 */
interface IfeeCollector{
    function sendInterest(address _address, uint interest)external;
}

/**
 * @title Bank Contract - Pays out interest on ether deposits
 * @author Raymond Abiola: https://github.com/raymondabiola
 */
contract Bank is AccessControl, Pausable, ReentrancyGuard {

/**
 *@dev feeCollector when used in this contract must conform to the IFeeCollector interface defined above
 */
IfeeCollector public feeCollector;

/** 
 * @dev State declarations
 * MANAGER roles have the privilege of managing other roles assigned under them by the DEFAULT_ADMIN
 * */ 
bytes32 public constant BANK_OPERATOR_ROLE = keccak256("BANK_OPERATOR_ROLE");
bytes32 public constant OPERATOR_MANAGER_ROLE = keccak256 ("OPERATOR_MANAGER_ROLE");
bytes32 public constant CONFIG_MANAGER_ROLE = keccak256("CONFIG_MANAGER_ROLE");
bytes32 public constant BANK_CONFIG_ROLE = keccak256 ("BANK_CONFIG_ROLE");
address public feeCollectorAddress; 
uint public interestRatePerAnnum; //Interest per year
uint public depositFeePercent;
uint public DUST_THRESHOLD;
uint public constant MIN_DUST_THRESHOLD = 0.000001 ether;

/**
 *@dev Mappings to track balances, interest, depositTimeStamp
*/ 
mapping (address => uint) public depositBalance;
mapping (address => uint) public totalInterest;
mapping (address => uint) public depositTimeStamp;

/**
 *@dev Events to track important state changes in this contract.
*/
event OwnershipChanged(address indexed previousOwner, address indexed newOwner);
event Deposited(address indexed by, uint howMuch, uint depositBalance, uint currentInterest);
event Withdrawn(address indexed by, uint howMuch);
event AccountClosed(address indexed by);
event InterestClaimed(address indexed by, uint howMuch);
event Received(address indexed from, uint amount);
event FallBackCalled(address indexed sender, uint value, bytes data);
event NewFeeCollectorContractSet(address indexed _address, uint time);

/**
 *@dev Constructor sets address that deployed the contract as default admin plus other admin roles
 *It also initializes non-initialized state variables by passing in their values as argument in the 
 constructor function
*/ 
constructor(address _feeCollectorAddress, uint _interestRatePerAnnum, uint _depositFeePercent,  uint _dustThreshold) { 
    require(_feeCollectorAddress.code.length>0, InputNotContractAddress());
    require(_feeCollectorAddress != address(0), InvalidAddress());
    require(_interestRatePerAnnum>=1 && _interestRatePerAnnum<=100, NotWithinValidRange());
    require(_depositFeePercent>=1 && _depositFeePercent<=50, NotWithinValidRange());
    require(_dustThreshold>=MIN_DUST_THRESHOLD, LowerThanMinimum());
    feeCollector = IfeeCollector(_feeCollectorAddress);
    feeCollectorAddress = _feeCollectorAddress;
    interestRatePerAnnum = _interestRatePerAnnum;
    depositFeePercent = _depositFeePercent;
    DUST_THRESHOLD = _dustThreshold;
    _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
    _grantRole(OPERATOR_MANAGER_ROLE, msg.sender);
    _grantRole(CONFIG_MANAGER_ROLE, msg.sender);
    _grantRole(BANK_OPERATOR_ROLE, msg.sender);
    _grantRole(BANK_CONFIG_ROLE, msg.sender);
}

/**
 * @dev This is a list of custom errors used in this contract to save gas
 */
error NotWithinValidRange();

error ValueSameAsCurrent();

error LowerThanMinimum();

error InputNotContractAddress();

error InvalidAddress();

error AddressHasRole();

error RoleNotFoundForAddress();

error DefaultAdminAssignForbidden_UseChangeOwnerFunction();

error DefaultAdminRevokeForbidden_UseChangeOwnerFunction();

error InsignificantAmount();

error InsignificantBalance();

error NotEnoughBalance();

error FailedToSendFee();

error NoInterest();

error ContractBalanceNotEnough();

error FailedWithdrawal();

/** @dev only the default admin can call this function. 
 * The collector address can be set to a new contract if the existing fee collector contract has an issue
 * @param _newFeeCollectorAddress address of the external contract that collects deposit fees from this contract.
 * */
function setNewFeeCollectorAddress(address _newFeeCollectorAddress)external onlyRole(DEFAULT_ADMIN_ROLE){
require(_newFeeCollectorAddress.code.length>0, InputNotContractAddress());
require(_newFeeCollectorAddress!=address(0), InvalidAddress());
require(feeCollectorAddress!=_newFeeCollectorAddress, ValueSameAsCurrent());
feeCollector = IfeeCollector(_newFeeCollectorAddress);
feeCollectorAddress = _newFeeCollectorAddress;


emit NewFeeCollectorContractSet(_newFeeCollectorAddress, block.timestamp);
}

/**
 * @dev only current DEFAULT_ADMIN can call this function
 * NOTE: this function doesn't allow contract addresses to be set as DEFAULT_ADMIN
 * @param _newOwner address of the next owner to be set as DEFAULT_ADMIN
 * */
function changeOwner(address _newOwner)external onlyRole(DEFAULT_ADMIN_ROLE){
require (_newOwner != address(0), InvalidAddress());
grantRolesToNewOwner(_newOwner);
revokeOwnerRoles();
emit OwnershipChanged(msg.sender, _newOwner);
}

/**
 * @dev helper functions to revoke roles from current default admin and grant them to new default admin
 */
function revokeOwnerRoles()internal{
_revokeRole(DEFAULT_ADMIN_ROLE, msg.sender); 
_revokeRole(OPERATOR_MANAGER_ROLE, msg.sender);
_revokeRole(CONFIG_MANAGER_ROLE, msg.sender);
_revokeRole(BANK_OPERATOR_ROLE, msg.sender);
_revokeRole(BANK_CONFIG_ROLE, msg.sender);
}

function grantRolesToNewOwner(address _newOwner)internal{
_grantRole(DEFAULT_ADMIN_ROLE, _newOwner);
_grantRole(OPERATOR_MANAGER_ROLE, _newOwner);
_grantRole(CONFIG_MANAGER_ROLE, _newOwner);
_grantRole(BANK_OPERATOR_ROLE, _newOwner);
_grantRole(BANK_CONFIG_ROLE, _newOwner);
}

/** 
 * @dev only owner can set a manager role for regular admins
 * The manager role(s) is an administrator for regular roles, can assign and revoke roles for addresses.
 * NOTE: only the DEFAULT_ADMIN can assign and revoke the MANAGER_ROLE for an address.
 * @param role name of role to  be managed
 * @param adminRole name of the OPERATOR_MANAGER_ROLE
 */
function setRoleAdmin(bytes32 role, bytes32 adminRole)external onlyRole(DEFAULT_ADMIN_ROLE){
_setRoleAdmin(role, adminRole);
}

/** 
 * @dev manager admins including the deployer of the contract can assign roles to any address
 * @param _role The name of the role to be assigned to an address
 * @param _newAdmin The address to be assigned the _role
 */ 
function assignRoleToAddress(bytes32 _role, address _newAdmin)external{
    require(_newAdmin!= address(0), InvalidAddress());
    require(!hasRole(_role, _newAdmin), AddressHasRole());
    require(_role!=DEFAULT_ADMIN_ROLE, DefaultAdminAssignForbidden_UseChangeOwnerFunction());
  grantRole(_role, _newAdmin);
}

/** 
 * @dev manager admins including the owner can revoke roles from address that are directly under them
 * @param _role The name of the role to be stripped-off an address
 * @param _addressToBeRemoved The address to be stripped-off the _role privileges
*/
function revokeRoleFromAddress(bytes32 _role, address _addressToBeRemoved)external {
    require (hasRole(_role, _addressToBeRemoved), RoleNotFoundForAddress());
    require(_role!=DEFAULT_ADMIN_ROLE, DefaultAdminRevokeForbidden_UseChangeOwnerFunction());
 revokeRole(_role, _addressToBeRemoved);
}

/**
 * @dev Any admin can do single or multiple calls of the function below 
 * to renounce some or all their role/privileges.
 * NOTE: Only the DEFAULT_ADMIN_ROLE cannot be renounced
 * @param role The name of the acquired role 
 */
function renounceMyRole(bytes32 role)external{
    require(role!=DEFAULT_ADMIN_ROLE, DefaultAdminRevokeForbidden_UseChangeOwnerFunction());
    renounceRole(role, msg.sender);
}

/**
 * @dev Addresses with the BANK_OPERATOR_ROLE can Freeze and unfreeze deposits and withdrawals when there 
 * is an issue / issue is resolved
 * */
    function pause() external onlyRole(BANK_OPERATOR_ROLE){
_pause();
    }

    function unPause() external onlyRole(BANK_OPERATOR_ROLE) {
        _unpause();
    }

/**
 * @dev  role BANK_CONFIG_ROLE can set new value for contract's DUST_THRESHOLD variable.
 * Dust threshold is to discourage spammy behaviours or non-feasible transactions.
 * @param newDustThreshold new value of minimum dust value to allow succesful transaction
 */
function setNewDustThreshold(uint newDustThreshold)external onlyRole(BANK_CONFIG_ROLE){
    require(newDustThreshold>=MIN_DUST_THRESHOLD, LowerThanMinimum());
    require(DUST_THRESHOLD!=newDustThreshold, ValueSameAsCurrent());
    DUST_THRESHOLD = newDustThreshold;
}

/**
 * @dev role BANK_CONFIG_ROLE can set new value for contract's depositFeePercent variable
 * @param _newDepositFeePercent new value of depositPercent
 */
function setNewDepositFeePercent(uint _newDepositFeePercent)external onlyRole(BANK_CONFIG_ROLE){
    require(_newDepositFeePercent>=1 && _newDepositFeePercent<=50, NotWithinValidRange());
    require(depositFeePercent!=_newDepositFeePercent, ValueSameAsCurrent());
    depositFeePercent = _newDepositFeePercent;
}

/**
 * @dev role BANK_CONFIG_ROLE can set new value for contract's interestRatePerAnnum variable
 * @param _newInterestRatePerAnnum new value of interestRatePerAnnum Variable
 */
function setNewInterestRate(uint _newInterestRatePerAnnum)external onlyRole(BANK_CONFIG_ROLE){
    require(_newInterestRatePerAnnum>=1 && _newInterestRatePerAnnum<=100, NotWithinValidRange());
    require(interestRatePerAnnum!=_newInterestRatePerAnnum, ValueSameAsCurrent());
    interestRatePerAnnum = _newInterestRatePerAnnum;
}

/** 
 * @dev receive and fallback function are to handle external ether transfer to CA 
 * and also calls with data that cannot be found in the contract are handled by 
 * the fallback function
 */
receive() payable external{
    emit Received(msg.sender, msg.value);
}

fallback() payable external{
    emit FallBackCalled(msg.sender, msg.value, msg.data);
}

/**  
 * @dev depositTimeStamp for fresh deposits are set to block.timestamp and for 
 * additional deposits it's set to the weighted average of previous balance and new deposit.
 * @notice Enter a value to deposit sepolia ether into this contract.
*/
function deposit()payable external whenNotPaused{
require(msg.value>=DUST_THRESHOLD, InsignificantAmount());
uint fee = (msg.value*depositFeePercent)/100;
uint newDeposit = msg.value - fee;

//Sends the fee to the fee collector contract
(bool sent,) = payable(feeCollectorAddress).call{value: fee}('');
require(sent, FailedToSendFee());

if(depositBalance[msg.sender]>0){
    totalInterest[msg.sender]+=calculateInterest(msg.sender);
    uint oldBalance = depositBalance[msg.sender];
    uint totalBalance = oldBalance+newDeposit;
    depositTimeStamp[msg.sender] = ((depositTimeStamp[msg.sender]*oldBalance) + (block.timestamp*newDeposit))/(totalBalance);
    depositBalance[msg.sender] = totalBalance;
}else{
depositBalance[msg.sender]=newDeposit;
depositTimeStamp[msg.sender] = block.timestamp;
}
emit Deposited(msg.sender, msg.value, depositBalance[msg.sender], totalInterest[msg.sender]); //emit logs the transactions tracking who deposited money and amount
}

/**
 * @dev An internal function that calculates the interest rate on user deposits
 */
function calculateInterest(address user)internal view returns(uint) {
 uint secondsPassed =  block.timestamp - depositTimeStamp[user];
 uint interest = (depositBalance[user] * (interestRatePerAnnum) * secondsPassed)/(100*365*86400); //interest = PRT/100
 return interest;
}

/**
 * @dev As interest is a time dependent, it updates the total Interest before interest is claimed
 * @notice call this function to claim accrued interests on your deposit.
 */
function claimInterest()external whenNotPaused nonReentrant{
    totalInterest[msg.sender]+=calculateInterest(msg.sender);
    uint interestToClaim = totalInterest[msg.sender];
     require(totalInterest[msg.sender]>0, NoInterest());

   delete totalInterest[msg.sender];
   depositTimeStamp[msg.sender]= block.timestamp;

feeCollector.sendInterest(msg.sender, interestToClaim);
emit InterestClaimed(msg.sender, interestToClaim);
}

/**
 *@notice Call this function to Withdraw from your deposit balance.Part withdrawals 
 *sets the depositTimeStamp of an address to the current time at the instance of withdrawal.
 *Withdrawals that reduces deposit balance to an insignificant value 
 resets the depositTimeStamp of the address to 0 and such address will stop receieving interest
 until it deposits again.
 *@param _amount The value of ether you wish to withdraw
 */
function withdraw(uint _amount)external whenNotPaused nonReentrant{
    require(_amount>=DUST_THRESHOLD, InsignificantAmount());
   require(depositBalance[msg.sender]>=DUST_THRESHOLD, InsignificantBalance());
     require(depositBalance[msg.sender]>=_amount, NotEnoughBalance());
     require(address(this).balance>=_amount, ContractBalanceNotEnough());
    
    unchecked{
        depositBalance[msg.sender] -= _amount;
        }

    if(depositBalance[msg.sender]<DUST_THRESHOLD){
       delete depositBalance[msg.sender];
delete depositTimeStamp[msg.sender];
    }else{
 depositTimeStamp[msg.sender] = block.timestamp;
    }

    /* withdraws the amount to the caller address */
    (bool success,) = payable(msg.sender).call{value:_amount}('');
    require(success, FailedWithdrawal());

    emit Withdrawn(msg.sender, _amount); //emit logs the transactions tracking who withdrew money and how much
}

/**
 *@notice Call this function to Withdraw all your deposit balance.
 *Performing this feature resets the depositTimeStamp to 0 and the address will stop receiving interest
 *until it deposit's again.
 */
function withdrawAll()external whenNotPaused nonReentrant{
   require(depositBalance[msg.sender]>=DUST_THRESHOLD, InsignificantBalance());
    require(address(this).balance>=depositBalance[msg.sender], ContractBalanceNotEnough());
   uint amountWithdrawn = depositBalance[msg.sender];

// resets the depositBalance and depositTimeStamp
   delete depositBalance[msg.sender];
  delete depositTimeStamp[msg.sender];

// withdraws the amount to the caller address */
   (bool success,) = payable(msg.sender).call{value:amountWithdrawn}('');
   require(success, FailedWithdrawal());

emit Withdrawn (msg.sender, amountWithdrawn);
emit AccountClosed(msg.sender);
}

/** 
 * @dev Read only function to check which role is the manager for a subordinate admin role
 * @param role The name of the subordinate role
 * */
function checkRoleAdmin(bytes32 role)external view returns(bytes32){
  return getRoleAdmin(role);
}

/**
 * @dev Read only function for admins to check a user deposit balance
 */
function checkUserBalance(address user)external view onlyRole(BANK_OPERATOR_ROLE) returns(uint){
    return depositBalance[user];
}

/**
 * @notice Call this function to check your address deposit balance
 * */
function getMyBalance()external view returns(uint){
    return depositBalance[msg.sender];
}
}