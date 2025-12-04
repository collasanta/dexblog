import { ethers } from "hardhat";

async function main() {
  // Setup fee: ~$50 equivalent in ETH (0.02 ETH at ~$2500/ETH)
  const SETUP_FEE = ethers.parseEther("0.02");

  console.log("Deploying BlogFactory...");
  console.log("Setup fee:", ethers.formatEther(SETUP_FEE), "ETH");

  const BlogFactory = await ethers.getContractFactory("BlogFactory");
  const factory = await BlogFactory.deploy(SETUP_FEE);

  await factory.waitForDeployment();

  const factoryAddress = await factory.getAddress();
  const factoryOwner = await factory.factoryOwner();

  console.log("\n✅ BlogFactory deployed successfully!");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("Contract address:", factoryAddress);
  console.log("Factory owner:", factoryOwner);
  console.log("Setup fee:", ethers.formatEther(SETUP_FEE), "ETH");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  // Return deployment info for verification
  return {
    address: factoryAddress,
    setupFee: SETUP_FEE,
    owner: factoryOwner,
  };
}

// Deploy with custom fee
async function deployWithCustomFee(setupFeeEth: string) {
  const setupFee = ethers.parseEther(setupFeeEth);

  console.log("Deploying BlogFactory with custom fee...");
  console.log("Setup fee:", setupFeeEth, "ETH");

  const BlogFactory = await ethers.getContractFactory("BlogFactory");
  const factory = await BlogFactory.deploy(setupFee);

  await factory.waitForDeployment();

  const factoryAddress = await factory.getAddress();

  console.log("\n✅ BlogFactory deployed at:", factoryAddress);

  return factoryAddress;
}

// Deploy free factory (no setup fee)
async function deployFreeFactory() {
  console.log("Deploying free BlogFactory (no setup fee)...");

  const BlogFactory = await ethers.getContractFactory("BlogFactory");
  const factory = await BlogFactory.deploy(0);

  await factory.waitForDeployment();

  const factoryAddress = await factory.getAddress();

  console.log("\n✅ Free BlogFactory deployed at:", factoryAddress);

  return factoryAddress;
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

export { main, deployWithCustomFee, deployFreeFactory };

