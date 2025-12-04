// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/// @title Constants - USDC addresses and fee constants
/// @notice Centralized constants for USDC addresses per chain
library Constants {
    // USDC addresses per chain
    address public constant USDC_BASE = 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913;
    address public constant USDC_POLYGON = 0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359;
    address public constant USDC_ARBITRUM = 0xaf88d065e77c8cC2239327C5EDb3A432268e5831;
    address public constant USDC_OPTIMISM = 0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85;
    address public constant USDC_ETHEREUM = 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48;
    
    // Setup fee: $10 USDC (6 decimals for most chains)
    uint256 public constant SETUP_FEE_STABLE = 10 * 10**6; // 10 USDC
    
    // Setup fee: ~$50 equivalent in native token (0.02 ETH at ~$2500/ETH)
    uint256 public constant SETUP_FEE_NATIVE = 0.02 ether;
}

