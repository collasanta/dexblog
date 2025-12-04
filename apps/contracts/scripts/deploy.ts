import { ethers } from "hardhat";

// USDC addresses per chain
const USDC_ADDRESSES: Record<string, string> = {
  base: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
  polygon: "0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359",
  arbitrum: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831",
  optimism: "0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85",
  mainnet: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
};

async function main() {
  const network = await ethers.provider.getNetwork();
  const networkName = network.name;
  
  // Setup fee
  const SETUP_FEE = ethers.parseUnits("10", 6); // 10 USDC (6 decimals)
  
  // Get USDC address for current network
  const usdcAddress = USDC_ADDRESSES[networkName] || USDC_ADDRESSES.base;

  console.log("Deploying BlogFactory...");
  console.log("Network:", networkName);
  console.log("Setup fee:", ethers.formatUnits(SETUP_FEE, 6), "USDC");
  console.log("USDC address:", usdcAddress);

  const BlogFactory = await ethers.getContractFactory("BlogFactory");
  const factory = await BlogFactory.deploy(usdcAddress, SETUP_FEE);

  await factory.waitForDeployment();

  const factoryAddress = await factory.getAddress();
  const factoryOwner = await factory.factoryOwner();

  console.log("\n✅ BlogFactory deployed successfully!");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("Contract address:", factoryAddress);
  console.log("Factory owner:", factoryOwner);
  console.log("Setup fee:", ethers.formatUnits(SETUP_FEE, 6), "USDC");
  console.log("Payment token (USDC):", usdcAddress);
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  return {
    address: factoryAddress,
    setupFee: SETUP_FEE,
    paymentToken: usdcAddress,
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

