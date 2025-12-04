// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

contract MockERC20 {
    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;

    function transfer(address to, uint256 amount) external returns (bool) {
        if (balanceOf[msg.sender] < amount) {
            return false;
        }
        unchecked {
            balanceOf[msg.sender] -= amount;
            balanceOf[to] += amount;
        }
        return true;
    }

    function transferFrom(address from, address to, uint256 amount) external returns (bool) {
        uint256 currentAllowance = allowance[from][msg.sender];
        uint256 currentBalance = balanceOf[from];
        
        // Check conditions first - return false if insufficient
        if (currentAllowance < amount || currentBalance < amount) {
            return false;
        }
        
        // Only perform arithmetic if checks pass
        unchecked {
            allowance[from][msg.sender] = currentAllowance - amount;
            balanceOf[from] = currentBalance - amount;
            balanceOf[to] = balanceOf[to] + amount;
        }
        
        return true;
    }

    function approve(address spender, uint256 amount) external returns (bool) {
        allowance[msg.sender][spender] = amount;
        return true;
    }

    function mint(address to, uint256 amount) external {
        balanceOf[to] += amount;
    }
}

