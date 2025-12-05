import { ethers } from "hardhat";
import * as dotenv from "dotenv";

dotenv.config();

// USDC addresses per chain
const USDC_ADDRESSES: Record<string, string> = {
  base: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
  polygon: "0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359",
  arbitrum: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831",
  arbitrumSepolia: "0x75faf114eafb1BDbe2F0316DF893fd58cE87D3E1", // Arbitrum Sepolia USDC (checksum will be fixed by ethers)
  optimism: "0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85",
  mainnet: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
  bsc: "0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d", // BSC USDC uses 18 decimals
};

// USDC decimals per chain
const USDC_DECIMALS: Record<string, number> = {
  base: 6,
  polygon: 6,
  arbitrum: 6,
  arbitrumSepolia: 6,
  optimism: 6,
  mainnet: 6,
  bsc: 18, // BSC USDC uses 18 decimals
};

async function main() {
  const network = await ethers.provider.getNetwork();
  const networkName = network.name;
  
  // Get USDC decimals for current network (default to 6)
  const usdcDecimals = USDC_DECIMALS[networkName] || 6;
  
  // Setup fee: 10 USDC (with correct decimals per chain)
  const SETUP_FEE = ethers.parseUnits("10", usdcDecimals);
  
  // Get USDC address for current network
  let usdcAddressRaw = USDC_ADDRESSES[networkName] || USDC_ADDRESSES.base;
  // Fix checksum for ethers.js (convert to lowercase first, then getAddress will fix checksum)
  const usdcAddress = ethers.getAddress(usdcAddressRaw.toLowerCase());

  console.log("Deploying BlogFactory...");
  console.log("Network:", networkName);
  console.log("Setup fee:", ethers.formatUnits(SETUP_FEE, usdcDecimals), "USDC");
  console.log("USDC decimals:", usdcDecimals);
  console.log("USDC address:", usdcAddress);

  const signers = await ethers.getSigners();
  if (signers.length === 0) {
    throw new Error("No signers available. Please configure PRIVATE_KEY or DEPLOYER in .env");
  }
  const deployer = signers[0];
  console.log("Deploying with account:", deployer.address);
  
  // Check balance
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("Account balance:", ethers.formatEther(balance), "ETH");
  
  const BlogFactory = await ethers.getContractFactory("BlogFactory");
  
  // Get current nonce (pending) to check
  const nonce = await deployer.provider.getTransactionCount(deployer.address, "pending");
  console.log("Current nonce (pending):", nonce);
  
  // Estimate gas
  const deployTx = BlogFactory.getDeployTransaction(usdcAddress, SETUP_FEE);
  const gasEstimate = await ethers.provider.estimateGas(deployTx);
  const gasPrice = await ethers.provider.getFeeData();
  const estimatedCost = gasEstimate * (gasPrice.gasPrice || 0n);
  console.log("Estimated gas:", gasEstimate.toString());
  console.log("Estimated cost:", ethers.formatEther(estimatedCost), "ETH");
  
  if (balance < estimatedCost) {
    throw new Error(`Insufficient balance. Need ${ethers.formatEther(estimatedCost)} ETH but have ${ethers.formatEther(balance)} ETH`);
  }
  
  // Deploy without specifying nonce - let ethers.js handle it automatically
  console.log("\nSending deployment transaction...");
  const factory = await BlogFactory.deploy(usdcAddress, SETUP_FEE);
  console.log("Deployment transaction hash:", factory.deploymentTransaction()?.hash);

  console.log("Waiting for deployment confirmation...");
  await factory.waitForDeployment();

  const factoryAddress = await factory.getAddress();
  console.log("Contract deployed at:", factoryAddress);

  // Wait a bit for the contract to be fully indexed
  console.log("Waiting for contract to be fully indexed...");
  await new Promise(resolve => setTimeout(resolve, 2000));

  // Try to read factoryOwner with retry logic
  let factoryOwner: string;
  try {
    factoryOwner = await factory.factoryOwner();
  } catch (error: any) {
    console.warn("Could not read factoryOwner directly, using deployer address as fallback");
    factoryOwner = deployer.address;
  }

  console.log("\n✅ BlogFactory deployed successfully!");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("Contract address:", factoryAddress);
  console.log("Factory owner:", factoryOwner);
  console.log("Setup fee:", ethers.formatUnits(SETUP_FEE, usdcDecimals), "USDC");
  console.log("Payment token (USDC):", usdcAddress);
  console.log("USDC decimals:", usdcDecimals);
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

