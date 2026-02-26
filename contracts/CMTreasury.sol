// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract CMTreasury is Ownable {
    IERC20 public usdc;
    address public bot;
    uint256 public payoutPerReply; // in USDC (6 decimals)

    mapping(bytes32 => bool) public paidReplies;

    event Deposit(address indexed from, uint256 amount);
    event Payout(bytes32 indexed replyId, uint256 amount);
    event Withdrawal(address indexed to, uint256 amount);

    constructor(address _usdc, address _bot, uint256 _payoutPerReply) Ownable(msg.sender) {
        usdc = IERC20(_usdc);
        bot = _bot;
        payoutPerReply = _payoutPerReply;
    }

    modifier onlyBot() {
        require(msg.sender == bot, "Only bot");
        _;
    }

    function deposit(uint256 amount) external {
        usdc.transferFrom(msg.sender, address(this), amount);
        emit Deposit(msg.sender, amount);
    }

    function payout(bytes32 replyId) external onlyBot {
        require(!paidReplies[replyId], "Already paid");
        require(usdc.balanceOf(address(this)) >= payoutPerReply, "Insufficient funds");
        paidReplies[replyId] = true;
        usdc.transfer(bot, payoutPerReply);
        emit Payout(replyId, payoutPerReply);
    }

    function withdraw(uint256 amount) external onlyOwner {
        usdc.transfer(owner(), amount);
        emit Withdrawal(owner(), amount);
    }

    function setPayoutPerReply(uint256 _amount) external onlyOwner {
        payoutPerReply = _amount;
    }

    function setBot(address _bot) external onlyOwner {
        bot = _bot;
    }
}
