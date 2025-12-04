// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "forge-std/Script.sol";
import "../src/BlogFactory.sol";

contract DeployScript is Script {
    // Setup fee: ~$50 equivalent in ETH (0.02 ETH at ~$2500/ETH)
    uint256 public constant SETUP_FEE = 0.02 ether;

    function setUp() public {}

    function run() public {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");

        vm.startBroadcast(deployerPrivateKey);

        BlogFactory factory = new BlogFactory(SETUP_FEE);

        console.log("BlogFactory deployed at:", address(factory));
        console.log("Setup fee:", SETUP_FEE);
        console.log("Factory owner:", factory.factoryOwner());

        vm.stopBroadcast();
    }
}

contract DeployWithCustomFeeScript is Script {
    function run() public {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        uint256 setupFee = vm.envUint("SETUP_FEE");

        vm.startBroadcast(deployerPrivateKey);

        BlogFactory factory = new BlogFactory(setupFee);

        console.log("BlogFactory deployed at:", address(factory));
        console.log("Setup fee:", setupFee);
        console.log("Factory owner:", factory.factoryOwner());

        vm.stopBroadcast();
    }
}

contract DeployFreeFactoryScript is Script {
    function run() public {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");

        vm.startBroadcast(deployerPrivateKey);

        BlogFactory factory = new BlogFactory(0);

        console.log("Free BlogFactory deployed at:", address(factory));
        console.log("Setup fee: 0 (free)");
        console.log("Factory owner:", factory.factoryOwner());

        vm.stopBroadcast();
    }
}

