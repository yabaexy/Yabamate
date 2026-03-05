// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title WydaEscrow
 * @dev Escrow contract for Patreon-style subscriptions using WYDA token on BSC.
 */

interface IERC20 {
    function transferFrom(address from, address to, uint256 value) external returns (bool);
    function transfer(address to, uint256 value) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
}

contract WydaEscrow {
    IERC20 public immutable wydaToken;
    address public owner;

    struct Subscription {
        uint256 amountPerMonth;
        uint256 totalDeposited;
        uint256 startTime;
        uint256 lastWithdrawTime;
        bool active;
    }

    // creator => supporter => Subscription
    mapping(address => mapping(address => Subscription)) public subscriptions;
    // creator => total balance available to withdraw
    mapping(address => uint256) public creatorBalances;

    event Subscribed(address indexed creator, address indexed supporter, uint256 amount, uint256 monthlyRate);
    event Withdrawn(address indexed creator, uint256 amount);
    event Refunded(address indexed creator, address indexed supporter, uint256 amount);

    constructor(address _wydaToken) {
        wydaToken = IERC20(_wydaToken);
        owner = msg.sender;
    }

    /**
     * @dev Supporter subscribes to a creator by depositing WYDA tokens.
     * @param _creator The address of the content creator.
     * @param _monthlyRate The amount of WYDA to be released per month.
     * @param _totalAmount The total amount of WYDA to deposit into escrow.
     */
    function subscribe(address _creator, uint256 _monthlyRate, uint256 _totalAmount) external {
        require(_totalAmount >= _monthlyRate, "Deposit must cover at least one month");
        require(wydaToken.transferFrom(msg.sender, address(this), _totalAmount), "Transfer failed");

        Subscription storage sub = subscriptions[_creator][msg.sender];
        
        if (sub.active) {
            sub.totalDeposited += _totalAmount;
        } else {
            subscriptions[_creator][msg.sender] = Subscription({
                amountPerMonth: _monthlyRate,
                totalDeposited: _totalAmount,
                startTime: block.timestamp,
                lastWithdrawTime: block.timestamp,
                active: true
            });
        }

        emit Subscribed(_creator, msg.sender, _totalAmount, _monthlyRate);
    }

    /**
     * @dev Creator withdraws the earned portion of the escrowed funds.
     * Earned amount = (time elapsed / 30 days) * monthlyRate, capped by totalDeposited.
     */
    function creatorWithdraw(address _supporter) external {
        Subscription storage sub = subscriptions[msg.sender][_supporter];
        require(sub.active, "No active subscription");

        uint256 timeElapsed = block.timestamp - sub.lastWithdrawTime;
        uint256 monthsElapsed = timeElapsed / 30 days;
        
        if (monthsElapsed == 0) return;

        uint256 amountToRelease = monthsElapsed * sub.amountPerMonth;
        if (amountToRelease > sub.totalDeposited) {
            amountToRelease = sub.totalDeposited;
        }

        sub.totalDeposited -= amountToRelease;
        sub.lastWithdrawTime += monthsElapsed * 30 days;

        if (sub.totalDeposited == 0) {
            sub.active = false;
        }

        require(wydaToken.transfer(msg.sender, amountToRelease), "Transfer failed");
        emit Withdrawn(msg.sender, amountToRelease);
    }

    /**
     * @dev Supporter can cancel and get a refund of the remaining (unearned) funds.
     */
    function cancelSubscription(address _creator) external {
        Subscription storage sub = subscriptions[_creator][msg.sender];
        require(sub.active, "No active subscription");

        // First, release what the creator has earned up to now
        uint256 timeElapsed = block.timestamp - sub.lastWithdrawTime;
        uint256 monthsElapsed = timeElapsed / 30 days;
        uint256 earnedByCreator = monthsElapsed * sub.amountPerMonth;
        
        if (earnedByCreator > sub.totalDeposited) {
            earnedByCreator = sub.totalDeposited;
        }

        uint256 refundAmount = sub.totalDeposited - earnedByCreator;

        // Transfer earned to creator
        if (earnedByCreator > 0) {
            wydaToken.transfer(_creator, earnedByCreator);
        }

        // Transfer refund to supporter
        if (refundAmount > 0) {
            wydaToken.transfer(msg.sender, refundAmount);
        }

        sub.totalDeposited = 0;
        sub.active = false;

        emit Refunded(_creator, msg.sender, refundAmount);
    }
}
