// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "forge-std/Script.sol";
import "../src/BlogFactory.sol";
import "../src/Constants.sol";

contract DeployScript is Script {
    function setUp() public {}

    function run() public {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        
        // Get USDC address for current chain
        // Priority: env var > chain-specific constant > Base as fallback
        address usdcAddress = vm.envOr("USDC_ADDRESS", address(0));
        
        // If not set via env, detect chain and use appropriate USDC
        if (usdcAddress == address(0)) {
            uint256 chainId = block.chainid;
            if (chainId == 42161) {
                // Arbitrum One
                usdcAddress = Constants.USDC_ARBITRUM;
            } else if (chainId == 8453) {
                // Base
                usdcAddress = Constants.USDC_BASE;
            } else if (chainId == 137) {
                // Polygon
                usdcAddress = Constants.USDC_POLYGON;
            } else if (chainId == 10) {
                // Optimism
                usdcAddress = Constants.USDC_OPTIMISM;
            } else if (chainId == 1) {
                // Ethereum Mainnet
                usdcAddress = Constants.USDC_ETHEREUM;
            } else {
                // Default to Base
                usdcAddress = Constants.USDC_BASE;
            }
        }

        vm.startBroadcast(deployerPrivateKey);

        BlogFactory factory = new BlogFactory(
            usdcAddress,
            Constants.SETUP_FEE_STABLE
        );

        console.log("BlogFactory deployed at:", address(factory));
        console.log("Setup fee:", Constants.SETUP_FEE_STABLE);
        console.log("Payment token (USDC):", usdcAddress);
        console.log("Factory owner:", factory.factoryOwner());

        vm.stopBroadcast();
    }
}

contract DeployWithCustomFeeScript is Script {
    function run() public {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        uint256 setupFee = vm.envUint("SETUP_FEE");
        address usdcAddress = vm.envOr("USDC_ADDRESS", Constants.USDC_BASE);
        uint256 setupFeeStable = vm.envOr("SETUP_FEE_STABLE", Constants.SETUP_FEE_STABLE);

        vm.startBroadcast(deployerPrivateKey);

        BlogFactory factory = new BlogFactory(
            usdcAddress,
            setupFeeStable
        );

        console.log("BlogFactory deployed at:", address(factory));
        console.log("Setup fee:", setupFeeStable);
        console.log("Payment token (USDC):", usdcAddress);
        console.log("Factory owner:", factory.factoryOwner());

        vm.stopBroadcast();
    }
}

contract DeployFreeFactoryScript is Script {
    function run() public {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address usdcAddress = vm.envOr("USDC_ADDRESS", Constants.USDC_BASE);

        vm.startBroadcast(deployerPrivateKey);

        BlogFactory factory = new BlogFactory(
            usdcAddress,
            0
        );

        console.log("Free BlogFactory deployed at:", address(factory));
        console.log("Setup fee: 0 (free)");
        console.log("Payment token (USDC):", usdcAddress);
        console.log("Factory owner:", factory.factoryOwner());

        vm.stopBroadcast();
    }
}

